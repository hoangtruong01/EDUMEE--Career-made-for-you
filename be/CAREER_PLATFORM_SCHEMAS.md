# AI Career Consulting Platform - Database Schema Documentation

## Mục tiêu tài liệu

Tài liệu này được viết lại theo codebase hiện tại của backend NestJS/MongoDB, thay vì theo mô tả khái niệm cũ. Mục tiêu là phản ánh đúng các schema đang có, các module thực tế, và các quan hệ chính giữa chúng.

## Tổng quan kiến trúc dữ liệu

Codebase hiện tại có 8 module dữ liệu chính và 23 schema MongoDB:

- `users`: `User`, `UserProfile`
- `ai`: `AiPlan`, `AiUsageLog`
- `assessment`: `AssessmentSession`, `AssessmentQuestion`, `AssessmentAnswer`, `CareerFitResult`
- `careers`: `Career`, `CareerComparison`
- `learning`: `SimulationTask`, `TaskSubmission`, `LearningRoadmap`, `WeeklyPlan`, `Checkpoint`
- `mentoring`: `TutorProfile`, `BookingSession`, `TutoringSession`, `SessionReview`
- `community`: `CareerReview`, `ReviewVote`, `ReviewReport`
- `onboarding`: `OnboardingSession`

Mô hình dữ liệu xoay quanh 3 luồng chính:

- Định danh người dùng và hồ sơ mở rộng
- Đánh giá, gợi ý nghề nghiệp và lập lộ trình học
- Mentoring, cộng đồng và theo dõi sử dụng AI

## 1. Users Module

**Mục đích:** quản lý tài khoản, xác thực và hồ sơ mở rộng của người dùng.

### `User`

- Schema lõi cho tài khoản và xác thực.
- Lưu thông tin như tên, email, mật khẩu, số điện thoại, vai trò, trạng thái verify, avatar và các token khôi phục/quên mật khẩu.
- Là điểm tham chiếu cho hầu hết các module khác qua `userId` hoặc biến thể của `userId`.

### `UserProfile`

- Hồ sơ mở rộng cho dữ liệu nghề nghiệp và học tập.
- Lưu các thuộc tính như năm sinh, trình độ học vấn, công việc hiện tại, số năm kinh nghiệm, kỹ năng, mức ngân sách, mục tiêu nghề nghiệp và bio.
- Dùng để cá nhân hóa roadmap, gợi ý nghề nghiệp và trải nghiệm AI.

## 2. AI Module

**Mục đích:** theo dõi gói dịch vụ AI và mức sử dụng theo người dùng.

### `AiPlan`

- Định nghĩa gói AI theo tier.
- Chứa thông tin giá, hạn mức sử dụng và các feature flag như career recommendation, job simulation, mentor booking, chatbot.
- Phục vụ kiểm soát quyền truy cập và giới hạn tính năng.

### `AiUsageLog`

- Ghi nhận mức sử dụng AI theo user, feature, tháng và năm.
- Theo dõi token đã dùng và số request.
- Phục vụ billing, quota và phân tích hành vi sử dụng.

## 3. Assessment Module

**Mục đích:** thu thập dữ liệu đánh giá đầu vào và tạo kết quả phù hợp nghề nghiệp.

### `AssessmentSession`

- Phiên đánh giá tổng thể của người dùng.
- Theo dõi trạng thái, số lần làm, thời gian bắt đầu/kết thúc và tiến trình của một đợt assessment.
- Là khung bao cho các câu trả lời và kết quả phân tích.

### `AssessmentQuestion`

- Ngân hàng câu hỏi đánh giá.
- Lưu nội dung câu hỏi, loại câu hỏi, dimension, options, thứ tự hiển thị và trạng thái active.
- Chủ yếu phục vụ các bài test dạng lựa chọn cố định.

### `AssessmentAnswer`

- Câu trả lời của người dùng cho từng câu hỏi.
- Lưu answer, thời gian phản hồi, metadata và liên kết tới question/session/user.
- Dùng cho scoring và phân tích hành vi trả lời.

### `CareerFitResult`

- Kết quả phân tích mức phù hợp nghề nghiệp do AI hoặc logic chấm điểm tạo ra.
- Lưu overall fit score, danh sách nghề được đề xuất, giải thích AI, phản hồi người dùng và các profile breakdown theo nhóm tiêu chí.
- Là đầu ra chính sau assessment.

## 4. Careers Module

**Mục đích:** quản lý dữ liệu nghề nghiệp và so sánh các lựa chọn nghề nghiệp.

### `Career`

- Dữ liệu nghề nghiệp trung tâm của hệ thống.
- Chứa mô tả, category, kỹ năng yêu cầu, mức độ phù hợp tính cách, các cấp độ nghề nghiệp, thông tin thị trường, lộ trình học, môi trường làm việc và các trường liên quan khác.
- Là nguồn tham chiếu cho assessment, learning, community và mentoring.

### `CareerComparison`

- Lưu các lần so sánh nghề nghiệp do người dùng tạo.
- Chứa danh sách nghề đem ra so sánh, tiêu chí so sánh có trọng số, kết quả chấm điểm, recommendation và quyết định cuối cùng của user.
- Hữu ích cho việc ra quyết định trước khi vào roadmap học hoặc mentoring.

## 5. Learning Module

**Mục đích:** xây dựng lộ trình học cá nhân hóa, chia tuần và đánh giá tiến độ.

### `LearningRoadmap`

- Lộ trình học tổng thể cho một user hướng tới một nghề hoặc một cấp độ mục tiêu.
- Lưu các phase, milestone, personalization data, progress và trạng thái thực thi.
- Là xương sống cho toàn bộ luồng học tập.

### `WeeklyPlan`

- Kế hoạch học theo tuần được sinh ra từ roadmap.
- Gồm mục tiêu tuần, activities, lịch thực hiện, phụ thuộc, checkpoint tuần và dữ liệu thích nghi.
- Phục vụ vòng lặp học tập ngắn hạn và điều chỉnh kế hoạch.

### `SimulationTask`

- Nhiệm vụ mô phỏng công việc hoặc thử thách học tập.
- Lưu task content, level, nghề liên quan, skill đánh giá, rubric và cấu hình AI evaluation.
- Dùng cho các bài mô phỏng thực tế theo từng cấp độ.

### `TaskSubmission`

- Bài nộp của người dùng cho một simulation task.
- Lưu trạng thái, nội dung nộp, thời gian làm, số lần làm, kết quả đánh giá và khuyến nghị cải thiện.
- Là đầu vào cho feedback và tiến độ học.

### `Checkpoint`

- Mốc đánh giá định kỳ trong quá trình học.
- Theo dõi tình trạng tiến độ, thách thức, kết quả đánh giá, đề xuất điều chỉnh roadmap và phản hồi của người dùng.
- Là phần quan trọng của cơ chế học theo vòng lặp.

## 6. Mentoring Module

**Mục đích:** quản lý mentor, đặt lịch, diễn ra buổi tư vấn và đánh giá sau buổi học.

### `TutorProfile`

- Hồ sơ mentor/gia sư.
- Chứa background, expertise, availability, pricing, verification và các chỉ số đánh giá chất lượng.
- Là lớp dữ liệu dùng để hiển thị mentor cho người học.

### `BookingSession`

- Phiên đặt lịch giữa mentee và mentor.
- Lưu yêu cầu đặt lịch, thời gian dự kiến, chủ đề, trạng thái trao đổi, thông tin thanh toán và lịch sử thay đổi lịch.
- Là cầu nối giữa nhu cầu học và buổi mentoring thực tế.

### `TutoringSession`

- Phiên mentoring thực tế sau khi booking được xác nhận.
- Lưu agenda, nội dung buổi học, tiến độ, quan sát của mentor và các đề xuất tiếp theo.
- Có thể liên kết với roadmap để cập nhật tiến độ học.

### `SessionReview`

- Đánh giá sau buổi mentoring từ một hoặc cả hai phía.
- Lưu rating, feedback, mức ảnh hưởng và các thông tin xác minh.
- Phục vụ chất lượng dịch vụ và moderation nếu cần.

## 7. Community Module

**Mục đích:** lưu review nghề nghiệp ẩn danh và hệ thống tương tác/moderation cho review.

### `CareerReview`

- Review nghề nghiệp từ cộng đồng theo hướng ẩn danh nhưng vẫn có ngữ cảnh.
- Chứa nội dung review, đánh giá, hành trình nghề nghiệp, insight thực tế và thông tin liên quan đến kinh nghiệm làm việc/học tập.
- Là nguồn dữ liệu xã hội để bổ trợ career exploration.

### `ReviewVote`

- Phiếu vote cho review, thường theo các nhãn như helpful, accurate, relevant hoặc tương đương tùy schema cụ thể.
- Có metadata về người vote và ngữ cảnh để hỗ trợ đánh trọng số.
- Dùng để xếp hạng chất lượng review.

### `ReviewReport`

- Báo cáo vi phạm hoặc nội dung cần moderation.
- Lưu reason, severity, trạng thái xử lý, kết quả điều tra và quy trình kháng nghị.
- Hỗ trợ vận hành cộng đồng an toàn hơn.

## 8. Onboarding Module

**Mục đích:** theo dõi quá trình onboarding người dùng mới và thu thập dữ liệu nền.

### `OnboardingSession`

- Phiên onboarding theo từng bước.
- Lưu trạng thái, tiến độ, intent của người dùng, dữ liệu nền và các cờ theo dõi trải nghiệm.
- Là điểm vào đầu tiên của hệ thống trước khi sang assessment và recommendation.

## Quan hệ chính giữa các module

- `User` là thực thể gốc cho gần như toàn bộ dữ liệu nghiệp vụ.
- `AssessmentSession` và `CareerFitResult` nối dữ liệu đầu vào với kết quả gợi ý nghề nghiệp.
- `Career` được tái sử dụng ở assessment, learning, mentoring và community.
- `LearningRoadmap`, `WeeklyPlan` và `Checkpoint` tạo thành vòng lặp học tập liên tục.
- `BookingSession` và `TutoringSession` kết nối nhu cầu học với mentor thực tế.
- `AiUsageLog` và `AiPlan` kiểm soát quota và gói dịch vụ AI.

## Ghi chú kỹ thuật

- Một số schema dùng nested object và array khá sâu, đặc biệt ở `Career`, `LearningRoadmap`, `WeeklyPlan`, `BookingSession` và `CareerReview`.
- Cấu trúc collection hiện tại thiên về truy vấn theo user, trạng thái, thời gian và tiến trình.
- Có một typo trong tên file: `src/modules/assessment/schemas/assessment-sesions.schema.ts`.
- Module AI đang dùng thư mục `schema/` thay vì `schemas/` như các module khác.
- Community gộp vote và report trong file `review-interactions.schema.ts` thay vì tách riêng theo tên collection.

## Kết luận

Codebase hiện tại không chỉ có 6 flow nghiệp vụ như bản mô tả cũ mà đã mở rộng thành một hệ dữ liệu hoàn chỉnh gồm user/auth, AI plan/usage, assessment, careers, learning, mentoring, community và onboarding. Bản tài liệu này phản ánh đúng cấu trúc thực tế để dùng làm nền cho việc phát triển, review và mở rộng schema sau này.
