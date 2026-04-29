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
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { roadmapService } from '@/lib/roadmap.service';

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

const SORT_OPTIONS = ['Mới nhất', 'Lương cao nhất', 'Tăng trưởng cao nhất'];

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

interface CareerDiscoveryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryColor: string;
  icon: string;
  salaryMin: number;
  salaryMax: number;
  growth: number;
  demandLabel: string;
  demandStars: number;
  skills: string[];
  aiInsight: string;
}

/* ─── Career Card ─── */
const CareerCard = ({
  career,
  index,
}: {
  career: CareerDiscoveryItem;
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
        <div className="flex items-start gap-3">
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
        {career.skills.map((s: string) => (
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
        <Link href={`/career-analysis?career=${encodeURIComponent(career.title)}&from=discovery`} className="flex-1">
          <Button variant="hero" size="sm" className="w-full gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Khám phá
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
  const [careerList, setCareerList] = useState<CareerDiscoveryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { accessToken } = useAuth();

  useEffect(() => {
    const load = async () => {
      if (!accessToken) return;
      try {
        setIsLoading(true);
        const insights = await roadmapService.getDiscoveryInsights(accessToken);
        if (!Array.isArray(insights)) {
          setCareerList([]);
          return;
        }
        
        // Map backend insights to frontend UI format
        const mapped = insights.map(insight => {
          const salary = insight.analysis?.salaryRange || '20-50';
          const [minStr, maxStr] = salary.split('-').map(s => s.replace(/\D/g, ''));
          const min = parseInt(minStr) || 20;
          const max = parseInt(maxStr) || min + 20;
          
          return {
            id: insight._id,
            title: insight.careerTitle,
            description: insight.analysis?.overview || 'Thông tin chi tiết đang được cập nhật...',
            category: 'Công nghệ', 
            categoryColor: 'bg-sky-light text-primary',
            icon: '💼',
            salaryMin: min,
            salaryMax: max,
            growth: 15,
            demandLabel: insight.analysis?.demandLevel || 'Cao',
            demandStars: 4,
            skills: insight.analysis?.keySkills?.length ? insight.analysis.keySkills : ['Giao tiếp', 'Tư duy'],
            aiInsight: 'Phân tích từ cộng đồng người dùng Edumee.'
          };
        });
        
        setCareerList(mapped);
      } catch (err) {
        console.error('Failed to load discovery insights:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [accessToken]);

  const filtered = useMemo(() => {
    let list = careerList;
    if (activeCategory !== 'Tất cả') {
      list = list.filter((c) => c.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.skills.some((s: string) => s.toLowerCase().includes(q)),
      );
    }
    if (sortBy === 'Lương cao nhất') list = [...list].sort((a, b) => b.salaryMax - a.salaryMax);
    else if (sortBy === 'Tăng trưởng cao nhất')
      list = [...list].sort((a, b) => b.growth - a.growth);
    else if (sortBy === 'Mới nhất') list = [...list]; // Default order
    return list;
  }, [search, activeCategory, sortBy, careerList]);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-card">
        <div className="container py-10 text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="bg-primary/10 text-primary mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
              <TrendingUp className="h-4 w-4" /> {careerList.length}+ ngành nghề
            </span>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Khám phá nghề nghiệp</h1>
            <p className="text-muted-foreground mt-2">
              Kho thông tin nghề nghiệp được tổng hợp từ AI và cộng đồng người dùng
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
              className="bg-secondary/50 border-border w-full rounded-2xl border py-3 pr-4 pl-10 text-sm focus:ring-2 focus:ring-purple-500/20 focus:outline-hidden"
            />
          </div>
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowSort(!showSort)}
              className="rounded-2xl gap-2"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">{sortBy}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showSort ? 'rotate-180' : ''}`} />
            </Button>
            {showSort && (
              <div className="glass-card absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl py-1 shadow-2xl">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setSortBy(opt);
                      setShowSort(false);
                    }}
                    className={`hover:bg-primary/10 flex w-full items-center px-4 py-2 text-left text-sm ${
                      sortBy === opt ? 'text-primary font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Categories scroll */}
        <div className="no-scrollbar -mx-4 flex overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-all ${
                  activeCategory === cat
                    ? 'bg-primary text-white shadow-lg shadow-purple-500/20'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary border border-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Career Grid */}
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="text-primary h-10 w-10 animate-spin" />
            <p className="text-muted-foreground animate-pulse">Đang tải kho nghề nghiệp...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((career: CareerDiscoveryItem, idx: number) => (
              <CareerCard key={career.id} career={career} index={idx} />
            ))}
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border p-10 text-center">
            <Search className="text-muted-foreground mb-4 h-12 w-12 opacity-20" />
            <h3 className="text-lg font-semibold">Không tìm thấy ngành nghề</h3>
            <p className="text-muted-foreground text-sm">
              Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Specialization;
