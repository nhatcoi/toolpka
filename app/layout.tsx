import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import styles from './layout.module.css'

export const metadata: Metadata = {
  title: 'ToolPKA',
  description: 'Bộ công cụ tiện ích',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body>
        <div className={styles.wrapper}>
          <Sidebar />
          <main className={styles.main}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
