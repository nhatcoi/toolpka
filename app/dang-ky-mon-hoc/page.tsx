'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './page.module.css'

interface CurlData {
  url: string
  headers: Record<string, string>
  cookies: string
  data: string
}

interface RegistrationResponse {
  success: boolean
  message: string
  data?: any
  timestamp: string
  logs?: Array<{ timestamp: string; data: any }>
}

interface CurlEntry {
  id: string
  title: string
  curl: string
}

const STORAGE_KEY = 'dang-ky-mon-hoc-data'

interface SavedData {
  curlEntries: CurlEntry[]
  scheduledTime: string
  retryInterval: string
  retryCount: string
}

export default function DangKyMonHoc() {
  const [curlEntries, setCurlEntries] = useState<CurlEntry[]>([
    { id: '1', title: '', curl: '' },
  ])
  const [scheduledTime, setScheduledTime] = useState('')
  const [retryInterval, setRetryInterval] = useState('')
  const [retryCount, setRetryCount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState<Set<string>>(new Set())
  const [response, setResponse] = useState<RegistrationResponse | null>(null)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledRequestId, setScheduledRequestId] = useState<string | null>(null)
  const [logs, setLogs] = useState<Array<{ timestamp: string; data: any }>>([])
  const logsListRef = useRef<HTMLDivElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (savedData) {
        const parsed: SavedData = JSON.parse(savedData)
        if (parsed.curlEntries && parsed.curlEntries.length > 0) {
          setCurlEntries(parsed.curlEntries)
        }
        if (parsed.scheduledTime) {
          setScheduledTime(parsed.scheduledTime)
        }
        if (parsed.retryInterval) {
          setRetryInterval(parsed.retryInterval)
        }
        if (parsed.retryCount) {
          setRetryCount(parsed.retryCount)
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return
    
    try {
      const dataToSave: SavedData = {
        curlEntries,
        scheduledTime,
        retryInterval,
        retryCount,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    } catch (error) {
      console.error('Error saving data:', error)
    }
  }, [curlEntries, scheduledTime, retryInterval, retryCount, isInitialized])

  const parseCurl = (curlCommand: string): CurlData | null => {
    try {
      const normalized = curlCommand
        .replace(/\\\s*\n\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      const urlMatch = normalized.match(/curl\s+['"]([^'"]+)['"]/)
      if (!urlMatch) return null
      const url = urlMatch[1]

      const headers: Record<string, string> = {}
      const headerMatches = normalized.matchAll(/-H\s+['"]([^'"]+)['"]/g)
      for (const match of headerMatches) {
        const headerValue = match[1]
        const colonIndex = headerValue.indexOf(':')
        if (colonIndex > 0) {
          const key = headerValue.substring(0, colonIndex).trim()
          const value = headerValue.substring(colonIndex + 1).trim()
          if (key && value) {
            headers[key] = value
          }
        }
      }

      const cookieMatch = normalized.match(/-b\s+['"]([^'"]+)['"]/)
      const cookies = cookieMatch ? cookieMatch[1] : ''

      const dataMatch = normalized.match(/--data-raw\s+['"]([^'"]+)['"]/)
      const data = dataMatch ? dataMatch[1] : ''

      return { url, headers, cookies, data }
    } catch (error) {
      console.error('Error parsing curl:', error)
      return null
    }
  }

  const addCurlEntry = () => {
    setCurlEntries([...curlEntries, { id: Date.now().toString(), title: '', curl: '' }])
  }

  const removeCurlEntry = (id: string) => {
    if (curlEntries.length > 1) {
      setCurlEntries(curlEntries.filter((entry) => entry.id !== id))
    }
  }

  const updateCurlEntry = (id: string, curl: string) => {
    setCurlEntries(
      curlEntries.map((entry) => (entry.id === id ? { ...entry, curl } : entry))
    )
  }

  const updateCurlEntryTitle = (id: string, title: string) => {
    setCurlEntries(
      curlEntries.map((entry) => (entry.id === id ? { ...entry, title } : entry))
    )
  }

  const handleRegisterSingle = async (entryId: string) => {
    const entry = curlEntries.find((e) => e.id === entryId)
    if (!entry) return

    if (!entry.curl.trim()) {
      setResponse({
        success: false,
        message: `Vui lòng nhập curl command cho môn ${entry.title || entryId}.`,
        timestamp: new Date().toLocaleString('vi-VN'),
      })
      return
    }

    const parsed = parseCurl(entry.curl)
    if (!parsed) {
      setResponse({
        success: false,
        message: `Lỗi: Không thể parse curl command ở mục ${entry.title || entryId}. Vui lòng kiểm tra lại.`,
        timestamp: new Date().toLocaleString('vi-VN'),
      })
      return
    }

    setLoadingEntries((prev) => new Set(prev).add(entryId))
    setResponse(null)

    try {
      const request = {
        url: parsed.url,
        headers: parsed.headers,
        cookies: parsed.cookies,
        data: parsed.data,
        title: entry.title || `Môn ${entryId}`,
      }

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [request],
          scheduledTime: null,
          retryInterval: retryInterval ? parseInt(retryInterval) : null,
          retryCount: retryCount ? parseInt(retryCount) : null,
        }),
      })

      const result = await res.json()
      const timestamp = new Date().toLocaleString('vi-VN')
      
      setResponse({
        success: result.success,
        message: result.message,
        data: result.data,
        timestamp,
      })
      
      const newLog = {
        timestamp,
        data: {
          success: result.success,
          message: result.message,
          data: result.data,
          title: entry.title || `Môn ${entryId}`,
        },
      }
      
      setLogs((prevLogs) => [newLog, ...prevLogs])
      
      setTimeout(() => {
        if (logsListRef.current) {
          logsListRef.current.scrollTop = 0
        }
      }, 100)
    } catch (error) {
      const timestamp = new Date().toLocaleString('vi-VN')
      const errorMessage = `Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      setResponse({
        success: false,
        message: errorMessage,
        timestamp,
      })
      
      const errorLog = {
        timestamp,
        data: {
          success: false,
          message: errorMessage,
          error: error instanceof Error ? error.message : 'Unknown error',
          title: entry.title || `Môn ${entryId}`,
        },
      }
      
      setLogs((prevLogs) => [errorLog, ...prevLogs])
      
      setTimeout(() => {
        if (logsListRef.current) {
          logsListRef.current.scrollTop = 0
        }
      }, 100)
    } finally {
      setLoadingEntries((prev) => {
        const next = new Set(prev)
        next.delete(entryId)
        return next
      })
    }
  }

  const handleRegister = async (isScheduled: boolean) => {
    const parsedEntries: Array<{ data: CurlData; id: string; title: string }> = []

    for (const entry of curlEntries) {
      if (!entry.curl.trim()) continue
      const parsed = parseCurl(entry.curl)
      if (!parsed) {
        setResponse({
          success: false,
          message: `Lỗi: Không thể parse curl command ở mục ${entry.title || entry.id}. Vui lòng kiểm tra lại.`,
          timestamp: new Date().toLocaleString('vi-VN'),
        })
        return
      }
      parsedEntries.push({ data: parsed, id: entry.id, title: entry.title || `Môn ${entry.id}` })
    }

    if (parsedEntries.length === 0) {
      setResponse({
        success: false,
        message: 'Vui lòng nhập ít nhất một curl command hợp lệ.',
        timestamp: new Date().toLocaleString('vi-VN'),
      })
      return
    }

    if (isScheduled && !scheduledTime) {
      setResponse({
        success: false,
        message: 'Vui lòng chọn thời gian đăng ký.',
        timestamp: new Date().toLocaleString('vi-VN'),
      })
      return
    }

    setIsLoading(true)
    setResponse(null)

    try {
      const requests = parsedEntries.map((entry) => ({
        url: entry.data.url,
        headers: entry.data.headers,
        cookies: entry.data.cookies,
        data: entry.data.data,
        title: entry.title,
      }))

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests,
          scheduledTime: isScheduled ? scheduledTime : null,
          retryInterval: retryInterval ? parseInt(retryInterval) : null,
          retryCount: retryCount ? parseInt(retryCount) : null,
        }),
      })

      const result = await res.json()
      const timestamp = new Date().toLocaleString('vi-VN')
      
      setResponse({
        success: result.success,
        message: result.message,
        data: result.data,
        timestamp,
      })
      setIsScheduled(result.scheduled || false)
      if (result.scheduled && result.requestId) {
        setScheduledRequestId(result.requestId)
      }
      
      const newLog = {
        timestamp,
        data: {
          success: result.success,
          message: result.message,
          data: result.data,
          scheduled: result.scheduled,
          scheduledTime: result.scheduledTime,
          retryInterval: result.retryInterval,
          retryCount: result.retryCount,
        },
      }
      
      setLogs((prevLogs) => [newLog, ...prevLogs])
      
      setTimeout(() => {
        if (logsListRef.current) {
          logsListRef.current.scrollTop = 0
        }
      }, 100)
    } catch (error) {
      const timestamp = new Date().toLocaleString('vi-VN')
      const errorMessage = `Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      setResponse({
        success: false,
        message: errorMessage,
        timestamp,
      })
      
      const errorLog = {
        timestamp,
        data: {
          success: false,
          message: errorMessage,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }
      
      setLogs((prevLogs) => [errorLog, ...prevLogs])
      
      setTimeout(() => {
        if (logsListRef.current) {
          logsListRef.current.scrollTop = 0
        }
      }, 100)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopScheduled = async () => {
    if (!scheduledRequestId) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/register?requestId=${scheduledRequestId}`, {
        method: 'DELETE',
      })

      const result = await res.json()
      const timestamp = new Date().toLocaleString('vi-VN')
      
      setResponse({
        success: result.success,
        message: result.message,
        timestamp,
      })
      
      if (result.success) {
        setIsScheduled(false)
        setScheduledRequestId(null)
      }
      
      const newLog = {
        timestamp,
        data: {
          success: result.success,
          message: result.message,
          action: 'stop_scheduled',
        },
      }
      
      setLogs((prevLogs) => [newLog, ...prevLogs])
      
      setTimeout(() => {
        if (logsListRef.current) {
          logsListRef.current.scrollTop = 0
        }
      }, 100)
    } catch (error) {
      const timestamp = new Date().toLocaleString('vi-VN')
      const errorMessage = `Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      setResponse({
        success: false,
        message: errorMessage,
        timestamp,
      })
      
      const errorLog = {
        timestamp,
        data: {
          success: false,
          message: errorMessage,
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'stop_scheduled',
        },
      }
      
      setLogs((prevLogs) => [errorLog, ...prevLogs])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Đăng Ký Môn Học</h1>
      
      <div className={styles.contentWrapper}>
        <div className={styles.formSection}>
          <div className={styles.curlEntries}>
        {curlEntries.map((entry, index) => (
          <div key={entry.id} className={styles.curlEntry}>
            <div className={styles.curlEntryHeader}>
              <label className={styles.label}>
                Môn {index + 1} - cURL Command:
              </label>
              <div className={styles.entryActions}>
                <button
                  className={styles.registerButton}
                  onClick={() => handleRegisterSingle(entry.id)}
                  disabled={isLoading || loadingEntries.has(entry.id)}
                  type="button"
                >
                  {loadingEntries.has(entry.id) ? 'Đang xử lý...' : 'Đăng ký'}
                </button>
                {curlEntries.length > 1 && (
                  <button
                    className={styles.removeButton}
                    onClick={() => removeCurlEntry(entry.id)}
                    type="button"
                  >
                    ✕ Xóa
                  </button>
                )}
              </div>
            </div>
            <div className={styles.titleInputWrapper}>
              <input
                type="text"
                className={styles.titleInput}
                value={entry.title}
                onChange={(e) => updateCurlEntryTitle(entry.id, e.target.value)}
                placeholder={`Tên môn học ${index + 1} (tùy chọn)`}
              />
            </div>
            <textarea
              className={styles.textarea}
              value={entry.curl}
              onChange={(e) => updateCurlEntry(entry.id, e.target.value)}
              placeholder="Dán curl command vào đây..."
              rows={6}
            />
          </div>
        ))}
        <button
          className={styles.addButton}
          onClick={addCurlEntry}
          type="button"
        >
          + Thêm môn học
        </button>
      </div>

      <div className={styles.optionsRow}>
        <div className={styles.formGroup}>
          <label htmlFor="time" className={styles.label}>
            Thời gian đăng ký (HH:mm:ss):
          </label>
          <input
            id="time"
            type="time"
            step="1"
            className={styles.input}
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            placeholder="20:00:00"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="retry" className={styles.label}>
            Khoảng cách retry (giây):
          </label>
          <input
            id="retry"
            type="number"
            min="1"
            className={styles.input}
            value={retryInterval}
            onChange={(e) => setRetryInterval(e.target.value)}
            placeholder="5"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="retryCount" className={styles.label}>
            Số lần retry:
          </label>
          <input
            id="retryCount"
            type="number"
            min="0"
            className={styles.input}
            value={retryCount}
            onChange={(e) => setRetryCount(e.target.value)}
            placeholder="0 (không giới hạn)"
          />
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={() => handleRegister(false)}
          disabled={isLoading}
        >
          {isLoading ? 'Đang xử lý...' : 'Đăng Ký Ngay'}
        </button>
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={() => handleRegister(true)}
          disabled={isLoading}
        >
          {isLoading ? 'Đang xử lý...' : 'Lên Lịch'}
        </button>
      </div>

      {isScheduled && (
        <div className={styles.scheduledInfo}>
          <span>Đã lên lịch đăng ký tự động</span>
          <button
            className={styles.stopButton}
            onClick={handleStopScheduled}
            disabled={isLoading}
            type="button"
          >
            Dừng
          </button>
        </div>
      )}

          {response && (
            <div
              className={`${styles.response} ${
                response.success ? styles.success : styles.error
              }`}
            >
              <div className={styles.responseHeader}>
                <strong>
                  {response.success ? 'Thành công' : 'Lỗi'}
                </strong>
                <span className={styles.timestamp}>{response.timestamp}</span>
              </div>
              <div className={styles.responseMessage}>{response.message}</div>
              {response.data && (
                <pre className={styles.responseData}>
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        <div className={styles.logsSection}>
          <h3 className={styles.logsTitle}>API Response</h3>
          {logs.length > 0 ? (
            <div className={styles.logsList} ref={logsListRef}>
              {logs.map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className={`${styles.logEntry} ${index === 0 ? styles.newLog : ''}`}>
                  <div className={styles.logHeader}>
                    <div className={styles.logTimestamp}>{log.timestamp}</div>
                    {log.data?.scheduled && (
                      <div className={styles.logTitle}>Đã lên lịch</div>
                    )}
                  </div>
                  <pre className={styles.logData}>
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyLogs}>
              <p>Chưa có response. Response sẽ hiển thị ở đây khi bạn đăng ký.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

