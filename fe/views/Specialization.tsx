'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { dashboardService } from '@/lib/dashboard.service';
import { CareerInsight, roadmapService } from '@/lib/roadmap.service';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  ChevronDown,
  Filter,
  GitCompare,
  Loader2,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

/* ─── Data Cấu Hình ─── */
const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Tất cả', icon: '🌈' },
  { value: 'technology', label: 'Công nghệ', icon: '💻' },
  { value: 'healthcare', label: 'Y tế', icon: '🏥' },
  { value: 'finance', label: 'Tài chính', icon: '💰' },
  { value: 'education', label: 'Giáo dục', icon: '🎓' },
  { value: 'creative', label: 'Sáng tạo', icon: '🎨' },
  { value: 'business', label: 'Kinh doanh', icon: '📊' },
  { value: 'engineering', label: 'Kỹ thuật', icon: '⚙️' },
  { value: 'science', label: 'Khoa học', icon: '🧪' },
  { value: 'legal', label: 'Pháp luật', icon: '⚖️' },
  { value: 'sales_marketing', label: 'Marketing & Sales', icon: '📈' },
  { value: 'social_services', label: 'Dịch vụ xã hội', icon: '🤝' },
  { value: 'other', label: 'Khác', icon: '✨' },
];

const CATEGORY_LABELS = CATEGORY_OPTIONS.reduce(
  (acc, item) => {
    if (item.value !== 'all') acc[item.value] = item.label;
    return acc;
  },
  {} as Record<string, string>,
);

const SORT_OPTIONS = ['Mới nhất', 'Lương cao nhất', 'Tăng trưởng cao nhất'];

const DEMAND_CONFIG: Record<
  string,
  { label: string; stars: number; growth: number; color: string }
> = {
  low: { label: 'Thấp', stars: 2, growth: 5, color: 'text-muted-foreground' },
  medium: { label: 'Trung bình', stars: 3, growth: 10, color: 'text-blue-500' },
  high: { label: 'Cao', stars: 4, growth: 15, color: 'text-orange-500' },
  very_high: { label: 'Rất cao', stars: 5, growth: 20, color: 'text-red-500' },
};

const normalizeCategory = (value?: string) => {
  if (!value) return 'other';
  return value.trim().toLowerCase().replace(/\s+/g, '_');
};

const toMillions = (value: number) => (value >= 1000 ? Math.round(value / 1000000) : value);

const parseSalaryRange = (raw?: string) => {
  if (!raw) return { min: null, max: null, text: 'Chưa cập nhật' };
  const matches = raw.match(/\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length < 2) {
    return { min: null, max: null, text: raw };
  }
  const values = matches
    .map((value) => parseFloat(value.replace(/,/g, '.')))
    .filter((value) => !Number.isNaN(value));
  if (values.length < 2) {
    return { min: null, max: null, text: raw };
  }
  const min = toMillions(Math.min(values[0], values[1]));
  const max = toMillions(Math.max(values[0], values[1]));
  return { min, max, text: `${min}–${max} triệu` };
};

/* ─── Sub-Components ─── */
function Stars({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= count ? 'fill-gold text-gold' : 'fill-muted text-muted opacity-30'}`}
        />
      ))}
    </span>
  );
}

interface CareerDiscoveryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  icon: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryText: string;
  growth: number;
  demandLabel: string;
  demandStars: number;
  demandColor: string;
  skills: string[];
  aiInsight: string;
  lastUpdated: number;
}

interface CareerCardProps {
  career: CareerDiscoveryItem;
  index: number;
  onExplore: (id: string, title: string, url: string) => Promise<void>;
}

function CareerCard({ career, index, onExplore }: CareerCardProps) {
  const targetUrl = `/career-analysis?career=${encodeURIComponent(career.title)}&from=discovery`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="bento-card-v2 group flex flex-col"
    >
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-primary/20 group-hover:bg-primary/40 absolute inset-0 animate-pulse rounded-2xl blur-xl transition-all" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl shadow-inner backdrop-blur-md">
                {career.icon}
              </span>
            </div>
            <div>
              <h3 className="font-display group-hover:text-primary line-clamp-1 text-lg font-bold tracking-tight transition-colors">
                {career.title}
              </h3>
              <span className="tag-pill mt-1">{career.categoryLabel}</span>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground mb-5 line-clamp-2 text-sm leading-relaxed">
          {career.description}
        </p>

        <div className="mb-5 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/5 p-3 backdrop-blur-sm transition-colors group-hover:bg-white/10">
            <p className="text-muted-foreground mb-1 text-[10px] font-bold tracking-wider uppercase">
              Mức lương
            </p>
            <div className="flex items-center gap-1.5">
              <Zap className="text-mint h-4 w-4" />
              <span className="font-display text-mint font-bold">{career.salaryText}</span>
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 p-3 backdrop-blur-sm transition-colors group-hover:bg-white/10">
            <p className="text-muted-foreground mb-1 text-[10px] font-bold tracking-wider uppercase">
              Tăng trưởng
            </p>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="text-primary h-4 w-4" />
              <span className="font-display text-primary font-bold">+{career.growth}%</span>
            </div>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between rounded-xl bg-white/5 px-4 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className={`h-4 w-4 ${career.demandColor}`} />
            <span className={`text-sm font-bold ${career.demandColor}`}>{career.demandLabel}</span>
          </div>
          <Stars count={career.demandStars} />
        </div>

        <div className="mb-5 flex flex-wrap gap-1.5">
          {career.skills.map((s) => (
            <span
              key={s}
              className="bg-primary/10 text-primary rounded-lg px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="from-primary/10 group-hover:from-primary/20 relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br to-purple-500/10 p-4 transition-all group-hover:to-purple-500/20">
          <div className="flex items-start gap-3">
            <div className="bg-primary/20 rounded-lg p-1.5">
              <Bot className="text-primary h-4 w-4" />
            </div>
            <p className="text-muted-foreground text-[11px] leading-normal italic">
              &quot;{career.aiInsight}&quot;
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-3">
          {/* 🎯 KÍCH HOẠT ĐÚNG LUỒNG: Khi click Khám phá ngay sẽ bốc tách truyền chuẩn career.id vào hàm xử lý */}
          <Button
            onClick={() => void onExplore(career.id, career.title, targetUrl)}
            className="shimmer-btn bg-gradient-hero flex-1 cursor-pointer rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95"
          >
            Khám phá ngay <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <Link href={`/career-compare?ids=${career.id}`}>
            <Button
              variant="outline"
              className="rounded-2xl border-white/10 bg-white/5 font-bold transition-all hover:bg-white/10 active:scale-95"
            >
              <GitCompare className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main View ─── */
const Specialization = () => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [showSort, setShowSort] = useState(false);
  const [careerList, setCareerList] = useState<CareerDiscoveryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const { accessToken } = useAuth();

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeCategory, sortBy]);

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

        const mapped = (insights as CareerInsight[]).map((insight) => {
          const salary = parseSalaryRange(insight.analysis?.salaryRange);
          const categoryKey = normalizeCategory(insight.category);
          const categoryLabel = CATEGORY_LABELS[categoryKey] || 'Khác';
          const demandKey = insight.analysis?.demandLevel;
          const demand = DEMAND_CONFIG[demandKey] || {
            label: 'Chưa cập nhật',
            stars: 0,
            growth: 0,
            color: 'text-muted-foreground',
          };
          const skills = Array.isArray(insight.analysis?.keySkills)
            ? insight.analysis.keySkills.filter(Boolean)
            : [];
          const lastUpdated = new Date(insight.updatedAt || insight.lastAIUpdate || 0).getTime();
          const trendInsight = insight.analysis?.trends?.[0]?.description;

          return {
            id: insight._id,
            title: insight.careerTitle,
            description: insight.analysis?.overview || 'Thông tin chi tiết đang được cập nhật...',
            category: categoryKey,
            categoryLabel,
            icon: '💼',
            salaryMin: salary.min,
            salaryMax: salary.max,
            salaryText: salary.text,
            growth: demand.growth,
            demandLabel: demand.label,
            demandStars: demand.stars,
            demandColor: demand.color,
            skills: skills.length > 0 ? skills.slice(0, 5) : ['Tổng quát'],
            aiInsight: trendInsight || 'Được tổng hợp từ dữ liệu cộng đồng Edumee.',
            lastUpdated,
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

  // 🎯 KÍCH HOẠT CLICK (HÀM TRỌNG TÂM): Gửi kèm ID nghề lên Backend để check trùng lặp, triệt tiêu lỗi cộng dồn dôi dư +3 ngớ ngẩn
  const handleExploreCareer = async (id: string, title: string, url: string) => {
    if (!accessToken) {
      router.push(url);
      return;
    }
    try {
      // Gọi qua dashboardService bọc lõi apiClient siêu an toàn
      await dashboardService.trackExploration(accessToken, id);
    } catch (err) {
      console.error('Failed to log analytic capture event:', err);
    } finally {
      router.push(url);
    }
  };

  const filtered = useMemo(() => {
    let list = careerList;
    if (activeCategory !== 'all') {
      list = list.filter((c) => c.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          q === '' ||
          c.title.toLowerCase().includes(q) ||
          c.categoryLabel.toLowerCase().includes(q) ||
          c.skills.some((s) => s.toLowerCase().includes(q)),
      );
    }
    if (sortBy === 'Lương cao nhất') {
      list = [...list].sort(
        (a, b) => (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0),
      );
    } else if (sortBy === 'Tăng trưởng cao nhất') {
      list = [...list].sort((a, b) => b.growth - a.growth);
    } else if (sortBy === 'Mới nhất') {
      list = [...list].sort((a, b) => b.lastUpdated - a.lastUpdated);
    }
    return list;
  }, [search, activeCategory, sortBy, careerList]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  return (
    <div className="aurora-bg noise-bg min-h-screen">
      <div className="gradient-orb bg-primary/20 -top-20 -left-20 h-96 w-96" />
      <div className="gradient-orb top-1/2 -right-40 h-[500px] w-[500px] bg-purple-500/10" />

      <div className="relative z-10">
        <div className="container py-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-xl">
              <span className="bg-mint flex h-2 w-2 animate-pulse rounded-full" />
              <span className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                {careerList.length}+ Ngành nghề xu hướng
              </span>
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
              <span className="text-gradient-hero">Khám phá</span>{' '}
              <span className="text-gradient-accent">Nghề nghiệp</span>
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg md:text-xl">
              Hệ thống AI phân tích và dự báo nghề nghiệp dành riêng cho Gen Z. Tìm kiếm hướng đi
              phù hợp nhất với bản thân ngay hôm nay.
            </p>
          </motion.div>
        </div>

        <div className="sticky top-0 z-40 container pb-4">
          <div className="glass-card flex flex-col gap-4 rounded-[2.5rem] p-4 shadow-2xl md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm công việc mơ ước của bạn..."
                className="focus:ring-primary/20 w-full rounded-[1.5rem] border-none bg-white/5 py-4 pr-6 pl-14 text-sm font-medium transition-all focus:ring-4 focus:outline-hidden"
              />
            </div>

            <div className="relative">
              <Button
                onClick={() => setShowSort(!showSort)}
                className="h-full min-h-[56px] w-full rounded-[1.5rem] border-none bg-white/5 px-6 font-bold transition-all hover:bg-white/10 md:w-auto"
              >
                <Filter className="mr-2 h-5 w-5" />
                {sortBy}
                <ChevronDown
                  className={`ml-2 h-5 w-5 transition-transform ${showSort ? 'rotate-180' : ''}`}
                />
              </Button>
              <AnimatePresence>
                {showSort && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="glass-card absolute top-full right-0 mt-3 w-64 overflow-hidden rounded-3xl p-2 shadow-2xl"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setSortBy(opt);
                          setShowSort(false);
                        }}
                        className={`flex w-full items-center rounded-2xl px-5 py-3 text-left text-sm font-bold transition-colors ${sortBy === opt ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-white/10'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="container mt-12 overflow-hidden py-2">
          <div className="no-scrollbar flex items-center gap-3 overflow-x-auto pb-4">
            {CATEGORY_OPTIONS.map((cat) => (
              <motion.button
                key={cat.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex shrink-0 items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-all ${cat.value === activeCategory ? 'bg-primary text-white shadow-[0_10px_20px_-5px_rgba(59,130,246,0.5)]' : 'text-muted-foreground border border-white/5 bg-white/5 hover:bg-white/10'}`}
              >
                <span className="text-lg">{cat.icon}</span>
                {cat.label}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="container mt-10 pb-32">
          {isLoading ? (
            <div className="flex h-96 flex-col items-center justify-center gap-6">
              <div className="relative h-20 w-20">
                <div className="bg-primary/20 absolute inset-0 animate-ping rounded-full" />
                <div className="bg-primary/10 relative flex h-full w-full items-center justify-center rounded-full">
                  <Loader2 className="text-primary h-10 w-10 animate-spin" />
                </div>
              </div>
              <p className="text-gradient-hero animate-pulse text-xl font-bold">
                AI đang quét kho dữ liệu...
              </p>
            </div>
          ) : paginatedResults.length > 0 ? (
            <>
              <motion.div layout className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {paginatedResults.map((career, idx) => (
                    <CareerCard
                      key={career.id}
                      career={career}
                      index={idx}
                      onExplore={handleExploreCareer}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-16 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="h-12 w-12 rounded-2xl border-white/10 bg-white/5 disabled:opacity-20"
                  >
                    <ChevronDown className="h-6 w-6 rotate-90" />
                  </Button>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const page = i + 1;
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => {
                              setCurrentPage(page);
                              window.scrollTo({ top: 400, behavior: 'smooth' });
                            }}
                            className={`h-10 min-w-[40px] rounded-xl px-2 text-sm font-bold transition-all ${currentPage === page ? 'bg-primary shadow-primary/20 text-white shadow-lg' : 'text-muted-foreground hover:bg-white/10'}`}
                          >
                            {page}
                          </button>
                        );
                      }
                      if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="text-muted-foreground px-1">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="h-12 w-12 rounded-2xl border-white/10 bg-white/5 disabled:opacity-20"
                  >
                    <ChevronDown className="h-6 w-6 -rotate-90" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-96 flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-white/5 bg-white/2 p-12 text-center backdrop-blur-xl"
            >
              <div className="mb-6 rounded-3xl bg-white/5 p-6">
                <Search className="text-muted-foreground h-16 w-16 opacity-20" />
              </div>
              <h3 className="font-display text-2xl font-bold">Không tìm thấy kết quả</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc để khám phá thêm nhiều ngành
                nghề.
              </p>
              <Button
                onClick={() => {
                  setSearch('');
                  setActiveCategory('all');
                }}
                className="mt-8 rounded-2xl bg-white/10 font-bold hover:bg-white/20"
              >
                Xóa tất cả bộ lọc
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Specialization;
