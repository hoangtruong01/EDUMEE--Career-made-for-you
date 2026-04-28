'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Bot,
  ChevronDown,
  Filter,
  GitCompare,
  MapPin,
  Search,
  Star,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

/* ─── Data ─── */
const CATEGORIES = [
  'Tất cả',
  'Công nghệ',
  'Dữ liệu & AI',
  'Thiết kế',
  'Marketing',
  'Y tế',
  'Pháp luật',
  'Xây dựng',
  'Quản lý sản phẩm',
];

const SORT_OPTIONS = ['Phù hợp nhất', 'Lương cao nhất', 'Tăng trưởng cao nhất'];

const careers = [
  {
    id: 'software-engineer',
    icon: '💻',
    title: 'Kỹ sư Phần mềm',
    category: 'Công nghệ',
    categoryColor: 'bg-sky-light text-primary',
    match: 92,
    description: 'Xây dựng và phát triển ứng dụng phần mềm cho web, mobile và desktop.',
    salaryMin: 25,
    salaryMax: 60,
    growth: 22,
    demandLabel: 'Rất cao',
    demandStars: 4,
    skills: ['JavaScript', 'Python', 'React', 'Node.js'],
    aiInsight: 'AI và automation sẽ thay đổi nhưng không thay thế kỹ sư phần mềm.',
    roadmap: [
      'Học căn bản: HTML/CSS, JavaScript',
      'Học lập trình nâng cao: Data structures, algorithms',
      'Thành thạo framework: React / Node.js',
      'Xây dự án thực tế và portfolio',
      'Ứng tuyển vị trí Junior/Intern',
    ],
  },
  {
    id: 'data-scientist',
    icon: '📊',
    title: 'Data Scientist',
    category: 'Dữ liệu & AI',
    categoryColor: 'bg-lavender text-secondary',
    match: 87,
    description: 'Phân tích dữ liệu lớn để tìm insight và xây dựng mô hình dự đoán.',
    salaryMin: 20,
    salaryMax: 50,
    growth: 35,
    demandLabel: 'Cao',
    demandStars: 5,
    skills: ['Python', 'SQL', 'Machine Learning', 'Statistics'],
    aiInsight: 'Nhu cầu tăng mạnh trong mọi ngành cần chuyên sâu về dữ liệu.',
    roadmap: [
      'Học Python và thống kê cơ bản',
      'Học SQL và xử lý dữ liệu',
      'Học Machine Learning cơ bản',
      'Thực hành trên dự án/competitions',
      'Xây portfolio và apply vị trí Data Analyst',
    ],
  },
  {
    id: 'ai-ml-engineer',
    icon: '🤖',
    title: 'Kỹ sư AI/ML',
    category: 'Dữ liệu & AI',
    categoryColor: 'bg-lavender text-secondary',
    match: 85,
    description: 'Xây dựng và triển khai các mô hình AI/ML cho sản phẩm thực tế.',
    salaryMin: 30,
    salaryMax: 80,
    growth: 45,
    demandLabel: 'Rất cao',
    demandStars: 5,
    skills: ['Deep Learning', 'TensorFlow', 'Python', 'Research'],
    aiInsight: 'Lĩnh vực hot nhất thập kỷ với lương tầm cao và xuất sắc.',
    roadmap: [
      'Nền tảng toán, xác suất và Python',
      'Học deep learning và frameworks (TensorFlow/PyTorch)',
      'Thực hiện research/demo models',
      'Triển khai model vào sản phẩm',
      'Chuẩn hoá CV, apply roles AI/ML Engineer',
    ],
  },
  {
    id: 'product-manager',
    icon: '🎯',
    title: 'Product Manager',
    category: 'Quản lý sản phẩm',
    categoryColor: 'bg-mint-light text-mint',
    match: 78,
    description: 'Định hướng và phát triển sản phẩm từ ý tưởng đến thị trường.',
    salaryMin: 25,
    salaryMax: 70,
    growth: 25,
    demandLabel: 'Cao',
    demandStars: 4,
    skills: ['Strategy', 'Agile', 'Data Analysis', 'Communication'],
    aiInsight: 'Vai trò không thể thiếu trong mọi công ty công nghệ.',
    roadmap: [
      'Học kỹ năng quản lý sản phẩm cơ bản',
      'Thực hành với Agile và roadmap planning',
      'Học phân tích dữ liệu để đưa quyết định',
      'Làm sản phẩm nhỏ hoặc PM-assistant',
      'Ứng tuyển Product Manager Junior',
    ],
  },
  {
    id: 'ux-ui-designer',
    icon: '🎨',
    title: 'UX/UI Designer',
    category: 'Thiết kế',
    categoryColor: 'bg-coral-light text-coral',
    match: 65,
    description: 'Thiết kế trải nghiệm người dùng và giao diện sản phẩm số.',
    salaryMin: 15,
    salaryMax: 40,
    growth: 18,
    demandLabel: 'Cao',
    demandStars: 4,
    skills: ['Figma', 'User Research', 'Prototyping', 'Design System'],
    aiInsight: 'AI tools hỗ trợ nhưng không thay thế creative thinking.',
    roadmap: [
      'Học công cụ thiết kế: Figma, Sketch',
      'Học research người dùng và prototyping',
      'Xây portfolio gồm case studies',
      'Học hệ thống design và accessibility',
      'Ứng tuyển UX/UI Designer vị trí Junior',
    ],
  },
  {
    id: 'marketing-manager',
    icon: '📣',
    title: 'Marketing Manager',
    category: 'Marketing',
    categoryColor: 'bg-gold-light text-gold',
    match: 58,
    description: 'Lên chiến lược và thực thi các chiến dịch Marketing cho doanh nghiệp.',
    salaryMin: 15,
    salaryMax: 35,
    growth: 15,
    demandLabel: 'Cao',
    demandStars: 4,
    skills: ['Digital Marketing', 'Content', 'Analytics', 'SEO/SEM'],
    aiInsight: 'Digital marketing và AI marketing đang bùng nổ tại Việt Nam.',
    roadmap: [
      'Học cơ bản Digital Marketing và content',
      'Thực hành SEO/SEM và analytics',
      'Chạy campaign thực tế và đo lường',
      'Xây case studies và kết quả',
      'Ứng tuyển Marketing roles hoặc freelancing',
    ],
  },
  {
    id: 'architect',
    icon: '🏛️',
    title: 'Kiến trúc sư',
    category: 'Xây dựng',
    categoryColor: 'bg-gold-light text-gold',
    match: 52,
    description: 'Thiết kế công trình kiến trúc từ nhà ở đến tòa nhà thương mại.',
    salaryMin: 15,
    salaryMax: 45,
    growth: 10,
    demandLabel: 'Trung bình',
    demandStars: 3,
    skills: ['AutoCAD', 'Revit', 'Thiết kế', 'BIM'],
    aiInsight: 'Sustainable architecture và smart building đang là xu hướng mới.',
    roadmap: [
      'Học AutoCAD, Revit cơ bản',
      'Thực hành thiết kế và mã hóa bản vẽ',
      'Học BIM và sustainable design',
      'Làm thực tập hoặc dự án hợp tác',
      'Apply vị trí kiến trúc sư junior',
    ],
  },
  {
    id: 'doctor',
    icon: '🩺',
    title: 'Bác sĩ',
    category: 'Y tế',
    categoryColor: 'bg-mint-light text-mint',
    match: 45,
    description: 'Chăm sóc và điều trị sức khỏe cho bệnh nhân tại các cơ sở y tế.',
    salaryMin: 20,
    salaryMax: 100,
    growth: 12,
    demandLabel: 'Rất cao',
    demandStars: 5,
    skills: ['Y học', 'Chẩn đoán', 'Phẫu thuật', 'Giao tiếp'],
    aiInsight: 'AI hỗ trợ chẩn đoán nhưng bác sĩ là nền tảng không thể thay thế.',
    roadmap: [
      'Hoàn thành chương trình y khoa cơ bản',
      'Thực tập lâm sàng và chuyên ngành',
      'Học kỹ năng giao tiếp và chẩn đoán',
      'Tham gia đào tạo specialist nếu cần',
      'Ứng tuyển/residency hoặc công tác tại bệnh viện',
    ],
  },
  {
    id: 'lawyer',
    icon: '⚖️',
    title: 'Luật sư',
    category: 'Pháp luật',
    categoryColor: 'bg-sky-light text-primary',
    match: 40,
    description: 'Tư vấn pháp lý và bảo vệ quyền lợi cho khách hàng và doanh nghiệp.',
    salaryMin: 15,
    salaryMax: 80,
    growth: 8,
    demandLabel: 'Trung bình',
    demandStars: 3,
    skills: ['Luật pháp', 'Nghiên cứu', 'Tranh tụng', 'Tư vấn'],
    aiInsight: 'Legal tech và AI đang thay đổi cách ngành luật vận hành.',
    roadmap: [
      'Hoàn thiện nền tảng luật cơ bản',
      'Thực hành nghiên cứu và soạn thảo',
      'Học kỹ năng tranh tụng và tư vấn',
      'Thực tập tại firm hoặc in-house',
      'Apply vị trí junior lawyer / counsel',
    ],
  },
];

type Career = (typeof careers)[number];

/* ─── Stars component ─── */
const Stars = ({ count }: { count: number }) => (
  <span className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i <= count ? 'fill-gold text-gold' : 'fill-muted text-muted'}`}
      />
    ))}
  </span>
);

/* ─── Career Card ─── */
const CareerCard = ({
  career,
  index,
}: {
  career: (typeof careers)[0];
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="glass-card flex flex-col overflow-hidden rounded-2xl"
  >
    {/* Gradient top strip */}
    <div className="h-1 w-full bg-linear-to-r from-violet-500 to-purple-600" />

    <div className="flex flex-1 flex-col p-5">
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="bg-muted flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl">
            {career.icon}
          </span>
          <div>
            <p className="font-display leading-tight font-semibold">{career.title}</p>
            <span
              className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${career.categoryColor}`}
            >
              {career.category}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">{career.description}</p>

      {/* Salary + Growth */}
      <div className="mb-3 flex items-center gap-4 text-sm">
        <span className="text-foreground flex items-center gap-1 font-medium">
          <span className="text-mint">$</span>
          {career.salaryMin}–{career.salaryMax} triệu
        </span>
        <span className="text-mint flex items-center gap-1 font-medium">
          <TrendingUp className="h-3.5 w-3.5" />+{career.growth}%
        </span>
      </div>

      {/* Demand */}
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Nhu cầu:</span>
        <span className="font-medium">{career.demandLabel}</span>
        <Stars count={career.demandStars} />
      </div>

      {/* Skills */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {career.skills.map((s) => (
          <span key={s} className="bg-sky-light text-primary rounded-full px-2.5 py-0.5 text-xs">
            {s}
          </span>
        ))}
      </div>

      {/* AI insight */}
      <div className="bg-primary/5 mb-4 flex items-start gap-2 rounded-xl p-2.5">
        <Bot className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p className="text-muted-foreground text-xs">{career.aiInsight}</p>
      </div>

      {/* Buttons */}
      <div className="mt-auto flex gap-2">
        <Link href={`/career-analysis?career=${encodeURIComponent(career.title)}`} className="flex-1">
          <Button variant="hero" size="sm" className="w-full gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Lộ trình
          </Button>
        </Link>
        <Link href="/career-compare">
          <Button variant="outline" size="sm" className="gap-1.5">
            <GitCompare className="h-3.5 w-3.5" /> So sánh
          </Button>
        </Link>
      </div>
    </div>
  </motion.div>
);

/* ─── Main view ─── */
const Specialization = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [showSort, setShowSort] = useState(false);
  const router = useRouter();

  const filtered = useMemo(() => {
    let list = careers;
    if (activeCategory !== 'Tất cả') {
      list = list.filter((c) => c.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.skills.some((s) => s.toLowerCase().includes(q)),
      );
    }
    if (sortBy === 'Lương cao nhất') list = [...list].sort((a, b) => b.salaryMax - a.salaryMax);
    else if (sortBy === 'Tăng trưởng cao nhất')
      list = [...list].sort((a, b) => b.growth - a.growth);
    else list = [...list].sort((a, b) => b.salaryMax - a.salaryMax);
    return list;
  }, [search, activeCategory, sortBy]);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-card">
        <div className="container py-10 text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="bg-primary/10 text-primary mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
              <TrendingUp className="h-4 w-4" /> 200+ ngành nghề
            </span>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Khám phá nghề nghiệp</h1>
            <p className="text-muted-foreground mt-2">
              Tìm hiểu chi tiết về lương, kỹ năng và xu hướng của từng ngành
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mt-6 space-y-5">
        {/* Search + Sort */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm nghề..."
              className="border-input bg-background focus:ring-ring h-10 w-full rounded-xl border pr-4 pl-9 text-sm outline-none focus:ring-2"
            />
          </div>
          <Button variant="outline" size="sm" className="hidden shrink-0 gap-1.5 sm:flex">
            <Filter className="h-4 w-4" /> Lọc
          </Button>
          <div className="relative shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowSort((v) => !v)}
            >
              <span className="hidden sm:inline">Sắp xếp: {sortBy}</span>
              <span className="sm:hidden">{sortBy.split(' ')[0]}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
            {showSort && (
              <div className="border-border bg-background absolute right-0 z-10 mt-1 w-52 rounded-xl border shadow-lg">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setSortBy(opt);
                      setShowSort(false);
                    }}
                    className={`hover:bg-muted w-full px-4 py-2.5 text-left text-sm ${sortBy === opt ? 'text-primary font-semibold' : ''}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Career grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((career, i) => (
              <CareerCard key={career.id} career={career} index={i} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">Không tìm thấy nghề phù hợp. Thử từ khóa khác.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Specialization;
