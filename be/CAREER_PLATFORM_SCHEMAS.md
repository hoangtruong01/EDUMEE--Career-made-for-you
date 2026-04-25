# AI Career Platform - V1 Schema Documentation

## Muc tieu

Tai lieu nay mo ta **schema v1 dang ton tai va dang duoc van hanh trong codebase**, khong mo ta full target architecture chua duoc implement.

## Tong quan v1

He thong v1 xoay quanh cac cum du lieu sau:

- `users`: `User`, `UserProfile`
- `onboarding`: `OnboardingSession`
- `assessment`: `AssessmentSession`, `AssessmentQuestion`, `AssessmentAnswer`, `CareerFitResult`
- `careers`: `Career`, `CareerComparison`
- `learning`: `LearningRoadmap`, `WeeklyPlan`, `SimulationTask`, `TaskSubmission`, `Checkpoint`
- `mentoring`: `TutorProfile`, `BookingSession`, `TutoringSession`, `SessionReview`
- `community`: `CareerReview`, `ReviewVote`, `ReviewReport`
- `ai`: `AiPlan`, `AiUsageLog`
- `billing`: `UserSubscription`, `Payment`, `PaymentTransaction`

## 1. Billing v1

### `UserSubscription`

- Dai dien cho entitlement AI hien hanh cua user.
- Noi voi `User`, `AiPlan`, va co the noi voi `Payment`.
- V1 xem day la nguon su that cho premium access.

**Statuses dang dung trong code**

- `active`
- `cancelled`
- `expired`

### `Payment`

- Dai dien cho mot payment order cu the trong flow mua AI plan.
- V1 hien tai la SePay-oriented flow.
- Chua:
  - `userId`
  - `planId`
  - `billingCycle`
  - `amount`
  - `currency`
  - `provider`
  - `paymentMethod`
  - `checkoutReference`
  - `checkoutTokenHash`
  - `checkoutTokenExpiresAt`
  - `successUrl`, `errorUrl`, `cancelUrl`
  - `providerPaymentId`
  - `status`
  - `paidAt`, `refundedAt`, `failureReason`, `refundReason`

**Statuses dang dung trong code**

- `pending`
- `paid`
- `failed`
- `cancelled`
- `refunded`

### `PaymentTransaction`

- La provider event log/audit trail.
- Dung cho webhook idempotency, debug, va reconcile voi gateway.
- Khong phai finance ledger tong.

**Fields chinh**

- `paymentId`
- `eventId`
- `providerTransactionId`
- `eventType`
- `status`
- `payload`

## 2. Assessment v1

### `CareerFitResult`

- Luu ket qua fit score va recommendation nghe nghiep cho user.
- V1 da chot theo huong **append-only history**:
  - moi lan generate ket qua moi se tang `version`
  - ket qua moi nhat duoc danh dau `isLatest = true`
  - ket qua cu cua cung user duoc chuyen `isLatest = false`

**Fields bo sung can duy tri**

- `version`
- `isLatest`
- `generatedAt`
- `assessmentSessionId`

### Ghi chu v1

- Khong overwrite hoac `deleteMany` lich su ket qua cu trong flow generate moi.

## 3. Learning v1

### `LearningRoadmap`

- Roadmap hoc tap dang duoc tao va cap nhat dong bo qua API.
- Chua:
  - `userId`
  - `targetCareer`
  - `targetLevel`
  - `title`, `description`
  - `status`
  - `phases`
  - `personalization`
  - `progress`
  - `adaptations`
  - `weeklyPlans`
  - `isTemplate`, `isPublic`
  - `tags`
  - `successMetrics`

**Statuses dang dung trong code**

- `draft`
- `active`
- `paused`
- `completed`
- `abandoned`

### Ghi chu v1

- Chua co `RoadmapGenerationJob`
- Chua co `TemplateRoadmap` schema rieng
- Chua co `generationSource`, `archivedAt`, `parentRoadmapId`, `careerFitResultId` trong schema v1

## 4. Mentoring v1

### `TutorProfile`

- Ho so mentor va metadata cho availability/pricing o muc v1.

### `BookingSession`

- Ban ghi dat lich giua mentee va mentor.
- Chua scheduling details, booking request, payment metadata, communication thread va QA metadata.

### `TutoringSession`

- Ban ghi session mentoring thuc te.

### `SessionReview`

- Feedback sau session theo current capability.

### Ghi chu v1

- Chua co `MentorSchedule`
- Chua co unique compound index khoa slot nhu target production design
- Chua co ledger payout/refund rieng cho mentoring

## 5. Community v1

### `CareerReview`

- Review nghe nghiep theo context cong dong.

### `ReviewVote`

- Vote tuong tac tren review.

### `ReviewReport`

- Report/moderation trail.

## 6. Ngoai scope / Planned

Nhung schema sau **khong ton tai trong code v1 hien tai** va khong nen duoc docs mo ta nhu da support:

- `Invoice`
- `Transaction`
- `RoadmapGenerationJob`
- `TemplateRoadmap`
- `Notification`
- `MentorSchedule`

Neu can bo sung, nen xem do la phase mo rong rieng va thiet ke lai workflow/schema tuong ung.
