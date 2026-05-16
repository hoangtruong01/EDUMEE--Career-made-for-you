# Hướng dẫn Cấu trúc Kỹ thuật (Technical Structure Guide)

Tài liệu này dành cho Mobile Developer để hiểu cách tổ chức mã nguồn của hệ thống EDUMEE, từ đó dễ dàng chuyển đổi các tính năng từ Web xuống Mobile.

---

## 1. Cấu trúc Backend (`/be`) - Nơi cung cấp dữ liệu

Backend được xây dựng bằng NestJS, tổ chức theo hướng Module. Mobile Dev cần chú ý các thư mục sau:

- **`src/modules/`**: Chứa logic của từng tính năng. Mỗi module thường có:
  - `controllers/`: Định nghĩa các endpoint API (Mobile gọi vào đây).
  - `services/`: Logic xử lý dữ liệu và tương tác DB.
  - `dto/`: Định nghĩa kiểu dữ liệu (Type) cho request/response. Mobile Dev nên copy các interface này sang Mobile để đảm bảo đồng bộ.
  - `schemas/`: Cấu trúc dữ liệu lưu trong MongoDB.
- **`src/config/`**: Chứa các cấu hình về cổng (Port), CORS, và các biến môi trường.

**Các endpoint quan trọng cho Mobile:**

- Auth: `/api/v1/auth/login`, `/api/v1/auth/register`
- Trắc nghiệm: `/api/v1/assessment-question`, `/api/v1/assessment-answer`
- Nghề nghiệp: `/api/v1/careers`, `/api/v1/careers/:id`
- Cộng đồng: `/api/v1/community/posts`

---

## 2. Cấu trúc Frontend Web (`/fe`) - Tham chiếu giao diện & Logic

Web được xây dựng bằng Next.js (App Router). Mobile Dev có thể tham khảo logic xử lý tại:

- **`views/`**: Đây là nơi chứa code giao diện chính của từng trang (AssessmentResult, Community, CareerCompare...). Mobile Dev nên xem code ở đây để hiểu cách Frontend Web render dữ liệu.
- **`app/`**: Định nghĩa cấu trúc URL (Routing).
- **`hooks/`**: Các custom hooks dùng để gọi API hoặc quản lý state (ví dụ: `useAuth`, `useCareers`).
- **`lib/`**: Chứa các file service gọi API bằng Axios (ví dụ: `career.service.ts`). Mobile Dev có thể chuyển đổi các hàm này sang Mobile gần như 1:1.
- **`components/`**: Các thành phần giao diện dùng chung (Button, Card, Modal...).

---

## 3. Cấu trúc Mobile App (`/mobile`) - Dự án mới

Dự án Mobile sử dụng Expo với cấu trúc hiện đại để dev nhanh và dễ bảo trì:

- **`app/` (Expo Router)**:
  - `_layout.tsx`: Cấu hình Root (Fonts, Theme, Navigation Stack).
  - `login.tsx` & `admin-login.tsx`: Các màn hình xác thực.
  - `(tabs)/`: Chứa các màn hình chính sau khi đăng nhập (Home, Explore...).
- **`src/`**:
  - `theme/`: Chứa `index.ts` định nghĩa màu sắc, bo góc, khoảng cách (giúp UI đồng bộ).
  - `components/`: Chứa các UI Atomic như `Button.tsx`, `GlassView.tsx` (Glassmorphism).
  - `services/`:
    - `api.ts`: Cấu hình Axios, tự động đính kèm Token. **Quan trọng**: Có xử lý fallback giữa `SecureStore` (Native) và `localStorage` (Web).
- **`assets/`**: Chứa fonts (Plus Jakarta Sans) và hình ảnh.

---

## Lời khuyên cho Mobile Developer:

1.  **Dùng chung Type**: Hãy tạo một file `types.ts` trong `/mobile/src` và copy các Interface từ `/be/src/modules/*/dto` để tránh lỗi kiểu dữ liệu.
2.  **Refer Logic từ `/fe/lib`**: Các hàm gọi API trong thư mục `lib` của Web đã được tối ưu, hãy mang chúng vào `mobile/src/services`.
3.  **UI Token**: Luôn sử dụng các biến từ `COLORS`, `SPACING` trong `src/theme` thay vì viết cứng giá trị màu/khoảng cách để đảm bảo thiết kế "premium".

---

**Cần hỗ trợ thêm về Module nào, hãy yêu cầu tôi giải thích chi tiết file đó!**
