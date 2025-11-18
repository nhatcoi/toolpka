'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Sidebar.module.css'

const menuItems = [
  { path: '/', label: 'Trang chủ' },
  { path: '/dang-ky-mon-hoc', label: 'Đăng ký môn học' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h1>ToolPKA</h1>
      </div>
      <nav className={styles.nav}>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`${styles.navItem} ${
              pathname === item.path ? styles.active : ''
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

