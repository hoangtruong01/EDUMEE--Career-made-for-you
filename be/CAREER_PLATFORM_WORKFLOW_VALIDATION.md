# AI Career Consulting Platform - Workflow and Validation

## Muc tieu

Tai lieu nay mo ta **target workflow** cua nen tang theo huong production-ready. No khong chi mo ta CRUD, ma mo ta luong nghiep vu, validation, state transition, concurrency control, async processing va failure case quan trong.

Tai phien ban nay, workflow da duoc cap nhat de bao phu:

- payment workflow cho subscription va booking le
- async AI roadmap generation co thong bao, timeout policy va fallback
- state machine ro rang cho mentoring
- versioning cho assessment result va roadmap sau 6 thang
- concurrency khi 2 user cung book 1 slot
- mentor availability, refund, penalty, progress tracking va anti-abuse review

## Cach doc tai lieu

Moi module duoi day duoc mo ta theo mau:

- Workflow: luong nghiep vu chinh
- Input: du lieu dau vao can co
- Validation: cac rule bat buoc truoc khi ghi du lieu hoac chuyen trang thai
- Output: du lieu/trang thai mong doi sau khi xu ly
- Failure cases: loi thuong gap va edge case can chan

## Nguyen tac chung

- Moi du lieu gan voi user phai check ownership.
- Moi status phai di theo state machine, khong nhay coc.
- Moi enum, amount, currency, time range va reference phai duoc validate.
- Moi thao tac co external callback phai co idempotency.
- Moi thao tac cap entitlement phai dua tren payment da verify.
- Moi thao tac co usage limit phai check quota tren subscription con hieu luc.
- Moi workflow AI lau phai tach thanh async job, khong block request/response theo kieu sync lau.
- Moi JSON do AI tra ve phai validate schema truoc khi ghi database.
- Moi thao tac booking co lien quan den slot, wallet hoac payment phai co DB-level protection, khong chi dua vao if-check o service.
- Khong duoc overwrite `CareerFitResult` va `LearningRoadmap` cu; he thong phai giu lich su versioning.

## 1. User Workflow

### 1.1 Workflow

1. User gui request dang ky.
2. He thong tao `User` o trang thai ban dau.
3. User verify email de duoc kich hoat.
4. User cap nhat `UserProfile`.
5. He thong gan role va mo cac flow tiep theo.

### 1.2 Input

- Email
- Password va password confirmation
- Name, phone, avatar neu co
- Profile basics nhu gender, education level, career goal, skills

### 1.3 Validation

- Email dung format va unique.
- Password dat policy.
- Password confirmation khop password.
- Role va verify status hop le theo enum.
- Profile enums va list fields phai dung schema.

### 1.4 Output

- `User` hop le
- `UserProfile` co the duoc tao/cap nhat theo tung buoc

### 1.5 Failure cases

- Email da ton tai
- Password yeu
- Role invalid
- User chua verify nhung goi API can permission cao hon

## 2. Onboarding Workflow

### 2.1 Workflow

1. Tao `OnboardingSession` cho user moi hoac user chua hoan tat onboarding.
2. User di qua tung step dung thu tu.
3. He thong thu thap intent, background, learning preference, career preference.
4. Session duoc danh dau complete khi du baseline data.

### 2.2 Input

- `userId`
- Step hien tai
- Du lieu cho tung step

### 2.3 Validation

- Session phai thuoc dung user.
- Khong tao trung active onboarding session neu he thong chi cho mot session dang mo.
- Chi cho di tiep dung thu tu step.
- `progressPercentage` nam trong 0-100.
- Cac field nhu intent, urgency, preferences dung enum/format.

### 2.4 Output

- Mot onboarding session co tien trinh ro rang
- Baseline data cho assessment va recommendation

### 2.5 Failure cases

- Sai ownership
- Thieu du lieu step bat buoc
- Bo qua step trung gian

## 3. Assessment Workflow

### 3.1 Workflow

1. Tao `AssessmentSession`.
2. Lay danh sach `AssessmentQuestion` dang active.
3. User tra loi tung cau hoi hoac bulk submit.
4. He thong luu `AssessmentAnswer`.
5. Khi hoan tat, session dong va sinh `CareerFitResult` moi.
6. `CareerFitResult` moi duoc gan `createdAt`, `version` va danh dau la ket qua moi nhat.

### 3.2 Input

- `sessionId`
- `questionId`
- `answer`
- `userId`
- Metadata neu can

### 3.3 Validation

- Session ton tai va thuoc user.
- Question ton tai va dang active.
- Answer dung format ma question yeu cau.
- Cac lien ket `questionId`, `sessionId`, `userId` phai khop nhau.
- Khong cho submit sau khi session da complete.
- Neu assessment ton quota theo plan, phai check quota truoc khi tao session hoac chot ket qua.
- Khong overwrite `CareerFitResult` cu; moi lan submit xong phai sinh record moi.

### 3.4 Output

- Session dong dung trang thai
- Tap answer hoan chinh
- `CareerFitResult` moi san sang cho recommendation hoac roadmap

### 3.5 Failure cases

- Answer khong thuoc session
- Session da complete nhung van submit
- Answer sai enum/kieu du lieu
- Fit score hoac result mapping vuot rule cho phep

## 4. Careers Workflow

### 4.1 Workflow

1. He thong luu `Career` nhu master catalog.
2. User xem career details.
3. User tao `CareerComparison`.
4. User chon huong di de vao roadmap hoac mentoring.

### 4.2 Input

- Career master data
- Danh sach career can compare
- Criteria va weights

### 4.3 Validation

- Career phai co identifier/title hop le.
- Category, level, skill requirement, market info dung type.
- `CareerComparison` thuoc user.
- Danh sach career compare phai ton tai.
- Weights hop le va khong am.
- Neu comparison la AI-assisted thi phai check quota truoc khi generate ket qua AI.

### 4.4 Output

- Career catalog nhat quan
- Ket qua compare co the dung de ra quyet dinh

### 4.5 Failure cases

- Compare voi career khong ton tai
- Weights sai
- User khong du quota cho AI comparison

## 5. Learning Workflow

### 5.1 Async Roadmap Generation Workflow

1. User bam nut tao roadmap.
2. API tra ve nhanh voi trang thai `processing`, khong cho user ngoi doi ket qua trong mot request sync.
3. He thong tao `RoadmapGenerationJob` o trang thai `queued` hoac `processing`.
4. He thong tao hoac cap nhat `LearningRoadmap` tam o trang thai `generating`.
5. UI hien thong diep dang xu ly. Muc tieu UX:
   - request tao roadmap tra ve trong vong 1-2 giay
   - background generation thuong ky vong 10-60 giay
   - neu provider khong tra loi trong 10 giay thi xem la timeout cho lane AI truc tiep
6. Worker goi AI provider de sinh JSON roadmap.
7. He thong validate JSON roadmap theo schema bat buoc truoc khi luu database.
8. Neu JSON hop le:
   - tao `WeeklyPlan`, `SimulationTask`, `Checkpoint`
   - cap nhat `LearningRoadmap.status = active`
   - cap nhat `RoadmapGenerationJob.status = succeeded`
   - tao `Notification` loai `roadmap_ready`
9. Neu AI loi, timeout, het quota provider hoac cost policy khong cho phep:
   - tim `TemplateRoadmap` phu hop nhat
   - tao `LearningRoadmap` moi voi `generationSource = template_fallback`
   - cap nhat `RoadmapGenerationJob.status = fallback_succeeded`
   - tao `Notification` loai `roadmap_fallback_used`
10. Neu ca AI va fallback deu that bai:
   - `RoadmapGenerationJob.status = failed`
   - `LearningRoadmap.status = failed`
   - tao thong bao that bai va cho phep retry

### 5.2 Input

- `userId`
- `careerFitResultId`
- Career muc tieu
- Target level
- Prompt context, preference, language
- Submission content cho task neu co

### 5.3 Validation

- Roadmap phai co user, career muc tieu, target level hop le.
- `careerFitResultId` phai thuoc user va phai la ket qua hop le.
- Khong duoc tao 2 roadmap `active` cung luc cho cung mot user neu nghiep vu quy dinh chi co 1 roadmap hien hanh.
- JSON AI tra ve phai validate:
  - dung root object
  - co phase, milestone, weekly plan, task structure hop le
  - enum, date, duration, dependency dung format
  - khong co circular dependency
- `TemplateRoadmap` fallback phai map duoc career/level phu hop.
- Neu roadmap, simulation hoac AI feedback co quota thi phai check quota truoc khi xep job.

### 5.4 Output

- `RoadmapGenerationJob` co vong doi ro rang
- `LearningRoadmap` duoc tao theo AI hoac fallback
- User nhan duoc thong bao khi roadmap san sang

### 5.5 Failure cases

- AI tra JSON sai format
- Job treo qua lau nhung khong timeout
- Provider loi nhung khong co fallback
- Tao nhieu roadmap `active` cho cung mot user
- Ghi roadmap xong nhung quyen truy cap cua user khong khop `careerFitResultId`

### 5.6 Assessment Retake and Roadmap Versioning

1. Sau 6 thang, user co the lam lai assessment.
2. Moi lan lam lai se sinh `CareerFitResult` moi, khong overwrite ban ghi cu.
3. He thong tim `LearningRoadmap` hien tai cua user.
4. Neu roadmap cu dang `active`, he thong chuyen no sang `archived`.
5. He thong tao roadmap moi dua tren `CareerFitResult` moi nhat.
6. Tao thong bao cho user rang roadmap da duoc cap nhat va roadmap cu van nam trong lich su.

### 5.7 Validation

- `CareerFitResult` la quan he 1-N voi `User`.
- Chi co toi da 1 `LearningRoadmap` o trang thai `active` cho moi user tai mot thoi diem, neu nghiep vu khong ho tro song song.
- `LearningRoadmap` cu phai duoc archive truoc khi roadmap moi active.
- Moi roadmap phai tham chieu dung `careerFitResultId`.

### 5.8 Progress Tracking Workflow

1. User danh dau `SimulationTask` da hoan thanh.
2. Backend cap nhat `TaskSubmission` hoac task state.
3. He thong tinh lai `WeeklyPlan.completionPercentage`.
4. He thong tinh lai `LearningRoadmap.completionPercentage` tu tat ca `WeeklyPlan`.
5. Neu dat nguong milestone, he thong mo `Checkpoint` hoac notification tiep theo.

### 5.9 Validation

- Khong cho client tu gui truc tiep `% complete` cua roadmap.
- `% complete` phai la field derive tu task/weekly plan.
- Task phai thuoc roadmap cua dung user.
- Cong thuc tinh progress phai nhat quan va idempotent.

## 6. Mentoring Workflow

### 6.1 Mentor Availability Management

1. Mentor tao `TutorProfile`.
2. Mentor tao `MentorSchedule` bang cach dang ky slot ranh theo khung gio.
3. He thong publish chi cac slot `available`.
4. User chi co the chon slot ton tai trong `MentorSchedule`.
5. Khi booking duoc tao, slot duoc chuyen sang `reserved` hoac `booked`.

### 6.2 Input

- Mentor profile data
- `MentorSchedule`: `mentorId`, `startTime`, `endTime`, `timezone`, recurrence rule neu co
- Booking request: topic, slot, platform, duration, notes
- Payment info neu booking tra phi
- Session details
- Review rating va feedback

### 6.3 Validation

- `TutorProfile` co owner va thong tin chuyen mon hop le.
- Mentor phai active truoc khi mo slot.
- Slot phai co `startTime < endTime`.
- Slot khong duoc overlap voi slot da `booked` hoac `blocked`.
- User khong duoc dat slot ngoai `MentorSchedule`.

### 6.4 Booking State Machine

`pending -> accepted -> paid -> ongoing -> completed`

Trang thai `canceled` co the di tu:

- `pending`
- `accepted`
- `paid`

Rule bo sung:

- Neu booking mien phi, backend van giu enum thong nhat bang cach auto-transition `accepted -> paid` trong cung mot giao dich.
- `ongoing` chi duoc set khi den thoi diem session va co attendance/start action hop le.
- `completed` chi duoc set sau khi co attendance hoac xac nhan ket thuc.

### 6.5 Booking Workflow

1. User chon slot tu `MentorSchedule`.
2. He thong tao `BookingSession` o trang thai `pending`.
3. Mentor chap nhan booking -> `accepted`.
4. Neu session co phi:
   - tao `Payment`
   - tao `Transaction` loai `booking_payment`
   - sau khi thanh toan thanh cong -> `paid`
5. Neu session mien phi -> auto `paid`.
6. Den lich hoc -> `ongoing`.
7. Ket thuc buoi hoc -> `completed`.
8. Sau khi complete, mo cua so review neu nghiep vu cho phep.

### 6.6 Concurrency and Double Booking Protection

1. Khong chi check overlap trong code; DB phai khoa conflict bang unique compound index.
2. Dung mot trong hai chien luoc:
   - unique `(mentorId, slotId)`
   - hoac unique `(mentorId, startTime, endTime)`
3. Khi User A va User B cung book cung slot trong cung thoi diem:
   - request insert cua nguoi den truoc se thanh cong
   - request con lai se bi DB tra `E11000 duplicate key`
4. Service layer phai `try...catch` loi `E11000` va tra ve thong diep frontend:
   - `Rat tiec, lich nay vua duoc nguoi khac dat truoc ban vai giay`
5. Neu workflow co wallet debit hoac pre-hold:
   - tao booking
   - tru vi
   - tao `Transaction`
   tat ca phai nam trong cung mot MongoDB transaction
6. Neu insert booking that bai vi duplicate key, toan bo wallet debit/pending transaction phai rollback.

### 6.7 Validation

- Mentor phai active truoc khi nhan booking.
- Booking phai co slot, time, topic, format hop le.
- Booking phai thuoc dung mentee khi sua/huy.
- Khong cho chuyen trang thai sai thu tu state machine.
- Neu booking co gia > 0:
  - `paymentStatus` phai la `paid` hoac `waived` truoc khi vao `ongoing`
  - amount, currency, session price phai khop pricing rule
  - `Transaction` bat buoc phai duoc ghi cho payment, refund, payout neu co
- `TutoringSession` chi duoc tao tu booking hop le va dung status.

### 6.8 Refund and Penalty Workflow

1. User huy lich truoc 24h:
   - tao `Transaction` loai `refund`
   - hoan 100% ve vi hoac payment method theo policy
   - `BookingSession.status = canceled`
2. User huy lich duoi 2h:
   - khong refund
   - `BookingSession.status = canceled`
   - co the ghi `Transaction` loai `penalty` hoac `forfeited`
3. Mentor no-show:
   - hoan 100% cho user
   - tang `TutorProfile.strikeCount`
   - tao `Notification` cho mentor va user
4. Neu mentor dat 3 strikes:
   - chuyen `TutorProfile.accountStatus = suspended` hoac `locked`

### 6.9 Validation

- Refund chi hop le khi booking dang `accepted` hoac `paid`, chua `completed`.
- Muc refund phai dua tren moc thoi gian so voi `startTime`.
- Moi refund/no-show deu phai co `Transaction` audit trail.
- Strike count phai tang idempotent, tranh double-penalty neu webhook hay admin action lap lai.

### 6.10 Review and Rating Workflow

**Cach 1 - Review tong ket theo khoa/goi mentoring**

1. Chi mo review khi toan bo goi hoc hoac lo trinh mentor da `completed`.
2. Moi user chi duoc tao 1 review tong ket duy nhat cho 1 mentor/goi hoc.

**Cach 2 - Review dinh ky hang tuan**

1. He thong mo review window vao cuoi moi tuan.
2. Review window ton tai trong 3 ngay ke tu ngay cuoi tuan.
3. User chi duoc submit neu da tham gia it nhat 1 session trong tuan do.

### 6.11 Validation

- Review tong ket chi duoc tao sau `completed`.
- Weekly check-in phai co `weeklyPlanId` hoac period marker hop le.
- Het review window thi tu dong khoa submit.
- Enforce uniqueness:
  - 1 review tong ket / user / mentor / goi hoc
  - 1 review tuan / user / mentor / week

### 6.12 Failure cases

- Mentor chua active nhung van duoc book
- Slot da bi nguoi khac dat truoc
- Session tra phi nhung chua thanh toan ma van vao `ongoing`
- Refund nham policy
- Mentor no-show nhung khong bi tang strike
- User spam review ngoai window cho phep

## 7. Community Workflow

### 7.1 Workflow

1. User tao `CareerReview` an danh.
2. Review qua moderation neu required.
3. Review duoc publish hoac reject.
4. User khac vote bang `ReviewVote`.
5. Co the tao `ReviewReport`.

### 7.2 Input

- Review content
- Category/context
- Rating
- Vote/report data neu co

### 7.3 Validation

- Review phai du do dai toi thieu va dung category.
- `anonymousId` phai nhat quan.
- Rating dung thang diem.
- Vote uniqueness neu schema dat rule.
- Report phai co reason, severity, status hop le.
- Admin phai ghi nhan decision moderation.

### 7.4 Output

- Review publishable
- Vote ranking signal
- Report moderation trail

### 7.5 Failure cases

- Review qua ngan
- Vote trung
- Report thieu reason/severity
- Review bi reject nhung van bi lo ra public

## 8. Payment Workflow

### 8.1 Subscription Payment Workflow

1. User chon `AiPlan` va billing cycle.
2. He thong tao `Payment` o trang thai `pending`.
3. He thong tao checkout session, payment link, transfer instruction hoac provider order.
4. User thanh toan qua provider.
5. He thong nhan callback/webhook.
6. He thong verify signature/payload va ghi `PaymentTransaction`.
7. Neu thanh toan thanh cong:
   - `Payment` -> `paid`
   - tao `Transaction` loai `subscription_payment`
   - tao hoac cap nhat `UserSubscription`
   - sinh `Invoice`
8. Neu thanh toan that bai:
   - `Payment` -> `failed` hoac `cancelled`
   - khong cap entitlement
9. Neu refund:
   - cap nhat `Payment`
   - ghi them `PaymentTransaction`
   - tao `Transaction` loai `refund`
   - xu ly entitlement theo refund policy

### 8.2 Booking Payment and Mentor Cashflow Workflow

1. Khi booking co phi, he thong tao `Payment` gan voi `bookingSessionId`.
2. Sau payment success, he thong tao `Transaction` loai `booking_payment`.
3. Neu co huy lich hoac no-show, he thong tao `Transaction` loai `refund` hoac `penalty`.
4. Khi doi soat doanh thu mentor, he thong tao `Transaction` loai `mentor_payout`.
5. Moi giao dich tien ra vao deu phai tra cuu duoc tu ledger `Transaction`.

### 8.3 Input

- `userId`
- `planId` hoac `bookingSessionId`
- `billingCycle`
- `provider`
- Amount/currency resolved tu plan pricing hoac mentor pricing
- Provider callback payload

### 8.4 Validation

- `AiPlan` hoac `BookingSession` ton tai va hop le.
- Amount, currency, billing cycle phai khop cau hinh gia cua plan hoac mentor pricing.
- Khong cho client tu y set amount final neu server la source of truth.
- `Payment` phai unique theo provider payment id hoac order id strategy.
- Callback/webhook phai duoc verify chu ky/secret.
- Event provider phai duoc xu ly idempotent.
- Khong duoc activate subscription hai lan cho cung mot payment.
- `Transaction` phai duoc tao cho moi dong tien quan trong.
- Invoice number phai unique.
- Refund chi hop le khi payment da `paid` va dung policy.

### 8.5 Output

- `Payment` co status chinh xac
- `PaymentTransaction` luu event audit trail
- `Transaction` luu finance ledger cho payment, refund, payout
- `UserSubscription` duoc kich hoat sau payment success
- `Invoice` duoc phat hanh sau thanh toan hop le

### 8.6 Failure cases

- Invalid callback signature
- Duplicate webhook
- Payment success nhung activate subscription that bai
- Payment bi danh dau paid nhung amount mismatch
- Refund request khong hop le
- Co dong tien thuc te nhung khong co `Transaction` de doi soat

## 9. Subscription and AI Entitlement Workflow

### 9.1 Workflow

1. He thong resolve subscription hien hanh cua user.
2. Kiem tra subscription status va validity window.
3. Load `AiPlan` gan voi subscription, hoac fallback Free plan neu nghiep vu cho phep.
4. Khi user goi mot tinh nang AI:
   - check feature flag
   - check monthly quota
   - thuc thi logic AI
   - ghi `AiUsageLog`
5. Khi subscription bi cancel, expire hoac refund:
   - entitlement phai duoc dieu chinh theo policy
   - user co the mat quyen premium va quay ve Free plan

### 9.2 Input

- `userId`
- Subscription hien hanh
- Feature AI can goi
- Thoi diem hien tai
- Usage metadata

### 9.3 Validation

- Subscription phai ton tai hoac fallback rule phai ro rang.
- Subscription `active` khong duoc vuot `endDate`.
- Feature flag phai duoc bat trong `AiPlan`.
- Quota phai tinh theo month/year dung quy tac.
- Consumption phai atomic hoac duoc bao ve tranh double count.
- Sau refund/toan bo huy, khong duoc tiep tuc grant premium entitlement neu policy khong cho.

### 9.4 Output

- User chi dung duoc tinh nang AI khi con entitlement hop le
- `AiUsageLog` phuc vu audit va billing analysis

### 9.5 Failure cases

- Subscription het han nhung van duoc xem la active
- Quota duoc check tren stale subscription data
- Double consume usage
- User goi feature khong nam trong plan

## 10. Notification Workflow

### 10.1 Workflow

1. Background workflow tao `Notification` khi co event quan trong.
2. Notification duoc gui cho user hoac mentor qua in-app, email hoac push.
3. User doc notification va he thong cap nhat `readAt`.

### 10.2 Events bat buoc co thong bao

- roadmap generation dang xu ly
- roadmap san sang
- fallback template da duoc dung
- booking duoc chap nhan
- refund hoan tat
- mentor bi strike
- review window mo

### 10.3 Validation

- Notification phai gan dung recipient.
- Event phai idempotent, tranh gui nhieu lan cung mot noi dung.
- Notification type phai map duoc voi ngu can nhan va deep-link data.

## 11. Validation Matrix

| Flow | Chinh can validate |
| --- | --- |
| User | Email, password, role, verify status, profile enums, uniqueness |
| Onboarding | Ownership, step order, progress, intent enums, forward-only transition |
| Assessment | Question existence, answer format, session ownership, score range, session status, khong overwrite result cu |
| Careers | Career identity, comparison ownership, list validity, weights, AI comparison quota neu co |
| Learning | Async job status, AI JSON schema, fallback rule, single active roadmap, versioning, progress derivation |
| Mentoring | Mentor status, slot ownership, unique compound index, booking state machine, payment-before-ongoing, refund policy, strike policy, review timing |
| Community | Anonymity, moderation status, vote uniqueness, report reason/severity, publish rules |
| Payment | Plan/booking validity, amount consistency, provider verification, idempotency, transaction ledger completeness, invoice uniqueness |
| Subscription/AI | Subscription validity window, entitlement resolution, feature flags, quota tracking, usage aggregation |
| Notification | Recipient, event idempotency, delivery status, read status |

## 12. Goi y implement validation trong code

- DTO layer: validate shape, enum, required fields, format.
- Service layer: ownership, state machine, quota, pricing, uniqueness o muc nghiep vu.
- Guard layer: authentication va role.
- Schema layer: enum, unique index, default value, references.
- Billing/provider integration layer: callback verification, idempotency, reconcile.
- Worker/background layer: async roadmap job, timeout, retry, fallback.
- Moderation layer: review/report gating.

## 13. Current Code Divergence

- Code hien tai da co `Payment`, `PaymentTransaction`, `Invoice` schema nhung workflow cho `Transaction` ledger tong va booking payment/refund/payout can duoc bo sung ro hon.
- `UserSubscription` hien dang co the duoc tao theo admin/manual flow thay vi bat buoc di qua payment success.
- AI workflow hien tai can bo sung async `RoadmapGenerationJob`, JSON schema validation truoc save, timeout/fallback policy va notification.
- `CareerFitResult` va `LearningRoadmap` can duoc chot logic versioning/archive, khong overwrite ban ghi cu.
- `MentorSchedule`, DB-level unique index cho booking, refund/strike flow va anti-abuse review window chua duoc mo ta day du trong code/workflow hien tai.

## Ket luan

Target workflow dung cua nen tang la:

`user -> onboarding -> assessment -> career matching -> async roadmap generation -> progress tracking -> mentoring -> community`

va voi billing:

`user -> payment -> transaction ledger -> subscription or booking entitlement -> refund/payout/reconcile`

Neu muon san pham van hanh dung nghiep vu, workflow khong the chi dung o muc happy path. Cac luong async, concurrency, refund, archive history va anti-abuse phai duoc xem la bat buoc ngay tu luc thiet ke tai lieu.
