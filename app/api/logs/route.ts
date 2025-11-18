import { NextRequest, NextResponse } from 'next/server'
import { getAllLogs, getLogsByRequestId } from '@/lib/logs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')

    let logs
    if (requestId) {
      logs = getLogsByRequestId(requestId)
    } else {
      logs = getAllLogs()
    }

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}

