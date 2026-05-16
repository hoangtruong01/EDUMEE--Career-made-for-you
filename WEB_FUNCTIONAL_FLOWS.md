# Tài liệu Luồng Chức năng EDUMEE (Web Platform)

Tài liệu này chi tiết các luồng chức năng hiện tại của hệ thống EDUMEE đã được tích hợp API thực tế.

---

## 1. Luồng Xác thực (Authentication)

Hệ thống sử dụng JWT (JSON Web Token) để quản lý phiên đăng nhập.

- **Đăng ký (Register)**: Người dùng nhập Email, Mật khẩu -> Backend mã hóa mật khẩu (Bcrypt) -> Lưu vào MongoDB.
- **Đăng nhập (Login)**: Xác thực thông tin -> Trả về `accessToken` và `refreshToken`. Token được lưu tại `localStorage` (Web) và `localStorage/SecureStore` (Mobile).
- **Quên mật khẩu**: Nhập Email -> Backend gửi mã/link reset qua `Nodemailer`.
- **Google OAuth**: Đăng nhập nhanh qua tài khoản Google.

## 2. Luồng Trắc nghiệm & Phân tích tính cách

Đây là tính năng cốt lõi giúp định hướng nghề nghiệp.

1.  **Lấy câu hỏi**: Frontend gọi `GET /assessment-question` (Câu hỏi dựa trên bộ mã Holland: R-I-A-S-E-C).
2.  **Làm bài**: Người dùng chọn mức độ phù hợp cho từng câu hỏi.
3.  **Nộp bài**: `POST /assessment-answer`. Backend tính toán điểm số cho 6 nhóm tính cách.
4.  **Kết quả**: Hiển thị biểu đồ Radar và mô tả chi tiết về nhóm tính cách chiếm ưu thế.

## 3. Luồng Khám phá & So sánh Nghề nghiệp

Dựa trên kết quả trắc nghiệm, hệ thống gợi ý các nghề nghiệp phù hợp.

- **Tìm kiếm & Lọc**: `GET /careers` với các filter về nhóm tính cách, mức lương, xu hướng.
- **Chi tiết nghề nghiệp**: `GET /careers/:id`. Hiển thị:
  - Mô tả nghề nghiệp.
  - Mức lương trung bình.
  - Lộ trình phát triển (Roadmap) do AI gợi ý.
  - Ưu điểm & Thách thức.
- **So sánh**: Chọn 2 nghề nghiệp -> So sánh các tiêu chí (Yêu cầu kỹ năng, Thu nhập, Cơ hội việc làm).

## 4. Luồng Cộng đồng (Community)

Môi trường tương tác giữa người dùng và chuyên gia.

- **Bảng tin (Feed)**: `GET /community/posts`. Hiển thị bài viết mới nhất/nổi bật.
- **Tương tác**:
  - Thích (Like) & Bình luận (Comment).
  - Báo cáo vi phạm (Report) nội dung không phù hợp.
- **Đăng bài**: Hỗ trợ upload hình ảnh qua `Cloudinary` tích hợp trong Backend.

## 5. Luồng Lộ trình học tập & Mô phỏng (AI driven)

Sử dụng sức mạnh của AI (Gemini) để cá nhân hóa trải nghiệm.

- **Lộ trình học tập**: Dựa trên mục tiêu nghề nghiệp, AI tạo ra danh sách các khóa học, kỹ năng cần học theo từng giai đoạn.
- **Mô phỏng nghề nghiệp**: Người dùng trò chuyện với AI để trải nghiệm các tình huống thực tế trong công việc (Ví dụ: Một ngày của Software Engineer).

## 6. Luồng Quản trị (Admin Panel)

Dành cho quản trị viên hệ thống để kiểm soát dữ liệu.

- **Thống kê (Dashboard)**: Xem biểu đồ tăng trưởng người dùng, số lượng bài trắc nghiệm đã làm.
- **Quản lý nội dung**:
  - Thêm/Sửa/Xóa dữ liệu nghề nghiệp & chuyên ngành.
  - Sử dụng AI để tự động tạo mô tả nghề nghiệp nhanh chóng.
- **Kiểm duyệt cộng đồng**: Xử lý các báo cáo từ người dùng, xóa các nội dung vi phạm chính sách.

---

### Danh sách các Module API chính (Backend):

- `/auth`: Xử lý đăng nhập, đăng ký, cấp lại token.
- `/users`: Quản lý thông tin cá nhân, hồ sơ người dùng.
- `/assessment`: Quản lý câu hỏi, phiên làm bài và kết quả trắc nghiệm.
- `/careers`: Cơ sở dữ liệu nghề nghiệp và AI roadmap.
- `/community`: Bài viết, bình luận, lượt thích và báo cáo.
- `/media`: Xử lý upload ảnh và video.
- `/ai`: Tích hợp Google Gemini cho các tính năng thông minh.
