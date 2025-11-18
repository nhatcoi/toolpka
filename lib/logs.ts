export interface LogEntry {
  timestamp: string
  data: any
  requestId: string
}

const jobLogs = new Map<string, LogEntry[]>()

export function addLog(requestId: string, data: any) {
  if (!jobLogs.has(requestId)) {
    jobLogs.set(requestId, [])
  }
  const logs = jobLogs.get(requestId)!
  logs.push({
    timestamp: new Date().toLocaleString('vi-VN'),
    data,
    requestId,
  })
  if (logs.length > 100) {
    logs.shift()
  }
  console.log(`[${new Date().toLocaleString('vi-VN')}] Registration result:`, data)
}

export function getAllLogs(): LogEntry[] {
  const allLogs: LogEntry[] = []
  for (const logs of jobLogs.values()) {
    allLogs.push(...logs)
  }
  return allLogs.sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
}

export function getLogsByRequestId(requestId: string): LogEntry[] {
  return jobLogs.get(requestId) || []
}

