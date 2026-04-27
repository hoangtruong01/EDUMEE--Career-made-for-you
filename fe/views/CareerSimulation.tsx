'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { 
  simulationService, 
  CareerSimulationData, 
  TopCareer 
} from '@/lib/simulation.service';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code,
  DollarSign,
  Lightbulb,
  Loader2,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

/* ─── Level color helpers ─── */
const levelBg = (idx: number) =>
  [
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-cyan-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
  ][idx % 4];

const levelDot = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500'];

const CareerIcon = ({ title, className }: { title: string; className?: string }) => {
  const t = title.toLowerCase();
  if (t.includes('phần mềm') || t.includes('software') || t.includes('developer') || t.includes('code')) return <Code className={className} />;
  if (t.includes('data') || t.includes('dữ liệu') || t.includes('analyst')) return <BarChart3 className={className} />;
  if (t.includes('design') || t.includes('ux') || t.includes('ui')) return <Users className={className} />;
  if (t.includes('manager') || t.includes('product') || t.includes('kinh doanh')) return <Briefcase className={className} />;
  return <Briefcase className={className} />;
};

/* ─── Component ─── */
const CareerSimulation = () => {
  const { accessToken } = useAuth();
  
  const [topCareers, setTopCareers] = useState<TopCareer[]>([]);
  const [activeCareerTitle, setActiveCareerTitle] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<CareerSimulationData | null>(null);
  
  const [levelIdx, setLevelIdx] = useState(0);
  const [isLoadingCareers, setIsLoadingCareers] = useState(true);
  const [isLoadingSimulation, setIsLoadingSimulation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load top careers initially
  useEffect(() => {
    const loadTopCareers = async () => {
      if (!accessToken) return;
      
      try {
        setIsLoadingCareers(true);
        const careers = await simulationService.getTopCareers(accessToken);
        setTopCareers(careers);
        if (careers.length > 0) {
          setActiveCareerTitle(careers[0].title);
        }
      } catch (err) {
        console.error('Failed to load top careers:', err);
        setError('Không thể tải danh sách nghề nghiệp. Vui lòng thử lại sau.');
      } finally {
        setIsLoadingCareers(false);
      }
    };

    loadTopCareers();
  }, [accessToken]);

  // Load simulation when active career changes
  useEffect(() => {
    const loadSimulation = async () => {
      if (!accessToken || !activeCareerTitle) return;

      try {
        setIsLoadingSimulation(true);
        setError(null);
        const data = await simulationService.getSimulation(activeCareerTitle, accessToken);
        setSimulation(data);
        setLevelIdx(0);
      } catch (err) {
        console.error('Failed to load simulation:', err);
        setError('Không thể tạo mô phỏng. AI có thể đang bận, vui lòng thử lại.');
      } finally {
        setIsLoadingSimulation(false);
      }
    };

    loadSimulation();
  }, [accessToken, activeCareerTitle]);

  const level = simulation?.levels[levelIdx];
  const totalLevels = simulation?.levels.length || 0;

  if (isLoadingCareers) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4">
        <Loader2 className="text-primary h-10 w-10 animate-spin" />
        <p className="text-muted-foreground animate-pulse font-medium">Đang chuẩn bị lộ trình của bạn...</p>
      </div>
    );
  }

  if (topCareers.length === 0 && !isLoadingCareers) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold">Chưa có kết quả đánh giá</h2>
        <p className="text-muted-foreground mt-2">Hãy hoàn thành bài trắc nghiệm để xem mô phỏng nghề nghiệp.</p>
        <Button className="mt-6" onClick={() => window.location.href = '/personality-test'}>Làm bài trắc nghiệm</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-card">
        <div className="container py-10 text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="bg-primary/10 text-primary mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
              <Star className="h-4 w-4" /> Trải nghiệm thực tế
            </span>
            <h1 className="font-display text-3xl font-bold md:text-4xl">
              Mô phỏng hành trình nghề nghiệp
            </h1>
            <p className="text-muted-foreground mt-2">
              Khám phá cuộc sống thực tế ở từng cấp độ sự nghiệp trước khi quyết định
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mt-6 space-y-6">
        {/* Career tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {topCareers.map((c) => (
            <button
              key={c.title}
              onClick={() => setActiveCareerTitle(c.title)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCareerTitle === c.title
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <CareerIcon title={c.title} className="h-4 w-4" />
              {c.title}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
            {error}
            <Button variant="ghost" size="sm" className="ml-2 text-red-600" onClick={() => setActiveCareerTitle(activeCareerTitle)}>Thử lại</Button>
          </div>
        )}

        {isLoadingSimulation ? (
          <div className="glass-card flex min-h-[400px] flex-col items-center justify-center rounded-2xl p-10 text-center">
            <Loader2 className="text-primary mb-4 h-12 w-12 animate-spin" />
            <h3 className="text-xl font-bold">AI đang phân tích & xây dựng lộ trình cho {activeCareerTitle}...</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              Chúng tôi đang tạo ra các nhiệm vụ, lịch trình và thách thức thực tế dựa trên kinh nghiệm của hàng ngàn chuyên gia.
            </p>
          </div>
        ) : simulation && level ? (
          <>
            {/* Progress timeline */}
            <div className="glass-card rounded-2xl p-4">
              <p className="text-muted-foreground mb-3 text-sm font-medium">
                Lộ trình thăng tiến ({activeCareerTitle}):
              </p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {simulation.levels.map((lv, i) => (
                  <div key={lv.id || i} className="flex items-center gap-2">
                    <button
                      onClick={() => setLevelIdx(i)}
                      className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-4 py-2 text-center transition-all ${
                        i === levelIdx
                          ? `bg-linear-to-br ${levelBg(i)} text-white shadow-lg`
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <span className="text-xl">{lv.emoji}</span>
                      <span className="text-xs font-semibold">{lv.label}</span>
                      <span
                        className={`text-xs ${i === levelIdx ? 'text-white/80' : 'text-muted-foreground'}`}
                      >
                        {lv.salaryRange}
                      </span>
                    </button>
                    {i < totalLevels - 1 && (
                      <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Main 2-col layout */}
            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
              {/* Left: Level card */}
              <motion.div
                key={`${activeCareerTitle}-${levelIdx}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                {/* Level hero card */}
                <div className={`rounded-2xl bg-linear-to-br ${levelBg(levelIdx)} p-6 text-white`}>
                  <p className="mb-2 text-sm font-medium text-white/70">Cấp độ</p>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="text-4xl">{level.emoji || ['🌱', '🚀', '⭐', '👑'][levelIdx % 4]}</span>
                    <div>
                      <p className="text-2xl font-bold">{level.label}</p>
                      <p className="text-white/80">{activeCareerTitle}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { icon: DollarSign, label: 'Lương', value: level.salaryRange },
                      { icon: Clock, label: 'Thời gian', value: level.yearRange },
                      { icon: TrendingUp, label: 'Cấp tiếp', value: level.nextLevel || (levelIdx < totalLevels - 1 ? simulation.levels[levelIdx + 1]?.label : 'Đỉnh cao') },
                    ].map(({ icon: Icon, label, value }) => (
                      <div
                        key={label}
                        className="rounded-xl bg-white/20 px-2 py-2 text-center backdrop-blur-sm sm:px-3 sm:py-2.5"
                      >
                        <Icon className="mx-auto mb-1 h-4 w-4 text-white/80" />
                        <p className="text-xs text-white/70">{label}</p>
                        <p className="text-sm font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily tasks */}
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="font-display mb-3 flex items-center gap-2 font-semibold">
                    <span>📋</span> Nhiệm vụ hàng ngày
                  </h3>
                  <ul className="space-y-2">
                    {(level.tasks || level.dailyTasks || []).map((task: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="text-mint mt-0.5 h-4 w-4 shrink-0" />
                        <span className="text-foreground">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Day schedule */}
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="font-display mb-3 flex items-center gap-2 font-semibold">
                    <span>⏰</span> Một ngày làm việc tiêu biểu
                  </h3>
                  <p className="bg-muted/60 text-muted-foreground rounded-xl p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {level.daySchedule || (level.typicalSchedule || []).map((s: { time: string; activity: string }) => `${s.time}: ${s.activity}`).join('\n')}
                  </p>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={levelIdx === 0}
                    onClick={() => setLevelIdx((v) => v - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" /> Trước
                  </Button>
                  <span className="text-muted-foreground text-xs">
                    {levelIdx + 1} / {totalLevels}
                  </span>
                  <Button
                    variant="hero"
                    size="sm"
                    className="gap-1.5"
                    disabled={levelIdx === totalLevels - 1}
                    onClick={() => setLevelIdx((v) => v + 1)}
                  >
                    Tiếp <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Bottom 2 cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
                    <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
                      <Zap className="h-4 w-4" /> Thách thức lớn nhất
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {level.challenge || (level.challenges && level.challenges[0]) || 'Chưa có thông tin'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/40">
                    <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                      <Lightbulb className="h-4 w-4" /> Tips từ Senior
                    </div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      {level.tip || (level.tips && level.tips[0]) || 'Chưa có thông tin'}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Right sidebar */}
              <div className="space-y-4">
                {/* Skills */}
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="font-display mb-3 flex items-center gap-2 font-semibold">
                    <span className="text-primary">◈</span> Kỹ năng cần có
                  </h3>
                  <ul className="space-y-2">
                    {(level.skills || [{name: 'Kỹ năng chuyên môn', color: 'text-primary'}, {name: 'Kỹ năng mềm', color: 'text-primary'}]).map((sk: { name: string; color?: string }, i: number) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm">
                        <span className={`h-2 w-2 rounded-full ${levelDot[levelIdx % 4]} shrink-0`} />
                        <span className={`font-medium ${sk.color || 'text-primary'}`}>{sk.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Roadmap overview */}
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="font-display mb-3 text-sm font-semibold">Tổng quan lộ trình</h3>
                  <ul className="space-y-2">
                    {simulation.levels.map((lv, i) => (
                      <button
                        key={lv.id || i}
                        onClick={() => setLevelIdx(i)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          i === levelIdx
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${levelDot[i % 4]}`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">{lv.label}</p>
                          <p className="text-muted-foreground text-xs">
                            {lv.salaryRange} · {lv.yearRange}
                          </p>
                        </div>
                        {i === levelIdx && (
                          <span className="bg-primary ml-auto h-2 w-2 shrink-0 rounded-full" />
                        )}
                      </button>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default CareerSimulation;
