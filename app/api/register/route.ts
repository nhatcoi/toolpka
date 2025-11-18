import { NextRequest, NextResponse } from 'next/server'
import { addLog } from '@/lib/logs'

const scheduledJobs = new Map<
  string,
  ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>
>()

interface RegisterRequest {
  requests: Array<{
    url: string
    headers: Record<string, string>
    cookies: string
    data: string
    title?: string
  }>
  scheduledTime: string | null
  retryInterval: number | null
  retryCount: number | null
}

async function performRegistration(
  url: string,
  headers: Record<string, string>,
  cookies: string,
  data: string
): Promise<any> {
  const fetchHeaders: Record<string, string> = {
    ...headers,
  }

  if (cookies) {
    fetchHeaders['Cookie'] = cookies
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: fetchHeaders,
    body: data,
  })

  const responseData = await response.text()

  try {
    return JSON.parse(responseData)
  } catch {
    return { raw: responseData, status: response.status }
  }
}

function scheduleRegistration(
  requestId: string,
  requests: Array<{
    url: string
    headers: Record<string, string>
    cookies: string
    data: string
    title?: string
  }>,
  scheduledTime: string,
  retryInterval: number | null,
  retryCount: number | null
) {
  if (scheduledJobs.has(requestId)) {
    const existingJob = scheduledJobs.get(requestId)!
    clearTimeout(existingJob as ReturnType<typeof setTimeout>)
    clearInterval(existingJob as ReturnType<typeof setInterval>)
    scheduledJobs.delete(requestId)
  }

  const [hours, minutes, seconds] = scheduledTime.split(':').map(Number)
  const now = new Date()
  const scheduled = new Date()
  scheduled.setHours(hours, minutes, seconds || 0, 0)

  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1)
  }

  const delay = scheduled.getTime() - now.getTime()
  const maxRetries = retryCount !== null ? retryCount : Infinity
  const retryAttempts = { count: 0 }

  const executeRegistration = async () => {
    const results = []
    for (const request of requests) {
      try {
        const result = await performRegistration(
          request.url,
          request.headers,
          request.cookies,
          request.data
        )
        results.push({ success: true, data: result })
        addLog(requestId, {
          title: request.title || 'Không có tên',
          request: request.url,
          result,
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        results.push({ success: false, error: errorMsg })
        addLog(requestId, {
          title: request.title || 'Không có tên',
          request: request.url,
          error: errorMsg,
        })
      }
    }
    return results
  }

  const timeoutId = setTimeout(async () => {
    await executeRegistration()

    if (retryInterval && retryInterval > 0 && maxRetries > 0) {
      const intervalId = setInterval(async () => {
        retryAttempts.count++
        await executeRegistration()

        if (retryAttempts.count >= maxRetries) {
          clearInterval(intervalId)
          scheduledJobs.delete(requestId)
          addLog(requestId, {
            message: `Đã đạt giới hạn ${maxRetries} lần retry. Dừng lại.`,
          })
        }
      }, retryInterval * 1000)

      scheduledJobs.set(requestId, intervalId)
    } else {
      scheduledJobs.delete(requestId)
    }
  }, delay)

  scheduledJobs.set(requestId, timeoutId)
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')

    if (!requestId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Thiếu requestId',
        },
        { status: 400 }
      )
    }

    if (scheduledJobs.has(requestId)) {
      const job = scheduledJobs.get(requestId)!
      clearTimeout(job as ReturnType<typeof setTimeout>)
      clearInterval(job as ReturnType<typeof setInterval>)
      scheduledJobs.delete(requestId)
      
      addLog(requestId, {
        message: 'Đã dừng lịch đăng ký tự động',
      })

      return NextResponse.json({
        success: true,
        message: 'Đã dừng lịch đăng ký tự động thành công',
      })
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Không tìm thấy job với requestId này',
      },
      { status: 404 }
    )
  } catch (error) {
    console.error('Cancel job error:', error)
    return NextResponse.json(
      {
        success: false,
        message: `Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json()
    const { requests, scheduledTime, retryInterval, retryCount } = body

    if (!requests || requests.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Thiếu thông tin requests',
        },
        { status: 400 }
      )
    }

    for (const req of requests) {
      if (!req.url || !req.headers || !req.data) {
        return NextResponse.json(
          {
            success: false,
            message: 'Thiếu thông tin bắt buộc (url, headers, data) trong một hoặc nhiều requests',
          },
          { status: 400 }
        )
      }
    }

    if (scheduledTime) {
      const requestId = `job-${Date.now()}-${Math.random()}`
      scheduleRegistration(
        requestId,
        requests,
        scheduledTime,
        retryInterval,
        retryCount
      )

      return NextResponse.json({
        success: true,
        message: `Đã lên lịch ${requests.length} môn học vào lúc ${scheduledTime}${
          retryInterval
            ? ` và sẽ retry mỗi ${retryInterval} giây${
                retryCount !== null ? ` (tối đa ${retryCount} lần)` : ''
              }`
            : ''
        }`,
        scheduled: true,
        scheduledTime,
        retryInterval,
        retryCount,
        requestId,
      })
    }

    const results = []
    const requestId = `immediate-${Date.now()}-${Math.random()}`
    for (const req of requests) {
      try {
        const result = await performRegistration(
          req.url,
          req.headers,
          req.cookies,
          req.data
        )
        results.push({ success: true, data: result })
        addLog(requestId, {
          title: req.title || 'Không có tên',
          request: req.url,
          result,
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          success: false,
          error: errorMsg,
        })
        addLog(requestId, {
          title: req.title || 'Không có tên',
          request: req.url,
          error: errorMsg,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã đăng ký ${results.filter((r) => r.success).length}/${requests.length} môn học thành công`,
      data: results,
      scheduled: false,
      requestId,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      {
        success: false,
        message: `Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
