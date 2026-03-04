# AI Career Consulting Platform - Database Schema Documentation

## Tổng quan dự án

Hệ thống AI tư vấn nghề nghiệp toàn diện hỗ trợ người dùng từ việc khám phá bản thân đến phát triển nghề nghiệp thông qua 6 flow chính:

1. **Onboarding & Assessment** - Đăng nhập và đánh giá đầu vào
2. **Career Analysis** - Phân tích và gợi ý nghề nghiệp phù hợp  
3. **Learning Path** - Lộ trình học và mô phỏng theo cấp độ
4. **Career Comparison** - So sánh và lựa chọn nghề nghiệp
5. **Mentoring** - Kết nối và tương tác với mentor
6. **Community** - Đánh giá và chia sẻ kinh nghiệm ẩn danh

## Cấu trúc Module Database

### 📊 1. Assessment Module
**Mục đích:** Đánh giá tính cách, năng lực, sở thích của người dùng

#### Schemas:
- **`AssessmentSession`** - Phiên đánh giá tổng thể
  - Lưu trữ tiến trình và kết quả đánh giá
  - Hỗ trợ nhiều loại assessment: personality, interests, skills, aptitude
  - Tracking thời gian và metadata của phiên

- **`AssessmentQuestion`** - Câu hỏi đánh giá
  - Hỗ trợ nhiều format: multiple choice, likert scale, ranking, scenario-based
  - Phân loại theo dimensions (Big 5, Holland codes, skills)
  - Multilingual support và weight scoring

- **`AssessmentAnswer`** - Câu trả lời người dùng
  - Lưu raw data và calculated scores
  - Response time tracking cho behavior analysis
  - Confidence và metadata tracking

- **`CareerFitResult`** - Kết quả phân tích phù hợp nghề nghiệp
  - Career recommendations với fit scores và confidence
  - Detailed breakdown: personality, interest, skill, aptitude match
  - Skill gaps analysis và improvement roadmap
  - AI explanation và user feedback

### 🎯 2. Careers Module
**Mục đích:** Quản lý thông tin nghề nghiệp và so sánh

#### Schemas:
- **`Career`** - Thông tin nghề nghiệp chi tiết
  - Comprehensive career information: description, skills, progression
  - Market info: demand, growth projection, automation risk
  - Education pathways và work environment details
  - Real-world context và salary information

- **`CareerComparison`** - So sánh nghề nghiệp
  - User-selected criteria với custom weights
  - Detailed scoring system cho từng criteria
  - Pros/cons analysis và recommendation engine
  - User decision tracking và alternative options

### 📚 3. Learning Module  
**Mục đích:** Lộ trình học tập và mô phỏng công việc theo chu kỳ

#### Schemas:
- **`SimulationTask`** - Nhiệm vụ mô phỏng công việc
  - Task content với materials và instructions
  - Evaluation rubric và skills assessment
  - Real-world context và industry examples
  - AI evaluation configuration

- **`TaskSubmission`** - Bài nộp và đánh giá
  - File uploads và content submission
  - Time tracking và attempt management
  - AI + Human evaluation results
  - Recommendations và improvement suggestions

- **`LearningRoadmap`** - Lộ trình học cá nhân hóa
  - Phase-based structure với milestones
  - Personalization based on assessment results
  - Progress tracking và skill development
  - Adaptive learning với content adjustments

- **`WeeklyPlan`** - Kế hoạch học hàng tuần
  - Detailed weekly scheduling và goals
  - Activity management với dependencies
  - Progress tracking và adaptation
  - User feedback và next week preparation

- **`Checkpoint`** - Điểm đánh giá định kỳ
  - Regular progress evaluation
  - Challenges identification và solutions
  - Roadmap adjustments recommendations
  - AI analysis và mentor input

### 👨‍🏫 4. Mentoring Module
**Mục đích:** Hệ thống mentoring và tư vấn 1-1

#### Schemas:
- **`TutorProfile`** - Hồ sơ mentor/gia sư
  - Professional background và expertise
  - Availability và pricing information
  - Performance metrics và ratings
  - Verification và credential management

- **`BookingSession`** - Quản lý đặt lịch
  - Session scheduling và meeting details
  - Booking request với topics và materials
  - Payment processing và communication thread
  - Rescheduling history và quality assurance

- **`TutoringSession`** - Phiên mentoring thực tế
  - Session execution với agenda tracking
  - Content sharing và progress assessment
  - Mentor observations và recommendations
  - Integration với learning roadmap

- **`SessionReview`** - Đánh giá phiên mentoring
  - Comprehensive feedback từ cả 2 bên
  - Detailed ratings theo nhiều criteria
  - Impact assessment và future recommendations
  - Authenticity verification và moderation

### 🏛️ 5. Community Module
**Mục đích:** Community review nghề nghiệp ẩn danh

#### Schemas:
- **`CareerReview`** - Đánh giá nghề nghiệp ẩn danh
  - Anonymous but contextual reviewer information
  - Comprehensive review content với ratings
  - Career journey details và practical insights
  - Education path recommendations
  - Quality metrics và authenticity measures

- **`ReviewVote`** - Voting system cho reviews
  - Vote types: helpful, accurate, relevant
  - Voter context cho weight calculation
  - Anti-spam measures và quality indicators

- **`ReviewReport`** - Báo cáo vi phạm
  - Multiple report reasons và severity levels
  - Detailed investigation workflow
  - Resolution tracking và appeal process
  - Analytics để improve moderation

### 🚀 6. Onboarding Module  
**Mục đích:** Onboarding người dùng mới và thu thập baseline

#### Schemas:
- **`OnboardingSession`** - Phiên onboarding
  - Step-by-step progress tracking
  - User intent và goal identification
  - Baseline data collection
  - Feature education và initial recommendations
  - Experience feedback và technical metrics

## Tính năng nổi bật của hệ thống

### 🔄 Loop-based Learning
- Weekly planning với adaptive adjustments
- Regular checkpoints với AI analysis
- Continuous roadmap optimization

### 🎭 Anonymous Community  
- Privacy-preserving career insights
- Quality-based reputation system
- Comprehensive moderation workflow

### 🤖 AI Integration
- Assessment scoring và career matching
- Automated evaluation với rubrics
- Personalized recommendations
- Performance analytics

### 📈 Progressive Learning
- Level-based simulation (Intern → Junior → Manager)
- Skill gap identification và closure tracking
- Real-world context integration

### 🔗 Integrated Ecosystem
- Cross-module data relationships
- Unified user journey tracking  
- Comprehensive analytics pipeline

## Sử dụng và triển khai

### Database Indexes
Mỗi schema đều có indexes được tối ưu cho:
- User-centric queries
- Status và progress tracking  
- Time-based analytics
- Search và filtering

### Scalability Considerations
- Flexible schema design cho future expansion
- Proper referencing giữa collections
- Efficient querying patterns
- Analytics-friendly structure

### Data Privacy
- Anonymous identifier system
- Sensitive data handling
- GDPR compliance ready
- Audit trail capabilities

## Kết luận

Hệ thống schema này cung cấp foundation vững chắc cho một platform AI career consulting toàn diện, hỗ trợ từ assessment đầu vào đến career development thông qua learning, mentoring và community engagement.