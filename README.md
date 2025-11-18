# Tool Đăng Ký Môn Học

Ứng dụng Next.js để đăng ký môn học tự động với khả năng lên lịch và retry.

## Tính năng

- Nhập curl command để đăng ký môn học
- Đăng ký ngay lập tức hoặc lên lịch đăng ký vào thời gian cụ thể
- Tự động retry với khoảng cách thời gian tùy chỉnh
- Hiển thị kết quả API response

## Cài đặt

```bash
npm install
```

## Chạy ứng dụng

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt.

## Sử dụng

1. Dán curl command vào ô input
2. (Tùy chọn) Chọn thời gian đăng ký (HH:mm:ss)
3. (Tùy chọn) Nhập khoảng cách retry (giây)
4. Nhấn nút "Đăng Ký"

## Build

```bash
npm run build
npm start
```

