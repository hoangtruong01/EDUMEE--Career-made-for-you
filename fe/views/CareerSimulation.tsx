'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Briefcase,
  ChevronRight,
  Clock,
  Code,
  DollarSign,
  Lightbulb,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useState } from 'react';

const careers = [
  { id: 'frontend', label: 'Frontend Developer', icon: Code },
  { id: 'ba', label: 'Business Analyst', icon: Briefcase },
  { id: 'pm', label: 'Product Manager', icon: Users },
  { id: 'data', label: 'Data Analyst', icon: TrendingUp },
];

const levels: Record<
  string,
  Array<{
    level: string;
    title: string;
    salary: string;
    years: string;
    skills: string[];
    tasks: string[];
    tips: string;
  }>
> = {
  frontend: [
    {
      level: 'Intern',
      title: 'Frontend Intern',
      salary: '3-6 triệu/tháng',
      years: '0-6 tháng',
      skills: ['HTML/CSS cơ bản', 'JavaScript cơ bản', 'Git'],
      tasks: ['Fix bug đơn giản', 'Tạo UI component', 'Học codebase'],
      tips: 'Tập trung vào basic, đọc code người khác nhiều',
    },
    {
      level: 'Junior',
      title: 'Junior Frontend Dev',
      salary: '8-15 triệu/tháng',
      years: '6 tháng - 2 năm',
      skills: ['React/Vue', 'TypeScript', 'REST APIs', 'Responsive Design'],
      tasks: ['Phát triển feature mới', 'Code review cơ bản', 'Viết unit test'],
      tips: 'Xây portfolio, đóng góp open-source',
    },
    {
      level: 'Senior',
      title: 'Senior Frontend Dev',
      salary: '25-45 triệu/tháng',
      years: '3-5 năm',
      skills: ['Architecture patterns', 'Performance optimization', 'Mentoring', 'System design'],
      tasks: ['Thiết kế architecture', 'Lead technical decisions', 'Mentor junior'],
      tips: 'Bắt đầu viết blog, nói chuyện tại meetup',
    },
    {
      level: 'Lead/Manager',
      title: 'Tech Lead / Engineering Manager',
      salary: '45-80+ triệu/tháng',
      years: '5+ năm',
      skills: ['Team leadership', 'Project management', 'Strategic thinking', 'Cross-team collab'],
      tasks: ['Định hướng kỹ thuật team', 'Hiring & onboarding', 'Align với business goals'],
      tips: 'Phát triển soft skills, đọc sách leadership',
    },
  ],
  ba: [
    {
      level: 'Intern',
      title: 'BA Intern',
      salary: '3-5 triệu/tháng',
      years: '0-6 tháng',
      skills: ['Excel cơ bản', 'Giao tiếp', 'Tư duy logic'],
      tasks: ['Viết biên bản họp', 'Thu thập yêu cầu', 'Hỗ trợ tài liệu'],
      tips: 'Luyện kỹ năng đặt câu hỏi và lắng nghe',
    },
    {
      level: 'Junior',
      title: 'Junior Business Analyst',
      salary: '10-18 triệu/tháng',
      years: '6 tháng - 2 năm',
      skills: ['SQL cơ bản', 'BPMN', 'User Story', 'Wireframe'],
      tasks: ['Phân tích yêu cầu', 'Viết BRD/SRS', 'Làm việc với dev team'],
      tips: 'Học cách vẽ process flow và viết user story',
    },
    {
      level: 'Senior',
      title: 'Senior Business Analyst',
      salary: '25-45 triệu/tháng',
      years: '3-5 năm',
      skills: ['Data analysis', 'Stakeholder management', 'Product thinking', 'Agile/Scrum'],
      tasks: ['Lead phân tích dự án', 'Tối ưu quy trình', 'Đào tạo junior BA'],
      tips: 'Phát triển tư duy sản phẩm và kỹ năng thuyết trình',
    },
    {
      level: 'Lead/Manager',
      title: 'BA Lead / PMO',
      salary: '45-70+ triệu/tháng',
      years: '5+ năm',
      skills: [
        'Strategic planning',
        'Change management',
        'Enterprise architecture',
        'Team building',
      ],
      tasks: ['Định hướng quy trình BA', 'Quản lý team BA', 'Tư vấn chiến lược IT'],
      tips: 'Học chứng chỉ CBAP, phát triển leadership',
    },
  ],
  pm: [
    {
      level: 'Intern',
      title: 'PM Intern / Associate',
      salary: '4-7 triệu/tháng',
      years: '0-6 tháng',
      skills: ['Quản lý task', 'Giao tiếp cơ bản', 'Notion/Jira'],
      tasks: ['Theo dõi timeline', 'Ghi chú meeting', 'Hỗ trợ PM chính'],
      tips: 'Học cách sử dụng công cụ quản lý dự án',
    },
    {
      level: 'Junior',
      title: 'Junior Product Manager',
      salary: '12-22 triệu/tháng',
      years: '1-2 năm',
      skills: ['Product roadmap', 'User research', 'Data-driven thinking', 'Agile'],
      tasks: ['Viết PRD', 'Ưu tiên backlog', 'Phối hợp design + dev'],
      tips: 'Đọc nhiều case study sản phẩm, học metrics',
    },
    {
      level: 'Senior',
      title: 'Senior Product Manager',
      salary: '30-55 triệu/tháng',
      years: '3-5 năm',
      skills: ['Product strategy', 'A/B testing', 'Revenue optimization', 'Cross-team leadership'],
      tasks: ['Định hướng sản phẩm', 'OKR planning', 'Stakeholder alignment'],
      tips: 'Xây dựng product sense qua mentoring và side projects',
    },
    {
      level: 'Lead/Manager',
      title: 'Head of Product / CPO',
      salary: '55-100+ triệu/tháng',
      years: '7+ năm',
      skills: ['Vision & strategy', 'P&L ownership', 'Org design', 'Board communication'],
      tasks: ['Định hướng portfolio sản phẩm', 'Tuyển dụng PM team', 'Báo cáo C-level'],
      tips: 'Tham gia community PM, đọc sách product leadership',
    },
  ],
  data: [
    {
      level: 'Intern',
      title: 'Data Intern',
      salary: '3-6 triệu/tháng',
      years: '0-6 tháng',
      skills: ['Excel nâng cao', 'SQL cơ bản', 'Thống kê'],
      tasks: ['Làm sạch dữ liệu', 'Tạo báo cáo đơn giản', 'Học query cơ bản'],
      tips: 'Bắt đầu với SQL và Excel, làm quen với dữ liệu thực',
    },
    {
      level: 'Junior',
      title: 'Junior Data Analyst',
      salary: '10-18 triệu/tháng',
      years: '6 tháng - 2 năm',
      skills: ['Python/Pandas', 'SQL nâng cao', 'Visualization (Tableau/PowerBI)', 'Statistics'],
      tasks: ['Phân tích dữ liệu kinh doanh', 'Tạo dashboard', 'A/B test analysis'],
      tips: 'Xây dựng portfolio với Kaggle và dự án cá nhân',
    },
    {
      level: 'Senior',
      title: 'Senior Data Analyst / Scientist',
      salary: '28-50 triệu/tháng',
      years: '3-5 năm',
      skills: ['Machine Learning', 'Statistical modeling', 'Big Data tools', 'Storytelling'],
      tasks: ['Xây dựng model dự đoán', 'Data strategy', 'Mentor junior analysts'],
      tips: 'Học thêm ML/AI và kỹ năng trình bày insights',
    },
    {
      level: 'Lead/Manager',
      title: 'Data Lead / Head of Analytics',
      salary: '50-90+ triệu/tháng',
      years: '5+ năm',
      skills: ['Data architecture', 'MLOps', 'Team management', 'Business acumen'],
      tasks: ['Xây dựng data culture', 'Hiring & training', 'Align data với business goals'],
      tips: 'Phát triển business sense và learn to communicate with executives',
    },
  ],
};

const CareerSimulation = () => {
  const [selectedCareer, setSelectedCareer] = useState('frontend');
  const [expandedLevel, setExpandedLevel] = useState<number | null>(0);

  const data = levels[selectedCareer];

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-card">
        <div className="container py-8">
          <h1 className="font-display mb-2 text-2xl font-bold md:text-3xl">Mô phỏng nghề nghiệp</h1>
          <p className="text-muted-foreground">Khám phá hành trình phát triển trong từng ngành</p>
        </div>
      </div>

      <div className="container mt-6 space-y-6">
        {/* Career selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {careers.map((c) => (
            <Button
              key={c.id}
              variant={selectedCareer === c.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedCareer(c.id);
                setExpandedLevel(0);
              }}
              className="flex-shrink-0 gap-2"
            >
              <c.icon className="h-4 w-4" />
              {c.label}
            </Button>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="bg-border absolute top-0 bottom-0 left-5 w-0.5" />

          <div className="space-y-4">
            {data.map((item, i) => {
              const expanded = expandedLevel === i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative"
                >
                  <button
                    onClick={() => setExpandedLevel(expanded ? null : i)}
                    className="flex w-full cursor-pointer items-start gap-4 text-left"
                  >
                    <div
                      className={`z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                        i === 0
                          ? 'bg-primary ring-primary/20 ring-4'
                          : i === 1
                            ? 'bg-mint'
                            : i === 2
                              ? 'bg-secondary'
                              : 'bg-accent'
                      }`}
                    >
                      <span className="text-primary-foreground text-xs font-bold">{i + 1}</span>
                    </div>
                    <div className="glass-card flex-1 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-muted-foreground text-xs tracking-wide uppercase">
                            {item.level}
                          </div>
                          <div className="font-semibold">{item.title}</div>
                        </div>
                        <ChevronRight
                          className={`text-muted-foreground h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                        />
                      </div>

                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="border-border mt-4 space-y-4 border-t pt-4"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="text-mint h-4 w-4" />
                              <span>{item.salary}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="text-secondary h-4 w-4" />
                              <span>{item.years}</span>
                            </div>
                          </div>

                          <div>
                            <div className="mb-2 flex items-center gap-1 text-sm font-medium">
                              <Star className="text-gold h-3 w-3" /> Kỹ năng cần có
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {item.skills.map((s) => (
                                <span
                                  key={s}
                                  className="bg-sky-light text-primary rounded-full px-2 py-1 text-xs font-medium"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="mb-2 flex items-center gap-1 text-sm font-medium">
                              <BookOpen className="text-primary h-3 w-3" /> Công việc hàng ngày
                            </div>
                            <ul className="text-muted-foreground space-y-1 text-sm">
                              {item.tasks.map((t) => (
                                <li key={t} className="flex items-center gap-2">
                                  <div className="bg-primary/40 h-1.5 w-1.5 rounded-full" />
                                  {t}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-gold-light flex items-start gap-2 rounded-lg p-3">
                            <Lightbulb className="text-gold mt-0.5 h-4 w-4 flex-shrink-0" />
                            <p className="text-sm">{item.tips}</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerSimulation;
