import styles from './home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Chào mừng đến với ToolPKA</h1>
      <p className={styles.description}>
        Bộ công cụ tiện ích cho sinh viên Phenikaa
      </p>
      <div className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>📚</div>
          <h3>Đăng ký môn học</h3>
          <p>Đăng ký môn học tự động với khả năng lên lịch và retry</p>
        </div>
      </div>
    </div>
  )
}
