import * as fs from 'node:fs';
import * as path from 'node:path';

import mongoose, { Model, Types } from 'mongoose';

import { Career, CareerCategory, CareerSchema } from '../src/modules/careers/schemas/career.schema';
import { SkillTag, SkillTagCategory, SkillTagSchema } from '../src/modules/careers/schemas/skill-tag.schema';

type CareerModel = Model<Career>;
type SkillTagModel = Model<SkillTag>;

interface CareerSeed {
  title: string;
  category: CareerCategory;
  industries: string[];
  technical: string[];
  soft: string[];
  description?: string;
  alternativeNames?: string[];
  tags?: string[];
}

interface RoleSeed {
  title: string;
  technical: string[];
  soft?: string[];
  description?: string;
  alternativeNames?: string[];
}

const group = (
  category: CareerCategory,
  industries: string[],
  commonTechnical: string[],
  commonSoft: string[],
  roles: RoleSeed[],
): CareerSeed[] =>
  roles.map((role) => ({
    title: role.title,
    category,
    industries,
    technical: unique([...commonTechnical, ...role.technical]),
    soft: unique([...commonSoft, ...(role.soft || [])]),
    description: role.description,
    alternativeNames: role.alternativeNames,
    tags: unique([...industries, role.title, ...(role.alternativeNames || [])]),
  }));

const CAREER_SEEDS: CareerSeed[] = [
  ...group(
    CareerCategory.TECHNOLOGY,
    ['Công nghệ thông tin', 'Phần mềm'],
    ['Git', 'Tư duy thuật toán', 'Kiểm thử phần mềm', 'Bảo mật ứng dụng'],
    ['Giải quyết vấn đề', 'Làm việc nhóm', 'Học hỏi liên tục', 'Giao tiếp kỹ thuật'],
    [
      { title: 'Lập trình viên Frontend', technical: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Responsive Design'] },
      { title: 'Lập trình viên Backend', technical: ['Node.js', 'NestJS', 'REST API', 'PostgreSQL', 'MongoDB', 'Microservices'] },
      { title: 'Lập trình viên Full-stack', technical: ['React', 'Node.js', 'API Design', 'Cơ sở dữ liệu', 'DevOps cơ bản', 'Kiến trúc web'] },
      { title: 'Lập trình viên Mobile', technical: ['React Native', 'Flutter', 'iOS', 'Android', 'Mobile UX', 'Push Notification'] },
      { title: 'Kỹ sư DevOps', technical: ['Docker', 'Kubernetes', 'CI/CD', 'Linux', 'Cloud Infrastructure', 'Monitoring'] },
      { title: 'Kỹ sư QA Automation', technical: ['Test Automation', 'Playwright', 'Cypress', 'API Testing', 'Test Plan', 'Bug Tracking'] },
      { title: 'Kỹ sư bảo mật ứng dụng', technical: ['OWASP', 'Penetration Testing', 'Secure Coding', 'Threat Modeling', 'Vulnerability Assessment'] },
      { title: 'Quản trị hệ thống', technical: ['Linux Server', 'Networking', 'Backup', 'Scripting', 'Monitoring', 'Incident Response'] },
      { title: 'Kỹ sư Cloud', technical: ['AWS', 'Azure', 'Google Cloud', 'Infrastructure as Code', 'Cloud Security', 'Cost Optimization'] },
      { title: 'Kỹ sư Blockchain', technical: ['Smart Contract', 'Solidity', 'Web3.js', 'Cryptography', 'DeFi', 'Blockchain Architecture'] },
    ],
  ),
  ...group(
    CareerCategory.SCIENCE,
    ['Dữ liệu', 'Trí tuệ nhân tạo'],
    ['Python', 'SQL', 'Thống kê', 'Trực quan hóa dữ liệu'],
    ['Tư duy phân tích', 'Kể chuyện bằng dữ liệu', 'Tò mò học hỏi', 'Tư duy phản biện'],
    [
      { title: 'Data Analyst', technical: ['Excel nâng cao', 'Power BI', 'Tableau', 'Data Cleaning', 'Dashboard'] },
      { title: 'Data Scientist', technical: ['Machine Learning', 'Pandas', 'Scikit-learn', 'Feature Engineering', 'A/B Testing'] },
      { title: 'Kỹ sư Machine Learning', technical: ['MLOps', 'TensorFlow', 'PyTorch', 'Model Deployment', 'Model Monitoring'] },
      { title: 'Kỹ sư dữ liệu', technical: ['ETL', 'Data Warehouse', 'Apache Airflow', 'Spark', 'Data Pipeline'] },
      { title: 'AI Product Specialist', technical: ['Prompt Engineering', 'AI Evaluation', 'Product Analytics', 'LLM Workflow', 'User Research'] },
      { title: 'Chuyên viên Business Intelligence', technical: ['BI Modeling', 'DAX', 'Data Mart', 'KPI Dashboard', 'Reporting'] },
      { title: 'Kỹ sư Computer Vision', technical: ['OpenCV', 'Image Processing', 'Deep Learning', 'Object Detection', 'Model Optimization'] },
      { title: 'Kỹ sư NLP', technical: ['Natural Language Processing', 'Transformer', 'Text Classification', 'Vector Database', 'RAG'] },
      { title: 'Chuyên viên phân tích rủi ro dữ liệu', technical: ['Risk Modeling', 'Fraud Detection', 'Predictive Analytics', 'Data Governance'] },
    ],
  ),
  ...group(
    CareerCategory.CREATIVE,
    ['Thiết kế', 'Sản phẩm số'],
    ['Figma', 'Design System', 'Wireframe', 'Prototype'],
    ['Đồng cảm người dùng', 'Tư duy thẩm mỹ', 'Giao tiếp trực quan', 'Tiếp nhận phản hồi'],
    [
      { title: 'UI Designer', technical: ['Visual Design', 'Typography', 'Color System', 'Component Design', 'Responsive UI'] },
      { title: 'UX Designer', technical: ['User Research', 'Information Architecture', 'Usability Testing', 'User Journey', 'Persona'] },
      { title: 'Product Designer', technical: ['Product Thinking', 'Interaction Design', 'Design Sprint', 'UX Writing', 'Analytics'] },
      { title: 'Graphic Designer', technical: ['Adobe Photoshop', 'Adobe Illustrator', 'Brand Identity', 'Layout Design', 'Print Design'] },
      { title: 'Motion Designer', technical: ['After Effects', 'Animation Principles', 'Storyboarding', 'Video Editing', 'Lottie'] },
      { title: '3D Artist', technical: ['Blender', '3D Modeling', 'Texturing', 'Lighting', 'Rendering'] },
      { title: 'Game Artist', technical: ['Concept Art', 'Sprite Design', 'Game UI', 'Asset Pipeline', 'Character Design'] },
      { title: 'UX Researcher', technical: ['Interview', 'Survey Design', 'Research Synthesis', 'Usability Lab', 'Insight Report'] },
      { title: 'Service Designer', technical: ['Service Blueprint', 'Stakeholder Map', 'Journey Mapping', 'Facilitation'] },
    ],
  ),
  ...group(
    CareerCategory.SALES_MARKETING,
    ['Marketing', 'Bán hàng'],
    ['Nghiên cứu thị trường', 'Phân tích khách hàng', 'CRM', 'Content Planning'],
    ['Thuyết phục', 'Sáng tạo', 'Giao tiếp', 'Tư duy tăng trưởng'],
    [
      { title: 'Digital Marketing Specialist', technical: ['Google Ads', 'Facebook Ads', 'SEO', 'Email Marketing', 'Marketing Analytics'] },
      { title: 'SEO Specialist', technical: ['Keyword Research', 'Technical SEO', 'On-page SEO', 'Link Building', 'Google Search Console'] },
      { title: 'Content Marketing Specialist', technical: ['Content Strategy', 'Copywriting', 'Editorial Calendar', 'Content SEO', 'Brand Voice'] },
      { title: 'Social Media Manager', technical: ['Social Strategy', 'Community Management', 'Social Analytics', 'Short-form Video', 'Campaign Planning'] },
      { title: 'Performance Marketing Specialist', technical: ['Paid Ads', 'Conversion Tracking', 'A/B Testing', 'Attribution', 'Landing Page Optimization'] },
      { title: 'Brand Manager', technical: ['Brand Strategy', 'Market Positioning', 'Campaign Management', 'Consumer Insight'] },
      { title: 'Sales Executive', technical: ['Prospecting', 'Sales Pipeline', 'Negotiation', 'Product Demo', 'Customer Follow-up'] },
      { title: 'Business Development Executive', technical: ['Partnership', 'Lead Generation', 'Market Expansion', 'Proposal Writing'] },
      { title: 'Account Manager', technical: ['Client Success', 'Stakeholder Management', 'Upsell', 'Renewal Planning'] },
      { title: 'Growth Marketer', technical: ['Growth Experiment', 'Funnel Analysis', 'Retention', 'Referral Program', 'Cohort Analysis'] },
    ],
  ),
  ...group(
    CareerCategory.BUSINESS,
    ['Kinh doanh', 'Sản phẩm', 'Vận hành'],
    ['Phân tích nghiệp vụ', 'Quản lý dự án', 'Tài liệu yêu cầu', 'KPI'],
    ['Lãnh đạo', 'Ra quyết định', 'Tư duy hệ thống', 'Quản lý stakeholder'],
    [
      { title: 'Product Manager', technical: ['Product Roadmap', 'User Story', 'Prioritization', 'Product Metrics', 'Go-to-market'] },
      { title: 'Business Analyst', technical: ['Requirement Gathering', 'BPMN', 'Use Case', 'Process Mapping', 'UAT'] },
      { title: 'Project Manager', technical: ['Agile', 'Scrum', 'Risk Management', 'Timeline Planning', 'Budget Tracking'] },
      { title: 'Operations Manager', technical: ['Process Optimization', 'SOP', 'Resource Planning', 'Vendor Management'] },
      { title: 'Strategy Analyst', technical: ['Market Sizing', 'Competitive Analysis', 'Business Case', 'Financial Modeling'] },
      { title: 'Management Consultant', technical: ['Problem Structuring', 'Slide Deck', 'Client Interview', 'Benchmarking'] },
      { title: 'Customer Success Manager', technical: ['Onboarding', 'Health Score', 'Churn Analysis', 'Customer Training'] },
      { title: 'Supply Chain Specialist', technical: ['Inventory Planning', 'Logistics', 'Procurement', 'Demand Forecasting'] },
      { title: 'E-commerce Manager', technical: ['Marketplace Operations', 'Merchandising', 'Conversion Rate', 'Promotion Planning'] },
      { title: 'Founder/Startup Operator', technical: ['Business Model', 'Fundraising', 'MVP', 'Unit Economics', 'Team Building'] },
    ],
  ),
  ...group(
    CareerCategory.FINANCE,
    ['Tài chính', 'Kế toán', 'Đầu tư'],
    ['Excel nâng cao', 'Báo cáo tài chính', 'Phân tích số liệu', 'Quản trị rủi ro'],
    ['Cẩn thận', 'Đạo đức nghề nghiệp', 'Tư duy logic', 'Giao tiếp với lãnh đạo'],
    [
      { title: 'Kế toán viên', technical: ['Hạch toán', 'Thuế', 'Sổ sách kế toán', 'MISA', 'Chuẩn mực kế toán'] },
      { title: 'Kiểm toán viên', technical: ['Audit Plan', 'Internal Control', 'Sampling', 'Audit Report', 'Compliance'] },
      { title: 'Chuyên viên phân tích tài chính', technical: ['Financial Modeling', 'Valuation', 'Budgeting', 'Forecasting', 'Ratio Analysis'] },
      { title: 'Chuyên viên đầu tư', technical: ['Portfolio Analysis', 'Equity Research', 'Due Diligence', 'Investment Memo'] },
      { title: 'Chuyên viên ngân hàng', technical: ['Credit Analysis', 'Loan Processing', 'Customer Advisory', 'Banking Products'] },
      { title: 'Chuyên viên bảo hiểm', technical: ['Risk Assessment', 'Policy Design', 'Claim Process', 'Insurance Sales'] },
      { title: 'Chuyên viên thuế', technical: ['Tax Planning', 'VAT', 'Corporate Tax', 'Tax Declaration', 'Tax Compliance'] },
      { title: 'Chuyên viên kiểm soát nội bộ', technical: ['Internal Audit', 'Control Testing', 'Process Review', 'Risk Matrix'] },
      { title: 'Chuyên viên Fintech', technical: ['Payment System', 'Digital Banking', 'Fraud Prevention', 'Product Compliance'] },
    ],
  ),
  ...group(
    CareerCategory.EDUCATION,
    ['Giáo dục', 'Đào tạo'],
    ['Thiết kế bài giảng', 'Đánh giá học tập', 'Công nghệ giáo dục', 'Quản lý lớp học'],
    ['Kiên nhẫn', 'Truyền đạt', 'Lắng nghe', 'Khích lệ học viên'],
    [
      { title: 'Giáo viên phổ thông', technical: ['Lesson Plan', 'Classroom Management', 'Assessment Rubric', 'Student Support'] },
      { title: 'Giảng viên đại học', technical: ['Academic Research', 'Curriculum Design', 'Lecture Delivery', 'Research Supervision'] },
      { title: 'Chuyên viên thiết kế học liệu', technical: ['Instructional Design', 'E-learning', 'LMS', 'Learning Objective', 'SCORM'] },
      { title: 'Trainer doanh nghiệp', technical: ['Training Needs Analysis', 'Workshop Facilitation', 'Training Evaluation', 'Coaching'] },
      { title: 'Cố vấn học tập', technical: ['Academic Advising', 'Learning Pathway', 'Student Counseling', 'Progress Tracking'] },
      { title: 'Chuyên viên EdTech', technical: ['Learning Analytics', 'Product Training', 'Digital Content', 'User Onboarding'] },
      { title: 'Giáo viên tiếng Anh', technical: ['TESOL', 'IELTS', 'Pronunciation Coaching', 'Grammar Instruction'] },
      { title: 'Tư vấn du học', technical: ['Admission Consulting', 'Essay Review', 'Visa Guidance', 'School Matching'] },
      { title: 'Quản lý trung tâm đào tạo', technical: ['Enrollment Management', 'Teacher Coordination', 'Quality Assurance', 'Parent Communication'] },
    ],
  ),
  ...group(
    CareerCategory.HEALTHCARE,
    ['Y tế', 'Chăm sóc sức khỏe'],
    ['Kiến thức y khoa', 'An toàn người bệnh', 'Hồ sơ bệnh án', 'Tuân thủ quy trình'],
    ['Đồng cảm', 'Cẩn trọng', 'Chịu áp lực', 'Giao tiếp với bệnh nhân'],
    [
      { title: 'Bác sĩ đa khoa', technical: ['Chẩn đoán lâm sàng', 'Kê đơn', 'Khám bệnh', 'Tư vấn sức khỏe'] },
      { title: 'Điều dưỡng viên', technical: ['Chăm sóc bệnh nhân', 'Theo dõi sinh hiệu', 'Tiêm truyền', 'Kiểm soát nhiễm khuẩn'] },
      { title: 'Dược sĩ', technical: ['Dược lý', 'Tư vấn thuốc', 'Quản lý nhà thuốc', 'Tương tác thuốc'] },
      { title: 'Chuyên viên xét nghiệm y học', technical: ['Xét nghiệm máu', 'Vận hành thiết bị', 'Kiểm soát chất lượng', 'An toàn sinh học'] },
      { title: 'Kỹ thuật viên hình ảnh y học', technical: ['X-quang', 'MRI', 'CT Scan', 'Chuẩn bị bệnh nhân', 'An toàn bức xạ'] },
      { title: 'Chuyên viên dinh dưỡng', technical: ['Đánh giá khẩu phần', 'Tư vấn dinh dưỡng', 'Kế hoạch ăn uống', 'Dinh dưỡng lâm sàng'] },
      { title: 'Nhà tâm lý học', technical: ['Tham vấn tâm lý', 'Đánh giá tâm lý', 'Liệu pháp nhận thức', 'Quản lý ca'] },
      { title: 'Chuyên viên vật lý trị liệu', technical: ['Phục hồi chức năng', 'Bài tập trị liệu', 'Đánh giá vận động', 'Kế hoạch điều trị'] },
      { title: 'Quản lý dịch vụ y tế', technical: ['Hospital Operations', 'Healthcare Quality', 'Patient Experience', 'Medical Compliance'] },
    ],
  ),
  ...group(
    CareerCategory.ENGINEERING,
    ['Kỹ thuật', 'Sản xuất', 'Xây dựng'],
    ['Đọc bản vẽ kỹ thuật', 'Quản lý chất lượng', 'An toàn lao động', 'Tối ưu quy trình'],
    ['Tư duy hệ thống', 'Kỷ luật', 'Làm việc hiện trường', 'Giải quyết sự cố'],
    [
      { title: 'Kỹ sư cơ khí', technical: ['CAD', 'CAM', 'Thiết kế máy', 'Gia công cơ khí', 'Bảo trì thiết bị'] },
      { title: 'Kỹ sư điện', technical: ['Mạch điện', 'PLC', 'Hệ thống điện', 'AutoCAD Electrical', 'An toàn điện'] },
      { title: 'Kỹ sư điện tử', technical: ['PCB Design', 'Embedded System', 'Sensor', 'Microcontroller', 'Signal Processing'] },
      { title: 'Kỹ sư xây dựng', technical: ['Kết cấu', 'Dự toán', 'BIM', 'Giám sát công trình', 'Vật liệu xây dựng'] },
      { title: 'Kỹ sư tự động hóa', technical: ['PLC', 'SCADA', 'Robot công nghiệp', 'Industrial IoT', 'Control System'] },
      { title: 'Kỹ sư môi trường', technical: ['Đánh giá tác động môi trường', 'Xử lý nước thải', 'Quản lý chất thải', 'ISO 14001'] },
      { title: 'Kỹ sư hóa học', technical: ['Quy trình hóa học', 'An toàn hóa chất', 'Process Design', 'Quality Control'] },
      { title: 'Kỹ sư sản xuất', technical: ['Lean Manufacturing', 'Six Sigma', 'Production Planning', 'OEE', 'Kaizen'] },
      { title: 'Kỹ sư logistics', technical: ['Warehouse Management', 'Route Optimization', 'Import Export', 'ERP', 'Freight Management'] },
      { title: 'Kỹ sư nông nghiệp', technical: ['Canh tác thông minh', 'Quản lý mùa vụ', 'IoT nông nghiệp', 'Kiểm soát chất lượng nông sản'] },
    ],
  ),
  ...group(
    CareerCategory.LEGAL,
    ['Luật', 'Tuân thủ'],
    ['Nghiên cứu pháp lý', 'Soạn thảo văn bản', 'Quản trị rủi ro pháp lý', 'Đàm phán hợp đồng'],
    ['Tư duy phản biện', 'Bảo mật thông tin', 'Lập luận', 'Cẩn trọng'],
    [
      { title: 'Luật sư doanh nghiệp', technical: ['Luật doanh nghiệp', 'M&A', 'Hợp đồng thương mại', 'Tư vấn pháp lý'] },
      { title: 'Chuyên viên pháp chế', technical: ['Legal Compliance', 'Contract Review', 'Policy Drafting', 'Corporate Governance'] },
      { title: 'Chuyên viên tuân thủ', technical: ['Compliance Program', 'Risk Assessment', 'Internal Policy', 'Audit Response'] },
      { title: 'Luật sư sở hữu trí tuệ', technical: ['Trademark', 'Copyright', 'Patent', 'IP Enforcement', 'Licensing'] },
      { title: 'Chuyên viên bảo vệ dữ liệu', technical: ['Data Privacy', 'Consent Management', 'DPIA', 'Privacy Policy', 'Incident Handling'] },
      { title: 'Công chứng viên', technical: ['Công chứng hợp đồng', 'Xác minh hồ sơ', 'Pháp lý tài sản', 'Lưu trữ chứng từ'] },
      { title: 'Thư ký pháp lý', technical: ['Legal Document', 'Case File', 'Court Procedure', 'Legal Calendar'] },
      { title: 'Chuyên viên quan hệ chính phủ', technical: ['Public Policy', 'Stakeholder Mapping', 'Regulatory Monitoring', 'Advocacy'] },
    ],
  ),
  ...group(
    CareerCategory.BUSINESS,
    ['Nhân sự', 'Vận hành con người'],
    ['HRIS', 'Chính sách nhân sự', 'Phân tích nhân sự', 'Quản trị hiệu suất'],
    ['Thấu hiểu con người', 'Bảo mật', 'Đàm phán', 'Giải quyết xung đột'],
    [
      { title: 'Chuyên viên tuyển dụng', technical: ['Sourcing', 'Interview', 'Candidate Experience', 'ATS', 'Employer Branding'] },
      { title: 'HR Business Partner', technical: ['Workforce Planning', 'Performance Review', 'Employee Relations', 'Change Management'] },
      { title: 'Chuyên viên C&B', technical: ['Payroll', 'Salary Benchmark', 'Benefit Design', 'Labor Law', 'Compensation Analysis'] },
      { title: 'Chuyên viên L&D', technical: ['Training Plan', 'Competency Framework', 'Learning Evaluation', 'Coaching Program'] },
      { title: 'People Operations Specialist', technical: ['Onboarding', 'Employee Lifecycle', 'HR Process', 'People Analytics'] },
      { title: 'Talent Management Specialist', technical: ['Succession Planning', 'Talent Review', 'Career Pathing', 'Leadership Program'] },
      { title: 'Chuyên viên văn hóa doanh nghiệp', technical: ['Engagement Survey', 'Internal Communication', 'Culture Program', 'Event Planning'] },
      { title: 'Office Manager', technical: ['Office Administration', 'Vendor Coordination', 'Facility Management', 'Budget Control'] },
    ],
  ),
  ...group(
    CareerCategory.CREATIVE,
    ['Nội dung', 'Truyền thông', 'Báo chí'],
    ['Viết nội dung', 'Biên tập', 'Kể chuyện', 'Nghiên cứu chủ đề'],
    ['Sáng tạo', 'Tò mò', 'Quản lý deadline', 'Phỏng vấn'],
    [
      { title: 'Copywriter', technical: ['Copywriting', 'Creative Brief', 'Brand Voice', 'Headline Writing', 'Campaign Idea'] },
      { title: 'Content Writer', technical: ['Blog Writing', 'SEO Content', 'Content Outline', 'Editing', 'Fact Checking'] },
      { title: 'Biên tập viên', technical: ['Editorial Planning', 'Proofreading', 'Style Guide', 'Content Quality'] },
      { title: 'Nhà báo', technical: ['News Writing', 'Interview', 'Investigative Research', 'Media Ethics'] },
      { title: 'PR Specialist', technical: ['Press Release', 'Media Relations', 'Crisis Communication', 'Event PR'] },
      { title: 'Video Producer', technical: ['Video Planning', 'Shooting', 'Premiere Pro', 'Storyboarding', 'Post-production'] },
      { title: 'Podcast Producer', technical: ['Audio Editing', 'Episode Planning', 'Guest Coordination', 'Distribution'] },
      { title: 'Community Manager', technical: ['Community Strategy', 'Moderation', 'Engagement Program', 'Feedback Loop'] },
      { title: 'Influencer Marketing Specialist', technical: ['Creator Outreach', 'Campaign Tracking', 'Briefing', 'Performance Report'] },
    ],
  ),
  ...group(
    CareerCategory.SOCIAL_SERVICES,
    ['Dịch vụ xã hội', 'Phi lợi nhuận'],
    ['Quản lý ca', 'Đánh giá nhu cầu', 'Báo cáo tác động', 'Điều phối nguồn lực'],
    ['Đồng cảm', 'Lắng nghe chủ động', 'Kiên nhẫn', 'Làm việc cộng đồng'],
    [
      { title: 'Nhân viên công tác xã hội', technical: ['Case Management', 'Community Outreach', 'Counseling Basic', 'Social Assessment'] },
      { title: 'Chuyên viên phát triển cộng đồng', technical: ['Community Mapping', 'Program Design', 'Stakeholder Engagement', 'Impact Evaluation'] },
      { title: 'Điều phối viên dự án NGO', technical: ['Grant Management', 'Project Reporting', 'Donor Communication', 'Field Coordination'] },
      { title: 'Chuyên viên gây quỹ', technical: ['Fundraising Campaign', 'Donor CRM', 'Proposal Writing', 'Partnership'] },
      { title: 'Chuyên viên CSR', technical: ['CSR Strategy', 'Sustainability Report', 'Volunteer Program', 'Impact Measurement'] },
      { title: 'Tư vấn hướng nghiệp', technical: ['Career Counseling', 'Assessment Interpretation', 'Roadmap Planning', 'Mentoring'] },
      { title: 'Chuyên viên hỗ trợ người khuyết tật', technical: ['Accessibility', 'Assistive Technology', 'Individual Support Plan', 'Advocacy'] },
      { title: 'Điều phối viên tình nguyện', technical: ['Volunteer Recruitment', 'Training Volunteer', 'Shift Planning', 'Community Event'] },
    ],
  ),
  ...group(
    CareerCategory.OTHER,
    ['Dịch vụ', 'Du lịch', 'Khách sạn'],
    ['Dịch vụ khách hàng', 'Quản lý vận hành', 'Tiêu chuẩn chất lượng', 'Xử lý khiếu nại'],
    ['Giao tiếp', 'Linh hoạt', 'Chịu áp lực', 'Tinh thần phục vụ'],
    [
      { title: 'Quản lý khách sạn', technical: ['Hotel Operations', 'Revenue Management', 'Guest Experience', 'Housekeeping Coordination'] },
      { title: 'Hướng dẫn viên du lịch', technical: ['Tour Planning', 'Storytelling', 'Destination Knowledge', 'Safety Management'] },
      { title: 'Chuyên viên tổ chức sự kiện', technical: ['Event Planning', 'Vendor Management', 'Run Sheet', 'Budgeting'] },
      { title: 'Đầu bếp', technical: ['Menu Design', 'Food Safety', 'Kitchen Operations', 'Recipe Development'] },
      { title: 'Quản lý nhà hàng', technical: ['Restaurant Operations', 'Inventory', 'Service Training', 'POS'] },
      { title: 'Tiếp viên hàng không', technical: ['Cabin Safety', 'Customer Service', 'Emergency Procedure', 'Cross-cultural Communication'] },
      { title: 'Chuyên viên chăm sóc khách hàng', technical: ['CRM', 'Ticket Handling', 'Customer Support', 'Service Recovery'] },
      { title: 'Chuyên viên bất động sản', technical: ['Property Valuation', 'Sales Negotiation', 'Legal Document', 'Market Analysis'] },
      { title: 'Chuyên viên tư vấn bảo hành', technical: ['Warranty Process', 'Technical Support', 'Customer Record', 'Escalation'] },
    ],
  ),
];

const DETAILED_CAREER_SEEDS: CareerSeed[] = [
  ...group(
    CareerCategory.TECHNOLOGY,
    ['Công nghệ thông tin', 'Phần mềm', 'Nền tảng số'],
    ['Git', 'System Design', 'Code Review', 'Testing', 'Agile'],
    ['Giải quyết vấn đề', 'Giao tiếp kỹ thuật', 'Tự học', 'Làm việc nhóm'],
    [
      { title: 'Software Engineer', alternativeNames: ['Kỹ sư phần mềm'], technical: ['Data Structures', 'Algorithms', 'Object-oriented Programming', 'API Integration', 'Debugging', 'Software Architecture'], description: 'Software Engineer thiết kế, xây dựng và bảo trì sản phẩm phần mềm, phù hợp với mentor về nền tảng lập trình, thiết kế hệ thống và quy trình phát triển sản phẩm.' },
      { title: 'Frontend React Developer', alternativeNames: ['Lập trình viên React'], technical: ['React', 'TypeScript', 'Next.js', 'State Management', 'Component Architecture', 'Frontend Performance'], description: 'Frontend React Developer xây dựng giao diện web hiện đại bằng React/Next.js, tập trung vào trải nghiệm người dùng, hiệu năng và khả năng bảo trì component.' },
      { title: 'Backend Java Developer', alternativeNames: ['Lập trình viên Java Backend'], technical: ['Java', 'Spring Boot', 'REST API', 'SQL', 'Caching', 'Microservices'], description: 'Backend Java Developer phát triển dịch vụ phía máy chủ bằng Java/Spring, phù hợp với mentoring về API, database, transaction và kiến trúc backend doanh nghiệp.' },
      { title: 'Backend .NET Developer', alternativeNames: ['Lập trình viên .NET Backend'], technical: ['C#', '.NET Core', 'Entity Framework', 'SQL Server', 'REST API', 'Authentication'], description: 'Backend .NET Developer xây dựng hệ thống backend bằng C#/.NET, thường làm việc với API, cơ sở dữ liệu, xác thực và tích hợp hệ thống.' },
      { title: 'Mobile iOS Developer', alternativeNames: ['Lập trình viên iOS'], technical: ['Swift', 'SwiftUI', 'UIKit', 'iOS Architecture', 'App Store Release', 'Mobile Testing'], description: 'Mobile iOS Developer phát triển ứng dụng iPhone/iPad, phù hợp mentor về Swift, kiến trúc mobile, tối ưu trải nghiệm và quy trình phát hành App Store.' },
      { title: 'Mobile Android Developer', alternativeNames: ['Lập trình viên Android'], technical: ['Kotlin', 'Jetpack Compose', 'Android SDK', 'Mobile Architecture', 'Google Play Release', 'Firebase'], description: 'Mobile Android Developer xây dựng ứng dụng Android bằng Kotlin/Compose, tập trung vào UI, kiến trúc ứng dụng, tích hợp dịch vụ và phát hành sản phẩm.' },
      { title: 'DevSecOps Engineer', alternativeNames: ['Kỹ sư DevSecOps'], technical: ['CI/CD Security', 'Container Security', 'SAST', 'DAST', 'Secrets Management', 'Cloud Security'], description: 'DevSecOps Engineer đưa bảo mật vào quy trình DevOps, phù hợp mentor về pipeline an toàn, kiểm thử bảo mật tự động và vận hành cloud bảo mật.' },
      { title: 'Site Reliability Engineer', alternativeNames: ['SRE'], technical: ['Observability', 'Incident Management', 'SLO/SLA', 'Kubernetes', 'Terraform', 'Reliability Engineering'], description: 'Site Reliability Engineer đảm bảo hệ thống chạy ổn định ở quy mô lớn, tập trung vào monitoring, tự động hóa, xử lý sự cố và độ tin cậy dịch vụ.' },
      { title: 'Solution Architect', alternativeNames: ['Kiến trúc sư giải pháp'], technical: ['Architecture Diagram', 'Cloud Architecture', 'Integration Design', 'Non-functional Requirements', 'Security Design', 'Cost Estimation'], description: 'Solution Architect thiết kế giải pháp kỹ thuật tổng thể, kết nối yêu cầu kinh doanh với kiến trúc hệ thống, hạ tầng và lộ trình triển khai.' },
      { title: 'Technical Support Engineer', alternativeNames: ['Kỹ sư hỗ trợ kỹ thuật'], technical: ['Troubleshooting', 'Log Analysis', 'API Debugging', 'Customer Support Tools', 'SQL Query', 'Technical Documentation'], description: 'Technical Support Engineer xử lý sự cố kỹ thuật cho khách hàng, phù hợp mentor về debug, đọc log, giao tiếp kỹ thuật và quy trình support sản phẩm.' },
    ],
  ),
  ...group(
    CareerCategory.SCIENCE,
    ['Dữ liệu', 'Trí tuệ nhân tạo', 'Phân tích định lượng'],
    ['Python', 'SQL', 'Statistics', 'Data Visualization', 'Experiment Design'],
    ['Tư duy phân tích', 'Tò mò học hỏi', 'Kể chuyện bằng dữ liệu', 'Tư duy phản biện'],
    [
      { title: 'Analytics Engineer', technical: ['dbt', 'Data Modeling', 'SQL Optimization', 'Data Warehouse', 'Metrics Layer', 'Data Quality'], description: 'Analytics Engineer xây dựng lớp dữ liệu phân tích đáng tin cậy, kết nối data engineering với business intelligence và chuẩn hóa metric cho tổ chức.' },
      { title: 'Data Engineer Cloud', technical: ['Cloud Data Platform', 'BigQuery', 'Snowflake', 'Airflow', 'Data Lake', 'Streaming Data'], description: 'Data Engineer Cloud thiết kế pipeline dữ liệu trên nền tảng cloud, xử lý batch/streaming và tối ưu kho dữ liệu cho phân tích quy mô lớn.' },
      { title: 'AI Engineer', technical: ['Machine Learning', 'Python', 'Model Serving', 'API for AI', 'Vector Search', 'Model Evaluation'], description: 'AI Engineer triển khai mô hình AI vào sản phẩm thực tế, tập trung vào tích hợp model, đánh giá chất lượng và vận hành dịch vụ AI.' },
      { title: 'Generative AI Engineer', technical: ['LLM', 'Prompt Engineering', 'RAG', 'LangChain', 'Vector Database', 'LLM Evaluation'], description: 'Generative AI Engineer xây dựng ứng dụng dùng LLM như chatbot, trợ lý tri thức và workflow tự động, phù hợp mentoring về RAG, prompt và đánh giá AI.' },
      { title: 'MLOps Engineer', technical: ['ML Pipeline', 'Model Registry', 'Feature Store', 'Model Monitoring', 'CI/CD for ML', 'Kubernetes'], description: 'MLOps Engineer chuẩn hóa vòng đời machine learning từ huấn luyện, triển khai đến giám sát model trong môi trường production.' },
      { title: 'Data Governance Specialist', technical: ['Data Catalog', 'Data Lineage', 'Data Privacy', 'Data Quality Rules', 'Master Data Management', 'Policy Design'], description: 'Data Governance Specialist quản trị dữ liệu, đảm bảo dữ liệu có chủ sở hữu, chất lượng, quyền truy cập và tuân thủ phù hợp.' },
      { title: 'Research Scientist AI', technical: ['Deep Learning Research', 'Paper Reading', 'Experiment Tracking', 'PyTorch', 'Benchmarking', 'Scientific Writing'], description: 'Research Scientist AI nghiên cứu thuật toán và mô hình mới, phù hợp mentor về đọc paper, thiết kế thí nghiệm và chuyển nghiên cứu thành prototype.' },
      { title: 'Quantitative Analyst', alternativeNames: ['Quant Analyst'], technical: ['Time Series', 'Risk Modeling', 'Python', 'R', 'Portfolio Optimization', 'Backtesting'], description: 'Quantitative Analyst dùng thống kê và lập trình để phân tích tài chính, xây dựng mô hình định lượng, kiểm thử chiến lược và quản trị rủi ro.' },
    ],
  ),
  ...group(
    CareerCategory.CREATIVE,
    ['Thiết kế', 'Sản phẩm số', 'Truyền thông thị giác'],
    ['Figma', 'Design System', 'Prototype', 'Visual Communication', 'Design Critique'],
    ['Đồng cảm người dùng', 'Tư duy thẩm mỹ', 'Tiếp nhận phản hồi', 'Giao tiếp trực quan'],
    [
      { title: 'UX/UI Designer', technical: ['User Flow', 'Wireframe', 'Responsive UI', 'Interaction Design', 'Usability Testing', 'Design Handoff'], description: 'UX/UI Designer thiết kế trải nghiệm và giao diện sản phẩm số từ luồng người dùng, wireframe đến prototype và bàn giao cho dev.' },
      { title: 'Design System Designer', technical: ['Component Library', 'Design Tokens', 'Accessibility', 'Variant Management', 'Documentation', 'Figma Variables'], description: 'Design System Designer xây dựng hệ thống component, token và guideline giúp sản phẩm nhất quán, dễ mở rộng và dễ phối hợp với engineering.' },
      { title: 'UX Writer', technical: ['Microcopy', 'Content Design', 'Information Architecture', 'Tone of Voice', 'A/B Testing Copy', 'Localization'], description: 'UX Writer tối ưu ngôn ngữ trong sản phẩm để người dùng hiểu, thao tác nhanh và cảm thấy được dẫn dắt tự nhiên.' },
      { title: 'Product Illustrator', technical: ['Illustration System', 'Vector Illustration', 'Storytelling', 'Brand Style', 'Iconography', 'Asset Export'], description: 'Product Illustrator tạo minh họa cho sản phẩm số, landing page và onboarding, giúp thương hiệu truyền đạt ý tưởng rõ ràng và có cá tính.' },
      { title: 'Brand Designer', technical: ['Brand Identity', 'Logo System', 'Typography', 'Color Palette', 'Brand Guideline', 'Campaign Visual'], description: 'Brand Designer xây dựng nhận diện thương hiệu, guideline và visual asset cho các điểm chạm truyền thông của doanh nghiệp.' },
      { title: 'Video Editor', technical: ['Premiere Pro', 'DaVinci Resolve', 'Color Grading', 'Sound Editing', 'Motion Graphics', 'Story Rhythm'], description: 'Video Editor dựng video cho marketing, giáo dục hoặc truyền thông, tập trung vào nhịp kể chuyện, âm thanh, màu sắc và hậu kỳ.' },
      { title: '3D Motion Designer', technical: ['Cinema 4D', 'Blender', 'Motion Graphics', 'Rendering', 'Simulation', 'Compositing'], description: '3D Motion Designer tạo chuyển động 3D cho quảng cáo, sản phẩm và nội dung số, kết hợp dựng hình, ánh sáng, render và compositing.' },
      { title: 'Game UI Designer', technical: ['HUD Design', 'Game UX', 'Unity UI', 'Interaction Feedback', 'Asset Slicing', 'Player Journey'], description: 'Game UI Designer thiết kế giao diện trò chơi, tối ưu luồng chơi, trạng thái phản hồi và khả năng đọc thông tin trong gameplay.' },
    ],
  ),
  ...group(
    CareerCategory.SALES_MARKETING,
    ['Marketing', 'Bán hàng', 'Tăng trưởng'],
    ['Market Research', 'Customer Insight', 'CRM', 'Campaign Planning', 'Analytics'],
    ['Thuyết phục', 'Sáng tạo', 'Giao tiếp', 'Tư duy tăng trưởng'],
    [
      { title: 'Marketing Executive', technical: ['Campaign Execution', 'Content Calendar', 'Marketing Report', 'Event Coordination', 'Email Campaign', 'Vendor Brief'], description: 'Marketing Executive triển khai hoạt động marketing đa kênh, phối hợp nội dung, sự kiện, báo cáo và đo hiệu quả chiến dịch.' },
      { title: 'Trade Marketing Specialist', technical: ['Retail Activation', 'POSM', 'Promotion Planning', 'Channel Strategy', 'Sales Data Analysis', 'Merchandising'], description: 'Trade Marketing Specialist tối ưu hoạt động marketing tại điểm bán, hỗ trợ đội sales bằng chương trình khuyến mãi, POSM và dữ liệu kênh phân phối.' },
      { title: 'CRM Marketing Specialist', technical: ['Customer Segmentation', 'Lifecycle Campaign', 'Email Automation', 'CRM Data', 'Retention Metrics', 'Personalization'], description: 'CRM Marketing Specialist dùng dữ liệu khách hàng để thiết kế chiến dịch giữ chân, chăm sóc và cá nhân hóa trải nghiệm khách hàng.' },
      { title: 'Lifecycle Marketing Specialist', technical: ['User Journey', 'Onboarding Campaign', 'Retention Strategy', 'Push Notification', 'Cohort Analysis', 'Marketing Automation'], description: 'Lifecycle Marketing Specialist tối ưu từng giai đoạn vòng đời người dùng, từ kích hoạt, giữ chân đến tái tương tác và tăng giá trị khách hàng.' },
      { title: 'Affiliate Marketing Specialist', technical: ['Affiliate Network', 'Commission Model', 'Partner Tracking', 'Campaign Attribution', 'Fraud Check', 'Performance Report'], description: 'Affiliate Marketing Specialist xây dựng kênh đối tác giới thiệu, quản lý hoa hồng, tracking và tối ưu hiệu quả doanh thu từ affiliate.' },
      { title: 'Partnership Manager', technical: ['Partner Pipeline', 'Co-marketing', 'Deal Negotiation', 'Account Planning', 'Partnership Metrics', 'Proposal Deck'], description: 'Partnership Manager phát triển quan hệ đối tác chiến lược, từ tìm kiếm cơ hội, đàm phán đến triển khai chương trình hợp tác.' },
      { title: 'Sales Operations Specialist', technical: ['Salesforce', 'Pipeline Reporting', 'Sales Process', 'Quota Tracking', 'Forecasting', 'Sales Enablement'], description: 'Sales Operations Specialist chuẩn hóa quy trình bán hàng, quản trị dữ liệu CRM, báo cáo pipeline và hỗ trợ đội sales vận hành hiệu quả.' },
      { title: 'Customer Experience Specialist', technical: ['Customer Journey Mapping', 'NPS Survey', 'VOC Program', 'Service Blueprint', 'CX Metrics', 'Complaint Analysis'], description: 'Customer Experience Specialist phân tích và cải thiện trải nghiệm khách hàng trên nhiều điểm chạm, từ khảo sát đến tối ưu quy trình dịch vụ.' },
    ],
  ),
  ...group(
    CareerCategory.BUSINESS,
    ['Kinh doanh', 'Sản phẩm', 'Vận hành'],
    ['Business Analysis', 'Project Management', 'KPI', 'Process Mapping', 'Stakeholder Management'],
    ['Tư duy hệ thống', 'Ra quyết định', 'Giao tiếp', 'Quản lý ưu tiên'],
    [
      { title: 'Product Owner', technical: ['Backlog Management', 'User Story', 'Acceptance Criteria', 'Scrum', 'Product Discovery', 'Stakeholder Alignment'], description: 'Product Owner quản lý backlog và ưu tiên phát triển sản phẩm, đảm bảo đội kỹ thuật hiểu đúng nhu cầu người dùng và mục tiêu kinh doanh.' },
      { title: 'Product Operations Specialist', technical: ['Product Process', 'Release Coordination', 'Product Analytics', 'Experiment Tracking', 'Documentation', 'Cross-functional Rituals'], description: 'Product Operations Specialist giúp đội sản phẩm vận hành trơn tru bằng quy trình, dữ liệu, tài liệu và điều phối release.' },
      { title: 'Business Operations Analyst', technical: ['Operational Dashboard', 'Process Analysis', 'SQL', 'Workflow Automation', 'Business Reporting', 'Root Cause Analysis'], description: 'Business Operations Analyst phân tích hoạt động kinh doanh, phát hiện nút thắt và đề xuất cải tiến dựa trên dữ liệu vận hành.' },
      { title: 'Revenue Operations Specialist', alternativeNames: ['RevOps Specialist'], technical: ['CRM Operations', 'Revenue Funnel', 'Sales-Marketing Alignment', 'Forecasting', 'Attribution', 'Process Automation'], description: 'Revenue Operations Specialist kết nối sales, marketing và customer success để tối ưu funnel doanh thu, dữ liệu và quy trình tăng trưởng.' },
      { title: 'Process Improvement Specialist', technical: ['Lean', 'Six Sigma', 'SOP Design', 'Process Audit', 'Change Management', 'Efficiency Metrics'], description: 'Process Improvement Specialist cải tiến quy trình nội bộ, giảm lãng phí, chuẩn hóa SOP và đo lường hiệu quả sau thay đổi.' },
      { title: 'Procurement Specialist', technical: ['Vendor Evaluation', 'Purchase Order', 'Negotiation', 'Contract Terms', 'Cost Analysis', 'Supplier Management'], description: 'Procurement Specialist quản lý mua sắm, lựa chọn nhà cung cấp, đàm phán chi phí và đảm bảo nguồn cung phù hợp nhu cầu doanh nghiệp.' },
      { title: 'Program Manager', technical: ['Program Planning', 'Dependency Management', 'Risk Register', 'Executive Reporting', 'Budget Tracking', 'Governance'], description: 'Program Manager điều phối nhiều dự án liên quan, quản trị phụ thuộc, rủi ro, ngân sách và báo cáo cho lãnh đạo.' },
      { title: 'Chief of Staff Associate', technical: ['Executive Communication', 'Strategic Planning', 'Operating Rhythm', 'Special Projects', 'Business Review', 'Decision Memo'], description: 'Chief of Staff Associate hỗ trợ lãnh đạo trong vận hành chiến lược, chuẩn bị phân tích, điều phối dự án đặc biệt và nhịp quản trị doanh nghiệp.' },
    ],
  ),
  ...group(
    CareerCategory.FINANCE,
    ['Tài chính', 'Kế toán', 'Đầu tư'],
    ['Excel nâng cao', 'Financial Reporting', 'Data Analysis', 'Risk Management', 'Business Communication'],
    ['Cẩn thận', 'Tư duy logic', 'Đạo đức nghề nghiệp', 'Giao tiếp với lãnh đạo'],
    [
      { title: 'Financial Controller', technical: ['Financial Close', 'Internal Control', 'Management Reporting', 'Accounting Policy', 'Budget Control', 'Audit Coordination'], description: 'Financial Controller quản lý báo cáo tài chính, kiểm soát nội bộ và quy trình đóng sổ để đảm bảo số liệu chính xác cho lãnh đạo.' },
      { title: 'FP&A Analyst', technical: ['Budgeting', 'Forecasting', 'Variance Analysis', 'Financial Modeling', 'Scenario Planning', 'Management Dashboard'], description: 'FP&A Analyst lập ngân sách, dự báo và phân tích chênh lệch tài chính nhằm hỗ trợ quyết định kinh doanh.' },
      { title: 'Treasury Specialist', technical: ['Cash Flow Management', 'Bank Relationship', 'Liquidity Planning', 'FX Risk', 'Payment Control', 'Treasury Report'], description: 'Treasury Specialist quản lý dòng tiền, thanh khoản, quan hệ ngân hàng và rủi ro tỷ giá cho doanh nghiệp.' },
      { title: 'Risk Analyst', technical: ['Risk Assessment', 'Risk Register', 'Quantitative Analysis', 'Control Testing', 'Scenario Analysis', 'Risk Report'], description: 'Risk Analyst nhận diện, đo lường và báo cáo rủi ro trong hoạt động kinh doanh, tài chính hoặc vận hành.' },
      { title: 'Compliance Analyst Finance', technical: ['Regulatory Compliance', 'Policy Review', 'KYC', 'AML', 'Audit Evidence', 'Compliance Monitoring'], description: 'Compliance Analyst Finance theo dõi tuân thủ trong lĩnh vực tài chính, hỗ trợ kiểm tra quy định, KYC/AML và bằng chứng audit.' },
      { title: 'Credit Risk Analyst', technical: ['Credit Scoring', 'Loan Analysis', 'Portfolio Monitoring', 'Default Risk', 'Financial Statement Analysis', 'Risk Policy'], description: 'Credit Risk Analyst đánh giá khả năng trả nợ, xây dựng chính sách tín dụng và theo dõi rủi ro danh mục cho ngân hàng hoặc fintech.' },
      { title: 'Personal Financial Advisor', technical: ['Financial Planning', 'Insurance Advisory', 'Investment Basics', 'Retirement Planning', 'Client Profiling', 'Portfolio Review'], description: 'Personal Financial Advisor tư vấn kế hoạch tài chính cá nhân, bảo hiểm, đầu tư và quản lý mục tiêu tài chính dài hạn cho khách hàng.' },
    ],
  ),
  ...group(
    CareerCategory.EDUCATION,
    ['Giáo dục', 'Đào tạo', 'EdTech'],
    ['Curriculum Design', 'Learning Assessment', 'LMS', 'Instructional Design', 'Student Support'],
    ['Kiên nhẫn', 'Truyền đạt', 'Lắng nghe', 'Khích lệ học viên'],
    [
      { title: 'Online Course Creator', technical: ['Course Outline', 'Video Lesson', 'Learning Objective', 'Quiz Design', 'Community Learning', 'Course Analytics'], description: 'Online Course Creator thiết kế và sản xuất khóa học trực tuyến, từ cấu trúc nội dung, video bài giảng đến đánh giá kết quả học viên.' },
      { title: 'STEM Teacher', technical: ['STEM Curriculum', 'Project-based Learning', 'Lab Safety', 'Scratch', 'Robotics Basic', 'Science Assessment'], description: 'STEM Teacher hướng dẫn học sinh học khoa học, công nghệ, kỹ thuật và toán qua dự án thực hành, thí nghiệm và tư duy giải quyết vấn đề.' },
      { title: 'Education Consultant', technical: ['Learning Needs Analysis', 'School Advisory', 'Education Roadmap', 'Parent Consultation', 'Program Evaluation', 'Admission Planning'], description: 'Education Consultant tư vấn lộ trình học tập, lựa chọn chương trình, trường học và kế hoạch phát triển năng lực cho học viên.' },
      { title: 'Student Success Specialist', technical: ['Student Onboarding', 'Progress Tracking', 'Learning Intervention', 'Retention Program', 'Feedback Analysis', 'Advising CRM'], description: 'Student Success Specialist theo dõi tiến độ học viên, can thiệp khi có rủi ro bỏ học và nâng cao trải nghiệm học tập.' },
      { title: 'Curriculum Developer', technical: ['Curriculum Mapping', 'Competency Framework', 'Assessment Blueprint', 'Learning Standard', 'Content Review', 'Rubric Design'], description: 'Curriculum Developer xây dựng chương trình học, chuẩn đầu ra, rubric và hệ thống đánh giá phù hợp mục tiêu đào tạo.' },
      { title: 'School Operations Manager', technical: ['Academic Operations', 'Scheduling', 'Teacher Coordination', 'Parent Communication', 'Enrollment Process', 'Quality Assurance'], description: 'School Operations Manager vận hành hoạt động học thuật và hành chính của trường hoặc trung tâm, đảm bảo lịch học, giáo viên và phụ huynh phối hợp tốt.' },
      { title: 'Learning Experience Designer', technical: ['Learner Journey', 'Workshop Design', 'Interactive Activity', 'Facilitation', 'Learning Analytics', 'Experience Prototype'], description: 'Learning Experience Designer thiết kế trải nghiệm học tập hấp dẫn, kết hợp nội dung, hoạt động, công nghệ và dữ liệu phản hồi.' },
    ],
  ),
  ...group(
    CareerCategory.HEALTHCARE,
    ['Y tế', 'Chăm sóc sức khỏe', 'Dịch vụ lâm sàng'],
    ['Hồ sơ bệnh án', 'An toàn người bệnh', 'Medical Ethics', 'Clinical Communication', 'Healthcare Quality'],
    ['Đồng cảm', 'Cẩn trọng', 'Chịu áp lực', 'Giao tiếp với bệnh nhân'],
    [
      { title: 'Bác sĩ chuyên khoa nội', technical: ['Internal Medicine', 'Clinical Diagnosis', 'Treatment Planning', 'Patient Monitoring', 'Medical Record', 'Referral Coordination'], description: 'Bác sĩ chuyên khoa nội chẩn đoán và điều trị bệnh lý nội khoa, theo dõi bệnh nhân dài hạn và phối hợp chăm sóc đa chuyên khoa.' },
      { title: 'Bác sĩ nhi khoa', technical: ['Pediatrics', 'Child Development', 'Vaccination Advisory', 'Pediatric Diagnosis', 'Parent Counseling', 'Growth Monitoring'], description: 'Bác sĩ nhi khoa chăm sóc sức khỏe trẻ em, tư vấn phụ huynh, theo dõi phát triển và xử lý bệnh lý thường gặp ở trẻ.' },
      { title: 'Điều phối viên phòng khám', technical: ['Clinic Scheduling', 'Patient Flow', 'Medical Admin', 'Insurance Coordination', 'Appointment System', 'Service Quality'], description: 'Điều phối viên phòng khám quản lý lịch hẹn, luồng bệnh nhân, hồ sơ và chất lượng dịch vụ trong môi trường phòng khám.' },
      { title: 'Health Coach', technical: ['Lifestyle Coaching', 'Habit Tracking', 'Nutrition Basics', 'Wellness Plan', 'Motivational Interviewing', 'Progress Review'], description: 'Health Coach hỗ trợ khách hàng xây dựng thói quen sống lành mạnh, theo dõi mục tiêu sức khỏe và duy trì động lực thay đổi hành vi.' },
      { title: 'Medical Sales Representative', technical: ['Medical Product Knowledge', 'Doctor Visit', 'Sales Territory', 'Regulatory Basics', 'Product Demo', 'CRM Reporting'], description: 'Medical Sales Representative tư vấn sản phẩm y tế/dược phẩm cho bác sĩ, bệnh viện hoặc nhà thuốc, kết hợp kiến thức sản phẩm và kỹ năng bán hàng.' },
      { title: 'Clinical Research Coordinator', technical: ['Clinical Trial Protocol', 'Informed Consent', 'GCP', 'Patient Recruitment', 'Data Collection', 'Study Documentation'], description: 'Clinical Research Coordinator điều phối nghiên cứu lâm sàng, quản lý hồ sơ, tuyển bệnh nhân và đảm bảo tuân thủ quy trình GCP.' },
      { title: 'Public Health Specialist', technical: ['Epidemiology', 'Health Program Design', 'Community Survey', 'Health Education', 'Monitoring Evaluation', 'Policy Brief'], description: 'Public Health Specialist thiết kế và đánh giá chương trình y tế cộng đồng, phân tích dữ liệu dịch tễ và truyền thông sức khỏe.' },
    ],
  ),
  ...group(
    CareerCategory.ENGINEERING,
    ['Kỹ thuật', 'Sản xuất', 'Công nghiệp'],
    ['Đọc bản vẽ kỹ thuật', 'Quality Control', 'Safety Standard', 'Process Optimization', 'Technical Documentation'],
    ['Kỷ luật', 'Tư duy hệ thống', 'Làm việc hiện trường', 'Giải quyết sự cố'],
    [
      { title: 'Industrial Engineer', technical: ['Work Study', 'Line Balancing', 'Lean Manufacturing', 'Time Motion Study', 'Capacity Planning', 'Layout Optimization'], description: 'Industrial Engineer tối ưu dây chuyền, năng suất và bố trí sản xuất bằng phân tích quy trình, thời gian thao tác và lean manufacturing.' },
      { title: 'Quality Engineer', technical: ['Quality Plan', 'Root Cause Analysis', 'CAPA', 'FMEA', 'SPC', 'Supplier Quality'], description: 'Quality Engineer đảm bảo chất lượng sản phẩm/quy trình qua kiểm soát lỗi, phân tích nguyên nhân, FMEA và hành động khắc phục.' },
      { title: 'Maintenance Engineer', technical: ['Preventive Maintenance', 'Equipment Troubleshooting', 'CMMS', 'Spare Parts Planning', 'Reliability Analysis', 'Safety Lockout'], description: 'Maintenance Engineer duy trì thiết bị hoạt động ổn định, lập kế hoạch bảo trì, xử lý sự cố và giảm thời gian dừng máy.' },
      { title: 'Civil Site Engineer', technical: ['Site Supervision', 'Construction Drawing', 'Quantity Takeoff', 'Method Statement', 'Safety Inspection', 'Progress Report'], description: 'Civil Site Engineer giám sát công trường xây dựng, kiểm tra bản vẽ, tiến độ, an toàn và phối hợp nhà thầu thi công.' },
      { title: 'MEP Engineer', technical: ['HVAC', 'Electrical System', 'Plumbing System', 'BIM MEP', 'Shop Drawing', 'Testing Commissioning'], description: 'MEP Engineer thiết kế hoặc giám sát hệ thống cơ điện nước của công trình, đảm bảo phối hợp kỹ thuật và nghiệm thu vận hành.' },
      { title: 'Renewable Energy Engineer', technical: ['Solar PV', 'Wind Energy', 'Energy Storage', 'Grid Connection', 'Energy Yield Analysis', 'Project Feasibility'], description: 'Renewable Energy Engineer phát triển dự án năng lượng tái tạo, tính toán sản lượng, kết nối lưới và đánh giá hiệu quả kỹ thuật.' },
      { title: 'Robotics Engineer', technical: ['Robot Programming', 'ROS', 'Automation Cell', 'Sensor Integration', 'Motion Control', 'Machine Vision'], description: 'Robotics Engineer thiết kế và lập trình hệ thống robot, tích hợp cảm biến, điều khiển chuyển động và tự động hóa công nghiệp.' },
      { title: 'Textile Engineer', technical: ['Textile Materials', 'Dyeing Process', 'Garment Production', 'Quality Testing', 'Pattern Engineering', 'Production Planning'], description: 'Textile Engineer quản lý kỹ thuật dệt may, từ vật liệu, quy trình nhuộm, sản xuất đến kiểm soát chất lượng sản phẩm.' },
    ],
  ),
  ...group(
    CareerCategory.LEGAL,
    ['Luật', 'Tuân thủ', 'Quản trị doanh nghiệp'],
    ['Legal Research', 'Contract Review', 'Policy Drafting', 'Risk Assessment', 'Regulatory Monitoring'],
    ['Cẩn trọng', 'Bảo mật thông tin', 'Lập luận', 'Tư duy phản biện'],
    [
      { title: 'Legal Operations Specialist', technical: ['Legal Tech', 'Matter Management', 'Contract Workflow', 'Legal Spend Tracking', 'Document Automation', 'Process Improvement'], description: 'Legal Operations Specialist tối ưu vận hành bộ phận pháp lý bằng quy trình, công nghệ, quản lý hợp đồng và đo lường hiệu quả.' },
      { title: 'Contract Manager', technical: ['Contract Lifecycle', 'Negotiation Support', 'Clause Library', 'Obligation Tracking', 'Vendor Contract', 'Renewal Management'], description: 'Contract Manager quản lý vòng đời hợp đồng, điều khoản, nghĩa vụ, gia hạn và phối hợp đàm phán với các bên liên quan.' },
    ],
  ),
  ...group(
    CareerCategory.SOCIAL_SERVICES,
    ['Phát triển bền vững', 'Tác động xã hội', 'ESG'],
    ['Impact Measurement', 'Stakeholder Engagement', 'Program Design', 'Report Writing', 'Policy Analysis'],
    ['Đồng cảm', 'Lắng nghe chủ động', 'Làm việc cộng đồng', 'Tư duy dài hạn'],
    [
      { title: 'ESG Specialist', technical: ['ESG Framework', 'Sustainability Reporting', 'Materiality Assessment', 'Carbon Accounting', 'Stakeholder Mapping', 'Compliance Tracking'], description: 'ESG Specialist hỗ trợ doanh nghiệp quản trị môi trường, xã hội và quản trị, lập báo cáo bền vững và theo dõi chỉ số ESG.' },
      { title: 'Sustainability Consultant', technical: ['Sustainability Strategy', 'GHG Protocol', 'Circular Economy', 'Impact Assessment', 'Workshop Facilitation', 'Roadmap Planning'], description: 'Sustainability Consultant tư vấn chiến lược phát triển bền vững, đo phát thải, thiết kế lộ trình cải thiện và triển khai chương trình tác động.' },
    ],
  ),
  ...group(
    CareerCategory.OTHER,
    ['Dịch vụ', 'Du lịch', 'Bán lẻ', 'Bất động sản'],
    ['Customer Service', 'Operations Management', 'Sales Reporting', 'Quality Standard', 'Complaint Handling'],
    ['Giao tiếp', 'Linh hoạt', 'Chịu áp lực', 'Tinh thần phục vụ'],
    [
      { title: 'Travel Consultant', technical: ['Travel Itinerary', 'Visa Basics', 'Booking System', 'Destination Advisory', 'Customer Quotation', 'Travel Insurance'], description: 'Travel Consultant tư vấn tour, lịch trình, đặt dịch vụ và hỗ trợ khách hàng chuẩn bị hồ sơ du lịch phù hợp nhu cầu.' },
      { title: 'Restaurant Supervisor', technical: ['Shift Management', 'Service Standard', 'POS', 'Inventory Check', 'Staff Training', 'Guest Recovery'], description: 'Restaurant Supervisor giám sát ca làm nhà hàng, đào tạo nhân viên, kiểm soát chất lượng phục vụ và xử lý phản hồi khách hàng.' },
      { title: 'Retail Store Manager', technical: ['Store Operations', 'Visual Merchandising', 'Sales Target', 'Inventory Control', 'Staff Scheduling', 'Customer Experience'], description: 'Retail Store Manager vận hành cửa hàng bán lẻ, quản lý nhân sự, hàng tồn, trưng bày và mục tiêu doanh số.' },
      { title: 'Real Estate Consultant', technical: ['Property Listing', 'Client Needs Analysis', 'Site Tour', 'Market Pricing', 'Negotiation', 'Legal Document Basics'], description: 'Real Estate Consultant tư vấn mua bán/thuê bất động sản, phân tích nhu cầu khách hàng, thị trường, pháp lý cơ bản và đàm phán giao dịch.' },
    ],
  ),
];

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function skillRequirement(skillName: string, importance = 4, minimumLevel = 3) {
  return { skillName, importance, minimumLevel };
}

function buildDescription(seed: CareerSeed): string {
  if (seed.description) return seed.description;
  return `${seed.title} là nghề thuộc nhóm ${seed.industries.join(', ')}, phù hợp với người muốn phát triển chuyên môn và có thể được mentor theo lộ trình thực tế.`;
}

function loadEnvFiles(): void {
  const cwd = process.cwd();
  const envFiles = ['.env', '.env.local'];
  const externallyProvidedKeys = new Set(Object.keys(process.env));

  for (const fileName of envFiles) {
    const filePath = path.join(cwd, fileName);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && !externallyProvidedKeys.has(key)) process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFiles();
  const uri = process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/edumee';
  await mongoose.connect(uri);

  const CareerModel = mongoose.model<Career>('Career', CareerSchema) as CareerModel;
  const SkillTagModel = mongoose.model<SkillTag>('SkillTag', SkillTagSchema) as SkillTagModel;
  const skillMap = new Map<
    string,
    {
      name: string;
      slug: string;
      category: SkillTagCategory;
      careerIds: Types.ObjectId[];
      careerTitles: string[];
    }
  >();

  let upsertedCareers = 0;

  const allCareerSeeds = [...CAREER_SEEDS, ...DETAILED_CAREER_SEEDS];

  for (const seed of allCareerSeeds) {
    const slug = slugify(seed.title);
    const career = await CareerModel.findOneAndUpdate(
      { slug },
      {
        $set: {
          title: seed.title,
          slug,
          description: buildDescription(seed),
          category: seed.category,
          alternativeNames: seed.alternativeNames || [],
          industries: seed.industries,
          skillRequirements: {
            technical: seed.technical.map((skill) => skillRequirement(skill)),
            soft: seed.soft.map((skill) => skillRequirement(skill, 4, 2)),
          },
          isActive: true,
          tags: unique([...(seed.tags || []), ...seed.technical, ...seed.soft]),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    upsertedCareers += 1;
    collectSkills(skillMap, career._id as Types.ObjectId, seed.title, seed.technical, 'technical');
    collectSkills(skillMap, career._id as Types.ObjectId, seed.title, seed.soft, 'soft');
  }

  for (const skill of skillMap.values()) {
    await SkillTagModel.findOneAndUpdate(
      { slug: skill.slug },
      {
        $set: {
          name: skill.name,
          slug: skill.slug,
          category: skill.category,
          careerIds: skill.careerIds,
          careerTitles: skill.careerTitles,
          isActive: true,
          usageCount: skill.careerIds.length,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();
  }

  console.log(`[seed:careers] Upserted ${upsertedCareers} careers.`);
  console.log(`[seed:careers] Upserted ${skillMap.size} skill tags.`);
}

function collectSkills(
  skillMap: Map<
    string,
    {
      name: string;
      slug: string;
      category: SkillTagCategory;
      careerIds: Types.ObjectId[];
      careerTitles: string[];
    }
  >,
  careerId: Types.ObjectId,
  careerTitle: string,
  skills: string[],
  category: SkillTagCategory,
) {
  for (const skillName of skills) {
    const slug = slugify(skillName);
    const existing = skillMap.get(slug) || {
      name: skillName,
      slug,
      category,
      careerIds: [],
      careerTitles: [],
    };

    if (!existing.careerIds.some((id) => id.equals(careerId))) {
      existing.careerIds.push(careerId);
    }
    if (!existing.careerTitles.includes(careerTitle)) {
      existing.careerTitles.push(careerTitle);
    }
    if (existing.category !== 'technical' && category === 'technical') {
      existing.category = 'technical';
    }
    skillMap.set(slug, existing);
  }
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[seed:careers] Failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
