# AI Career Consulting Platform - Workflow & Validation

## Mục tiêu

Tài liệu này mô tả workflow vận hành của nền tảng theo đúng cấu trúc dữ liệu hiện có trong codebase, đồng thời mở rộng thành một bản đặc tả dễ dùng cho triển khai, review API và kiểm tra validation.

## Cách đọc tài liệu

Mỗi module bên dưới được trình bày theo cùng một mẫu:

- Workflow: luồng nghiệp vụ chính.
- Input: dữ liệu đầu vào phải có.
- Validation: các kiểm tra bắt buộc trước khi ghi dữ liệu hoặc chuyển trạng thái.
- Output: dữ liệu hoặc trạng thái sau khi xử lý.
- Failure cases: lỗi thường gặp nếu validation không đạt.

## Nguyên tắc chung

- Mọi dữ liệu gắn với người dùng phải kiểm tra ownership.
- Mọi trạng thái phải đi theo đúng thứ tự chuyển đổi, không được nhảy cóc.
- Mọi field dạng enum phải được validate theo danh sách giá trị hợp lệ.
- Mọi thao tác tạo mới phải kiểm tra uniqueness nếu schema yêu cầu.
- Mọi thao tác có giới hạn sử dụng phải kiểm tra quota theo gói AI hoặc theo chu kỳ sử dụng.
- Mọi dữ liệu nhạy cảm hoặc nội dung cộng đồng phải đi qua moderation khi cần.
- Các thao tác update/delete phải kiểm tra quyền thực hiện và trạng thái hiện tại của entity.

## 1. User Workflow

### 1.1 Luồng nghiệp vụ

1. User gửi request đăng ký.
2. Hệ thống tạo `User` với trạng thái ban đầu.
3. User xác thực email để chuyển sang trạng thái hợp lệ.
4. User cập nhật `UserProfile` để hoàn thiện dữ liệu cá nhân.
5. Hệ thống gán role phù hợp cho tài khoản.

### 1.2 Input cần có

- Email.
- Password và password confirmation.
- Thông tin cơ bản như name, phone, avatar nếu có.
- Dữ liệu profile như gender, education level, career goal, skills.

### 1.3 Validation bắt buộc

- Email phải đúng định dạng và không được trùng.
- Password phải đạt chính sách độ mạnh tối thiểu.
- Password confirmation phải khớp với password.
- Role phải thuộc enum cho phép.
- Verify status phải là giá trị hợp lệ của hệ thống.
- `UserProfile` phải validate các field dạng enum như gender, education level, budget level.
- Mảng skills phải là danh sách hợp lệ, không lẫn kiểu dữ liệu khác.
- Các field optional phải được bỏ qua đúng cách nếu không được gửi lên.

### 1.4 Output mong đợi

- Một `User` hợp lệ được tạo.
- `UserProfile` có thể được tạo hoặc cập nhật theo từng bước.
- Tài khoản chuyển sang trạng thái có thể dùng cho các luồng khác.

### 1.5 Failure cases thường gặp

- Email đã tồn tại.
- Password không đủ mạnh.
- Role không hợp lệ.
- Người dùng chưa xác thực email nhưng đã gọi các API yêu cầu quyền cao hơn.

## 2. Onboarding Workflow

### 2.1 Luồng nghiệp vụ

1. Tạo `OnboardingSession` cho user mới hoặc user chưa hoàn tất onboarding.
2. User đi qua từng step theo đúng thứ tự.
3. Hệ thống thu thập intent, background, learning preferences và career preferences.
4. Session được đánh dấu hoàn tất khi đủ dữ liệu.

### 2.2 Input cần có

- `userId`.
- Step hiện tại.
- Dữ liệu cho từng step như profile setup, interests, goals, preferences.
- Dữ liệu intent và situation nếu workflow yêu cầu.

### 2.3 Validation bắt buộc

- `userId` của session phải khớp user đang đăng nhập.
- Không được tạo trùng session nếu hệ thống chỉ cho phép một session hoạt động.
- Chỉ cho phép đi tiếp theo đúng thứ tự bước.
- Mỗi step phải có dữ liệu trước khi chuyển sang step tiếp theo.
- `progressPercentage` phải nằm trong khoảng 0-100.
- Field `intent`, `currentSituation`, `urgency`, `preferences` phải hợp lệ theo enum hoặc format định nghĩa.
- Không cho phép update step vượt quá trạng thái hiện tại.

### 2.4 Output mong đợi

- Một onboarding session có tiến trình rõ ràng.
- Dữ liệu baseline đủ để dùng cho assessment và recommendation.

### 2.5 Failure cases thường gặp

- Không đúng user sở hữu session.
- Thiếu data ở step bắt buộc.
- Bỏ qua step trung gian.
- Progress bị set ngoài phạm vi hợp lệ.

## 3. Assessment Workflow

### 3.1 Luồng nghiệp vụ

1. Tạo `AssessmentSession` cho user.
2. Lấy danh sách `AssessmentQuestion` đang active.
3. User trả lời từng câu hỏi hoặc gửi bulk answer.
4. Hệ thống lưu `AssessmentAnswer`.
5. Khi hoàn tất, session được đóng và sinh `CareerFitResult`.

### 3.2 Input cần có

- `sessionId`.
- `questionId`.
- `answer`.
- Thông tin định danh user.
- Metadata bổ sung nếu schema hỗ trợ.

### 3.3 Validation bắt buộc

- Session phải tồn tại và thuộc về đúng user.
- Câu hỏi phải tồn tại và đang active.
- Answer phải đúng format mà question yêu cầu.
- `questionId`, `sessionId`, `userId` phải liên kết đúng với nhau.
- Không cho phép nộp trùng nếu schema có unique constraint.
- Bulk answer phải kiểm tra toàn bộ câu trả lời cùng thuộc một session.
- Điểm số trong `CareerFitResult` phải nằm trong range hợp lệ.
- Kết quả phải map về đúng user và đúng career liên quan.

### 3.4 Output mong đợi

- Assessment session được đóng đúng trạng thái.
- Một tập `AssessmentAnswer` hoàn chỉnh.
- `CareerFitResult` sẵn sàng cho bước recommendation hoặc roadmap.

### 3.5 Failure cases thường gặp

- Trả lời câu hỏi không thuộc session.
- Session đã hoàn tất nhưng vẫn cố submit answer.
- Answer sai enum hoặc sai kiểu dữ liệu.
- Kết quả fit score vượt giới hạn mong muốn.

## 4. Careers Workflow

### 4.1 Luồng nghiệp vụ

1. Hệ thống lưu `Career` làm catalog nghề nghiệp.
2. User xem danh sách và chi tiết nghề.
3. User tạo `CareerComparison` để so sánh nhiều nghề.
4. User chọn nghề phù hợp để đi sang learning hoặc mentoring.

### 4.2 Input cần có

- Dữ liệu career master.
- Danh sách career cần so sánh.
- Tiêu chí và trọng số so sánh.

### 4.3 Validation bắt buộc

- `Career` phải có title hoặc identifier hợp lệ.
- Các trường category, level, skill requirement, market info phải đúng kiểu dữ liệu và enum.
- `CareerComparison` phải thuộc về đúng user.
- Danh sách career đem so sánh phải tồn tại.
- Trọng số tiêu chí phải hợp lệ và không âm.
- Nếu có required fields trong career detail thì không được để rỗng.

### 4.4 Output mong đợi

- Career catalog nhất quán và sẵn sàng cho tìm kiếm.
- Kết quả so sánh hỗ trợ user chọn hướng đi tiếp theo.

### 4.5 Failure cases thường gặp

- Career bị trùng title/slug nếu schema đặt unique.
- So sánh với career không tồn tại.
- Trọng số không khớp tổng hoặc vượt phạm vi mong muốn.

## 5. Learning Workflow

### 5.1 Luồng nghiệp vụ

1. Tạo `LearningRoadmap` từ career mục tiêu và kết quả assessment.
2. Sinh các `WeeklyPlan` theo từng phase.
3. Giao `SimulationTask` cho user theo roadmap.
4. User nộp `TaskSubmission`.
5. Hệ thống tạo `Checkpoint` để đánh giá tiến độ.
6. Roadmap được điều chỉnh nếu người dùng tiến bộ chậm hoặc thay đổi mục tiêu.

### 5.2 Input cần có

- `userId`.
- Career mục tiêu.
- Target level.
- Các phase, milestone, task, weekly activity.
- Submission content: file, text, link, metadata.

### 5.3 Validation bắt buộc

- `LearningRoadmap` phải có user, career mục tiêu và level mục tiêu hợp lệ.
- Phase, milestone, prerequisite phải đúng thứ tự và không tạo vòng lặp.
- `WeeklyPlan` phải có ngày bắt đầu, ngày kết thúc, goals và activities hợp lệ.
- Activity phải có type, priority, dependency và status hợp lệ.
- `TaskSubmission` phải thuộc đúng user, task và roadmap.
- File upload, text content, link hoặc metadata phải đúng định dạng mà schema cho phép.
- `Checkpoint` phải gắn với roadmap hoặc weekly plan hợp lệ.
- Status của roadmap/weekly plan/submission/checkpoint phải đi đúng luồng.

### 5.4 Output mong đợi

- Roadmap được sinh ra theo đúng mức độ cá nhân hóa.
- Weekly plan phản ánh tiến độ thực tế.
- Submission được lưu và có thể đi qua đánh giá.
- Checkpoint tạo cơ sở để điều chỉnh roadmap.

### 5.5 Failure cases thường gặp

- Roadmap thiếu career mục tiêu.
- Weekly plan có activity phụ thuộc vào dữ liệu không tồn tại.
- Submission từ người dùng khác.
- Checkpoint tạo khi roadmap đang ở trạng thái không cho phép.

## 6. Mentoring Workflow

### 6.1 Luồng nghiệp vụ

1. Tạo `TutorProfile`.
2. User gửi yêu cầu đặt lịch qua `BookingSession`.
3. Mentor xác nhận hoặc từ chối booking.
4. Hệ thống tạo `TutoringSession` khi booking hợp lệ.
5. Sau buổi học, hai bên để lại `SessionReview`.

### 6.2 Input cần có

- Thông tin mentor profile.
- Booking request: topic, thời gian, nền tảng, duration, notes.
- Session details.
- Review rating và feedback.

### 6.3 Validation bắt buộc

- `TutorProfile` phải có user sở hữu và thông tin chuyên môn hợp lệ.
- Trạng thái mentor phải hợp lệ trước khi nhận booking.
- Booking phải có thời gian, chủ đề, format và thông tin liên quan hợp lệ.
- Không được đặt lịch trùng nếu mentor đã bận.
- Booking phải thuộc đúng mentee khi cập nhật hoặc hủy.
- `TutoringSession` chỉ được tạo từ booking hợp lệ và đúng trạng thái.
- Review chỉ được tạo sau khi session hoàn thành.
- Rating, feedback và reviewer type phải đúng kiểu dữ liệu và enum.

### 6.4 Output mong đợi

- Mentor có hồ sơ rõ ràng và có thể nhận booking.
- Booking và session đi theo đúng vòng đời.
- Review có giá trị cho chất lượng dịch vụ.

### 6.5 Failure cases thường gặp

- Mentor chưa active nhưng vẫn được book.
- Trùng lịch mentor.
- Review trước khi buổi học kết thúc.
- Người không thuộc session cố sửa hoặc hủy booking.

## 7. Community Workflow

### 7.1 Luồng nghiệp vụ

1. User tạo `CareerReview` ẩn danh.
2. Review đi qua bước kiểm duyệt.
3. Review được publish hoặc reject.
4. User khác vote bằng `ReviewVote`.
5. Có thể tạo `ReviewReport` nếu nội dung vi phạm.

### 7.2 Input cần có

- Nội dung review.
- Thông tin category review.
- Rating và review context.
- Dữ liệu vote hoặc report nếu có tương tác.

### 7.3 Validation bắt buộc

- Review phải có nội dung đủ tối thiểu và đúng category.
- `anonymousId` phải nhất quán để theo dõi mà vẫn giữ ẩn danh.
- Các rating phải nằm trong thang điểm hợp lệ.
- Review phải đi qua moderation nếu hệ thống yêu cầu.
- Một user chỉ nên có một vote hợp lệ trên cùng review nếu schema đặt unique constraint.
- Report phải có reason, severity và trạng thái xử lý hợp lệ.
- Admin phải ghi nhận quyết định khi xử lý report hoặc moderation.

### 7.4 Output mong đợi

- Review có thể được publish cho cộng đồng.
- Vote giúp xếp hạng chất lượng nội dung.
- Report tạo luồng kiểm duyệt rõ ràng.

### 7.5 Failure cases thường gặp

- Review quá ngắn hoặc sai category.
- Vote trùng từ cùng user.
- Report thiếu reason hoặc severity.
- Nội dung bị reject nhưng vẫn được dùng như dữ liệu công khai.

## 8. AI Workflow

### 8.1 Luồng nghiệp vụ

1. User được gán `AiPlan`.
2. Hệ thống kiểm tra quota trước khi chạy tính năng AI.
3. Mỗi request AI được ghi vào `AiUsageLog`.
4. Khi chạm giới hạn, hệ thống chặn hoặc yêu cầu nâng gói.

### 8.2 Input cần có

- Plan của user.
- Loại feature AI cần gọi.
- Thời gian sử dụng trong tháng/năm hiện tại.
- Token hoặc usage metadata.

### 8.3 Validation bắt buộc

- `AiPlan` phải có tên gói và feature flag hợp lệ.
- Hạn mức phải là số hợp lệ và nhất quán.
- `AiUsageLog` phải được ghi theo user, feature, tháng và năm.
- Số token và số request phải được cộng dồn đúng quy tắc.
- Trước khi gọi AI, hệ thống phải kiểm tra quota hiện tại của user.

### 8.4 Output mong đợi

- Feature AI chỉ chạy khi user còn quota.
- Usage log được lưu để phục vụ billing và audit.

### 8.5 Failure cases thường gặp

- User gọi feature vượt plan.
- Usage log không khớp month/year hiện tại.
- Dữ liệu quota bị tính lặp hoặc không tăng đúng.

## 9. Validation Matrix

| Flow       | Chính cần validate                                                                            |
| ---------- | --------------------------------------------------------------------------------------------- |
| User       | Email, password, role, verify status, profile enums, uniqueness                               |
| Onboarding | Ownership, step order, progress, intent enums, forward-only transition                        |
| Assessment | Question existence, answer format, session ownership, score range, unique answer rule         |
| Careers    | Career identity, comparison ownership, list validity, weights, required fields                |
| Learning   | Roadmap structure, dependencies, submission ownership, status transitions, checkpoint linkage |
| Mentoring  | Mentor status, booking overlap, session ownership, review timing, reviewer type               |
| Community  | Anonymity, moderation status, vote uniqueness, report reason/severity, publish rules          |
| AI         | Plan validity, quota, usage tracking, month/year granularity, token aggregation               |

## 10. Gợi ý triển khai validation trong code

- DTO layer: kiểm tra shape, enum, required fields, format.
- Service layer: kiểm tra ownership, trạng thái hiện tại, quota, uniqueness ở mức nghiệp vụ.
- Guard layer: kiểm tra authentication và role.
- Schema layer: kiểm tra enum, unique index, default value và reference.
- Moderation layer: kiểm tra review/report trước khi publish hoặc resolve.

## 11. Kết luận

Workflow của nền tảng đi theo chuỗi: user onboarding -> assessment -> career matching -> roadmap học -> mentoring -> community feedback -> AI usage tracking. Điểm quan trọng nhất khi triển khai là giữ chặt validation ở ownership, status transition, enum, uniqueness, quota và moderation.
