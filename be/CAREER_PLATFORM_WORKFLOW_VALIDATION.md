# AI Career Platform - V1 Workflow Validation

## Muc tieu

Tai lieu nay mo ta **workflow v1 dang duoc codebase ho tro thuc te**. Muc tieu cua ban nay la giam do lech giua docs va code, khong mo ta target architecture lon hon nhung chua implement.

## Nguyen tac v1

- Moi thao tac theo user phai check ownership hoac admin override.
- Moi entitlement AI phai dua tren `UserSubscription` con hieu luc.
- Billing v1 chi dung:
  - `Payment`
  - `PaymentTransaction`
  - `UserSubscription`
- Learning roadmap v1 la **sync CRUD**, khong co worker async, fallback template, notification hay background job.
- Mentoring v1 chi dung cac model hien co:
  - `TutorProfile`
  - `BookingSession`
  - `TutoringSession`
  - `SessionReview`

## 1. User va Subscription

### Workflow

1. User dang ky, xac thuc, cap nhat profile.
2. User su dung tinh nang AI dua tren plan hien hanh.
3. `UserSubscription` la nguon su that cho entitlement.

### Validation

- Email unique, password hop le, role hop le.
- `UserSubscription` phai thuoc user.
- Subscription chi duoc xem la premium khi status con hieu luc.

### Luu y v1

- Co endpoint admin de manual override subscription.
- Endpoint nay la **backoffice/emergency tool**, khong phai happy path nghiep vu.

## 2. Assessment va Career Fit

### Workflow

1. User tra loi assessment.
2. He thong sinh `CareerFitResult`.
3. Moi lan generate ket qua moi:
   - khong xoa lich su cu
   - tang `version`
   - danh dau ket qua moi la `isLatest = true`
   - cac ket qua cu cua user duoc chuyen `isLatest = false`

### Validation

- Session va answer phai thuoc user.
- Khong cho submit answer vao session da dong.
- Ket qua AI moi khong duoc overwrite lich su cu.

### Failure cases

- User khong co answer de generate analysis.
- Answer khong hop le.
- Generate xong nhung khong cap nhat latest/version nhat quan.

## 3. Learning Roadmap

### Workflow

1. User tao roadmap dong bo qua API.
2. Backend check AI plan/quota roi tao `LearningRoadmap` ngay trong request.
3. User cap nhat progress, phase, adaptation tren roadmap cua chinh minh.

### Validation

- Roadmap phai thuoc user hoac admin.
- User thuong khong duoc doc/sua/xoa roadmap cua nguoi khac.
- `completionPercentage` va progress la du lieu he thong quan ly, khong phai workflow async.

### Luu y v1

- Khong co `RoadmapGenerationJob`.
- Khong co `TemplateRoadmap` schema rieng.
- Khong co fallback template/notification/timeout policy trong v1.

## 4. Mentoring

### Workflow

1. Mentor co `TutorProfile`.
2. User tao `BookingSession`.
3. He thong theo doi booking, session thuc te va review.

### Validation

- Booking phai co mentor, mentee, scheduling details va session type hop le.
- Ownership booking/session/review phai duoc enforce o service/controller.

### Gioi han v1

- Chua co `MentorSchedule` schema rieng.
- Chua co DB-level slot locking theo unique compound index.
- Chua co wallet/ledger cashflow/payout/refund engine day du.
- Trang thai booking la v1 business metadata, chua phai state machine production-grade.

## 5. Billing v1

### Subscription Payment Workflow

1. User chon `AiPlan` va billing cycle.
2. Backend tao `Payment` o trang thai `pending`.
3. Backend tao SePay checkout flow.
4. User thanh toan tren SePay.
5. Backend nhan IPN hoac sync lai gateway.
6. Backend verify payload va ghi `PaymentTransaction`.
7. Neu thanh toan thanh cong:
   - `Payment.status = paid`
   - kich hoat `UserSubscription`
8. Neu that bai hoac huy:
   - `Payment.status = failed` hoac `cancelled`
   - khong cap entitlement
9. Neu refund:
   - cap nhat `Payment`
   - ghi them `PaymentTransaction`
   - thu hoi entitlement theo policy hien co

### Validation

- Server la source of truth cho amount va currency.
- Provider callback phai verify secret/signature.
- Event gateway phai xu ly idempotent.
- Khong kich hoat subscription 2 lan cho cung mot payment.
- Neu user da co `subscription active` thi khong tao order mua moi.
- Neu user da co `payment pending` co the reuse thi khong tao payment moi.

### Luu y v1

- Billing v1 **khong co**:
  - `Invoice`
  - `Transaction` finance ledger tong
  - booking payment/refund/payout ledger
- `PaymentTransaction` chi la event log/audit trail cua provider, khong phai ledger noi bo.

## 6. AI Entitlement va Quota

### Workflow

1. He thong resolve plan cua user tu `UserSubscription`, neu khong co thi dung free plan/fallback policy hien co.
2. Kiem tra feature flag va quota.
3. Ghi `AiUsageLog` khi consume tinh nang AI.

### Validation

- Subscription phai hop le trong validity window.
- Quota phai check truoc khi consume.
- User khong duoc dung feature khong nam trong plan.

## 7. Community

### Workflow

1. User tao `CareerReview`.
2. User khac vote hoac report.
3. Admin/moderation xu ly report neu can.

### Validation

- Review phai co ownership.
- Vote uniqueness phai duoc enforce.
- Report phai co ly do hop le.

## 8. Ngoai scope / Planned

Nhung muc sau **khong phai workflow v1 hien tai**:

- `Invoice`
- `Transaction` finance ledger tong
- `RoadmapGenerationJob`
- `TemplateRoadmap`
- `Notification`
- `MentorSchedule`
- Mentor payout / booking cashflow engine
- Async roadmap generation, timeout, fallback, queue worker

Neu can implement cac muc tren, can xem do la phase mo rong moi, khong coi nhu codebase hien tai da support.
