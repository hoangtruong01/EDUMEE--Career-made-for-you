# AI Career Consulting Platform - Schema Documentation

## Muc tieu tai lieu

Tai lieu nay mo ta schema theo **target design** cua nen tang, khong chi la anh chup cua code hien tai. Noi dung duoc viet de review nghiep vu, thiet ke API, validation, va mo rong cac flow con thieu theo huong production-ready.

Tai phien ban nay, schema da duoc cap nhat them cho:

- payment workflow cho booking le va mentor cashflow
- AI roadmap generation theo kieu async co fallback
- state machine mentoring va quan ly slot ranh cua mentor
- versioning cho `CareerFitResult` va `LearningRoadmap`
- notification va progress tracking

## Tong quan kien truc du lieu

Nen tang duoc to chuc quanh 7 cum nghiep vu chinh:

- danh tinh, xac thuc va ho so nguoi dung
- onboarding, assessment va career matching
- learning roadmap, async AI generation va progress tracking
- mentoring, availability, review va moderation
- payment, transaction, invoice, refund va payout
- cong dong va feedback
- notification va event delivery

### Cac module du lieu chinh

- `users`: `User`, `UserProfile`
- `onboarding`: `OnboardingSession`
- `assessment`: `AssessmentSession`, `AssessmentQuestion`, `AssessmentAnswer`, `CareerFitResult`
- `careers`: `Career`, `CareerComparison`
- `learning`: `LearningRoadmap`, `RoadmapGenerationJob`, `TemplateRoadmap`, `WeeklyPlan`, `SimulationTask`, `TaskSubmission`, `Checkpoint`
- `mentoring`: `TutorProfile`, `MentorSchedule`, `BookingSession`, `TutoringSession`, `SessionReview`
- `community`: `CareerReview`, `ReviewVote`, `ReviewReport`
- `ai`: `AiPlan`, `AiUsageLog`
- `billing`: `UserSubscription`, `Payment`, `PaymentTransaction`, `Transaction`, `Invoice`
- `notifications`: `Notification`

## 1. Users Module

**Muc dich:** quan ly tai khoan, xac thuc va ho so phuc vu ca nhan hoa.

### `User`

- Thuc the goc cho dang ky, dang nhap, verify email, reset password va phan quyen.
- La diem tham chieu cho gan nhu toan bo schema nghiep vu khac.

### `UserProfile`

- Ho so mo rong cho muc tieu nghe nghiep, hoc van, kinh nghiem, ky nang, budget, bio va cac preference lien quan.
- Duoc dung de ca nhan hoa onboarding, recommendation, roadmap va trai nghiem mentoring.

## 2. Onboarding Module

**Muc dich:** thu thap baseline data truoc khi user vao assessment va recommendation.

### `OnboardingSession`

- Theo doi onboarding theo tung step, progress, intent, current situation va learning preferences.
- La dau vao som nhat de xac dinh user can assessment, recommendation, learning hay mentoring.

## 3. AI Module

**Muc dich:** dinh nghia san pham AI va theo doi muc su dung AI theo chu ky.

### `AiPlan`

- Dinh nghia goi AI theo tier nhu Free, Plus, Pro.
- Chua gia, billing defaults, monthly limits va feature flags.
- Duoc dung nhu policy source cho entitlement, quota va gating tinh nang.

### `AiUsageLog`

- Ghi nhan su dung AI theo `userId`, `feature`, `month`, `year`.
- Luu request count, token usage, provider, latency, fallback source va metadata audit neu can.
- Duoc dung cho quota, billing analysis va dieu tra sai lech usage.

## 4. Billing Module

**Muc dich:** mo hinh hoa thanh toan, giao dich, refund, payout, invoice va entitlement sau thanh toan.

### `UserSubscription`

- Dai dien cho quyen su dung goi AI cua user.
- Noi voi `User` va `AiPlan`.
- Chua billing cycle, `startDate`, `endDate`, `status` va cac moc quan trong cua vong doi subscription.

**Target lifecycle:**

- `pending_payment`: da tao order nhung chua nhan thanh toan hop le
- `active`: da duoc cap entitlement
- `cancelled`: bi huy theo user hoac admin policy
- `expired`: het han ma khong gia han
- `refunded` hoac `terminated`: bi thu hoi quyen sau refund, dispute hoac manual revoke

### `Payment`

- Dai dien cho mot payment order hoac mot lan thu tien cu the.
- Thuong gan voi `userId`, `planId`, `bookingSessionId`, `billingCycle`, `amount`, `currency`, `provider`, `status`.
- La nguon su that cho viec xac dinh user da thanh toan thanh cong cho goi nao hoac booking nao.

**Target statuses:**

- `pending`
- `authorized`
- `paid`
- `failed`
- `cancelled`
- `refunded`
- `partially_refunded`

### `PaymentTransaction`

- Log chi tiet tung su kien tu payment provider.
- Luu provider transaction id, event type, raw payload, verification result, idempotency key va event status.
- Dung de webhook idempotency, audit, troubleshooting va reconcile.

### `Transaction`

- Ledger bat buoc cho moi dong tien ra vao trong he thong, khong chi cho subscription ma ca booking le, refund, payout va wallet movement.
- Co the tham chieu `userId`, `mentorId`, `paymentId`, `bookingSessionId`, `invoiceId`, `relatedTransactionId`.
- Cho phep doi soat, rollback, lich su nap/rut tien mentor, refund va finance reporting.

**Target transaction types:**

- `subscription_payment`
- `booking_payment`
- `wallet_topup`
- `wallet_withdrawal`
- `mentor_payout`
- `refund`
- `penalty`
- `adjustment`

**Target transaction statuses:**

- `pending`
- `succeeded`
- `failed`
- `reversed`
- `cancelled`

**Target fields quan trong:**

- `amount`, `currency`
- `direction`: `credit` hoac `debit`
- `balanceBefore`, `balanceAfter` neu he thong co wallet
- `sourceType`: `subscription`, `booking`, `refund`, `payout`, `manual_adjustment`
- `provider`, `providerRef`, `description`

### `Invoice`

- Chung tu billing duoc sinh sau khi payment thanh cong.
- Thuong tham chieu `userId`, `paymentId`, `bookingSessionId`, `invoiceNumber`, amount, currency, issue date, tax data, pdf url.
- Khong thay the `Payment`; no la billing artifact sau thu tien.

## 5. Assessment Module

**Muc dich:** thu thap cau tra loi va tao ket qua phu hop nghe nghiep.

### `AssessmentSession`

- Phien assessment cua mot user, gom status, progress, started/completed timestamps.
- La khung bao cua `AssessmentAnswer` va `CareerFitResult`.

### `AssessmentQuestion`

- Ngan hang cau hoi active/inactive.
- Chua noi dung cau hoi, type, dimension, option va display order.

### `AssessmentAnswer`

- Cau tra loi cua user cho tung question trong mot session.
- Duoc dung cho scoring, review va AI analysis.

### `CareerFitResult`

- Dau ra phan tich fit score, recommended careers, explanation, breakdown va recommendation metadata.
- Quan he nghiep vu la `User 1 - N CareerFitResult`, khong overwrite ket qua cu.
- Moi lan user lam lai assessment se sinh mot ban ghi moi co `createdAt`, `assessmentSessionId`, `version`, `isLatest`.
- Duoc dung lam dau vao cho `LearningRoadmap`, mentoring va lich su phat trien cua user.

## 6. Careers Module

**Muc dich:** lam catalog nghe nghiep va ho tro compare giua cac lua chon.

### `Career`

- Master data nghe nghiep: title, category, required skills, levels, market data, work style, learning path.

### `CareerComparison`

- Ban ghi user-driven compare nhieu nghe theo criteria va weights.
- Co the chua recommendation cuoi cung va user decision.

## 7. Learning Module

**Muc dich:** quan ly roadmap hoc tap, async AI generation, fallback va progress tracking.

### `LearningRoadmap`

- Roadmap tong the huong toi mot career/level muc tieu.
- Moi roadmap phai tham chieu `userId` va `careerFitResultId` de giu lich su versioning.
- Khi user lam lai assessment sau 6 thang, roadmap hien tai khong bi ghi de ma duoc chuyen sang `archived`, roadmap moi duoc tao voi `status = active`.
- Nen co `version`, `parentRoadmapId`, `generatedFrom`, `generationSource`, `archivedAt`, `archivedReason`.

**Target statuses:**

- `generating`
- `active`
- `paused`
- `archived`
- `failed`

**Target generation sources:**

- `ai`
- `template_fallback`
- `manual`

### `RoadmapGenerationJob`

- Job async cho viec sinh roadmap bang AI.
- Luu `userId`, `careerFitResultId`, `status`, `attemptCount`, `provider`, `startedAt`, `finishedAt`, `errorCode`, `errorMessage`, `estimatedWaitSeconds`.
- La noi ghi nhan UI state `processing` va cho phep retry/background worker.

**Target statuses:**

- `queued`
- `processing`
- `succeeded`
- `failed`
- `fallback_succeeded`

### `TemplateRoadmap`

- Thu vien roadmap mau cho cac career pho bien.
- Dung lam ke hoach B khi AI timeout, quota loi, provider loi hoac cost policy yeu cau fallback.
- Nen co `careerKey`, `level`, `language`, `templateVersion`, `isActive`, `tags`, `content`.

### `WeeklyPlan`

- Ke hoach hoc theo tuan duoc sinh tu roadmap.
- Nen co `completionPercentage`, `completedTaskCount`, `totalTaskCount`.

### `SimulationTask`

- Bai tap mo phong cong viec/thu thach hoc tap theo muc do va skill.
- Nen co `weight` hoac `progressPoints` de tinh tien do.

### `TaskSubmission`

- Bai nop cua user cho simulation task.
- Chua content, attempts, evaluation result va improvement suggestion.

### `Checkpoint`

- Moc danh gia dinh ky de xem user dang on-track hay can dieu chinh roadmap.

## 8. Mentoring Module

**Muc dich:** quan ly mentor, availability, booking, phien mentoring, review va moderation.

### `TutorProfile`

- Ho so mentor, expertise, pricing, availability policy, verification, rating, strike count va cac policy.
- Nen co `strikeCount`, `accountStatus`, `noShowCount`, `lastStrikeAt`.

### `MentorSchedule`

- Bang quan ly lich ranh cua mentor.
- Mentor tu dang ky slot ranh de user chi co the book cac slot da mo.
- Nen co `mentorId`, `slotId`, `startTime`, `endTime`, `timezone`, `recurrenceRule`, `status`, `capacity`.

**Target statuses:**

- `available`
- `reserved`
- `booked`
- `blocked`
- `cancelled`

### `BookingSession`

- Ban ghi dat lich giua mentee va mentor.
- Nen tham chieu `mentorScheduleId` hoac dung cap `(mentorId, startTime, endTime)` lam khoa chong dat trung.
- Chua scheduling details, booking request, payment metadata, cancel policy snapshot, refund result, reschedule history va dispute metadata.

**Target statuses:**

- `pending`
- `accepted`
- `paid`
- `ongoing`
- `completed`
- `canceled`

**Target payment statuses:**

- `unpaid`
- `paid`
- `refunded`
- `forfeited`
- `waived`

**Target indexes:**

- unique compound index tren `(mentorId, slotId)` neu dung slot model
- hoac unique compound index tren `(mentorId, startTime, endTime)` neu book truc tiep theo khoang thoi gian

### `TutoringSession`

- Phien mentoring thuc te duoc tao sau khi booking hop le.
- Chua agenda, meeting link, material, attendance, observations, progress va follow-up planning.

### `SessionReview`

- Feedback sau session, sau goi hoc hoac theo chu ky tuan.
- Nen co `reviewType`, `bookingSessionId`, `tutoringSessionId`, `weeklyPlanId`, `mentorId`, `userId`, `rating`, `comment`, `reviewWindowStart`, `reviewWindowEnd`.

**Target review types:**

- `final_course_review`
- `weekly_checkin`

**Target anti-abuse indexes:**

- unique `(userId, mentorId, bookingPackageId, reviewType)` cho review tong ket
- unique `(userId, mentorId, weeklyPlanId, reviewType)` cho review tuan

## 9. Community Module

**Muc dich:** luu review nghe nghiep, vote va report/moderation.

### `CareerReview`

- Review nghe nghiep theo huong an danh nhung van co context.

### `ReviewVote`

- Tuong tac xep hang review nhu helpful, accurate, relevant.

### `ReviewReport`

- Report vi pham va luong moderation.

## 10. Notification Module

**Muc dich:** thong bao bat dong bo cho roadmap generation, booking, refund, strike va review windows.

### `Notification`

- Ghi nhan message gui toi user hoac mentor.
- Dung cho `roadmap_processing`, `roadmap_ready`, `roadmap_fallback_used`, `booking_confirmed`, `refund_completed`, `mentor_strike`, `review_window_opened`.
- Nen co `recipientUserId`, `type`, `title`, `body`, `data`, `status`, `sentAt`, `readAt`.

## Quan he chinh giua cac module

- `User` la thuc the goc cua gan nhu moi schema nghiep vu.
- `UserProfile` va `OnboardingSession` cung cap du lieu nen cho assessment, recommendation va roadmap.
- `AssessmentSession` -> `AssessmentAnswer` -> `CareerFitResult` tao thanh chuoi phan tich nghe nghiep.
- `CareerFitResult` la quan he 1-N voi `User`, khong overwrite ket qua cu.
- `LearningRoadmap` phai tham chieu `CareerFitResult` cu the, va roadmap cu duoc archive khi roadmap moi duoc tao.
- `RoadmapGenerationJob` la khau noi giua UI, AI provider, `TemplateRoadmap`, `LearningRoadmap` va `Notification`.
- `SimulationTask` -> `TaskSubmission` -> `WeeklyPlan.completionPercentage` -> `LearningRoadmap` tao thanh progress loop lien tuc.
- `TutorProfile`, `MentorSchedule`, `BookingSession`, `TutoringSession`, `SessionReview` tao thanh mentoring lifecycle.
- `Payment` la payment order; `PaymentTransaction` la event log cua provider; `Transaction` la ledger noi bo cua he thong.
- `Payment` co the sinh `Transaction` cho booking payment, refund va mentor payout.
- `Payment` sinh `Invoice` sau khi thanh toan thanh cong.
- `Payment` thanh cong moi duoc phep kich hoat `UserSubscription`.
- `AiUsageLog` phai duoc tinh tren entitlement hop le cua `UserSubscription` hien hanh.
- `Notification` duoc tao khi roadmap generation thay doi trang thai, booking thay doi trang thai, refund xay ra, hoac review window duoc mo.

## Ky thuat va quy uoc

- Nhieu schema su dung nested object/array sau, dac biet o `Career`, `LearningRoadmap`, `WeeklyPlan`, `TemplateRoadmap`, `BookingSession`, `CareerReview`.
- `payment` domain can co unique/idempotency strategy ro rang cho `providerPaymentId`, `providerTransactionId`, `invoiceNumber`.
- `BookingSession` phai co unique compound index de tranh 2 user cung dat mot slot trong cung thoi diem.
- Neu booking yeu cau tru wallet, thao tac tao booking + tao `Transaction` + cap nhat so du phai nam trong cung mot MongoDB transaction.
- JSON tra ve tu AI de tao roadmap phai duoc validate schema truoc khi save thanh `LearningRoadmap`.
- Cac field progress nhu `completionPercentage` phai la derived field, khong cho phep client tu y set vuot 0-100.

## Implementation Gap Notes

- Code hien tai da co schema cho `Payment`, `PaymentTransaction`, `Invoice`, nhung can them `Transaction` de bao phu booking le, refund va mentor payout.
- `UserSubscription` hien da ton tai trong code, nhung activation dang theo huong admin/manual upsert thay vi bat buoc di qua payment success.
- Chua co `RoadmapGenerationJob`, `TemplateRoadmap` va `Notification` de ho tro async AI roadmap generation va fallback.
- `CareerFitResult` va `LearningRoadmap` can duoc chot quan he versioning/archive, khong overwrite ban ghi cu.
- `MentorSchedule` chua duoc mo ta ro nhu nguon slot ranh cho booking.
- `BookingSession` can state machine ro rang hon va can unique index o tang DB de xu ly concurrency.
- `TutorProfile` va `SessionReview` can them metadata cho strike/no-show, weekly review va anti-abuse rules.

## Ket luan

Target design cua he thong khong chi gom user, assessment, learning, mentoring va community, ma con can:

- payment ledger du cho subscription va booking le
- async roadmap generation co fallback va notification
- versioning/archiving de giu lich su hoc tap
- state machine va unique index de khoa logic mentoring

Tai lieu nay duoc dung lam nen cho viec mo rong codebase tu trang thai hien tai sang he thong co schema du nghiep vu de di vao workflow, validation va implementation.
