'use client';

import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  careerComparisonService,
  type Career,
  type CareerComparisonResponse,
} from '@/lib/career-comparison.service';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, CheckCircle2, Loader2, TrendingUp, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/* ─── Table row ─── */
const TableRow = ({
  label,
  values,
  highlight,
}: {
  label: string;
  values: (string | number | React.ReactNode)[];
  highlight?: boolean;
}) => (
  <tr className={highlight ? 'bg-primary/5 dark:bg-primary/10' : ''}>
    <td className="text-muted-foreground py-3 pr-4 text-sm font-medium">{label}</td>
    {values.map((v, i) => (
      <td key={i} className="px-4 py-3 text-center text-sm font-semibold">
        {v}
      </td>
    ))}
  </tr>
);

const renderValue = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (Array.isArray(val)) return val.map((v) => renderValue(v)).join(', ');
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (obj.description) return String(obj.description);
    if (obj.name) return String(obj.name);
    if (obj.year) return `${String(obj.year)}: ${obj.description ? String(obj.description) : ''}`;
    return JSON.stringify(val);
  }
  return String(val);
};

const CareerCompare = () => {
  const { accessToken } = useAuth();
  const searchParams = useSearchParams();
  const [availableCareers, setAvailableCareers] = useState<Career[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<CareerComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingList, setFetchingList] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Fetch available careers and set defaults
  useEffect(() => {
    const fetchCareers = async () => {
      setFetchingList(true);
      setError(null);
      try {
        let careersRes: unknown = null;
        let topMatchesRes: Record<string, unknown>[] = [];

        try {
          const [cRes, tRes] = await Promise.allSettled([
            apiClient.get<unknown[]>('/career-fit-results/insights', accessToken),
            apiClient.get<unknown[]>('/career-fit-results/top-matches?limit=3', accessToken),
          ]);

          if (cRes.status === 'fulfilled') {
            careersRes = cRes.value;
          } else {
            console.error('Insights fetch failed:', cRes.reason);
            // Fallback to careers if insights fail
            try {
              careersRes = await apiClient.get<unknown>('/careers?limit=100', accessToken);
            } catch {
              setError('Không thể tải danh sách nghề nghiệp. Vui lòng thử lại sau.');
            }
          }

          topMatchesRes = (tRes.status === 'fulfilled' ? tRes.value : []) as Record<
            string,
            unknown
          >[];
        } catch (err) {
          console.error('Data fetch error:', err);
          setError('Đã xảy ra lỗi khi kết nối với máy chủ.');
        }

        // Extremely robust extraction of the career array
        let careersArray: unknown[] = [];
        const extractArray = (obj: unknown): unknown[] => {
          if (Array.isArray(obj)) return obj;
          const o = obj as Record<string, unknown>;
          if (o?.data && Array.isArray(o.data)) return o.data;
          const oData = o?.data as Record<string, unknown>;
          if (oData?.data && Array.isArray(oData.data)) return oData.data;
          return [];
        };

        careersArray = extractArray(careersRes);
        setDebugInfo(`Dữ liệu từ ${careersArray.length} nghề nghiệp`);

        // Map CareerInsight or Career to our UI Career interface
        const mapped: Career[] = careersArray.map((cObj) => {
          const c = cObj as Record<string, unknown>;
          const analysis = (c.analysis as Record<string, unknown>) || {};
          const title = String(c.careerTitle || c.title || '');
          const id = String(c._id || c.id || '');

          return {
            id,
            _id: id,
            title,
            description: String(analysis.overview || c.description || 'Đang cập nhật...'),
            category: String(c.category || 'Công nghệ'),
            icon: '💼',
            skills: (Array.isArray(analysis.keySkills)
              ? analysis.keySkills
              : Array.isArray(c.requiredSkills)
                ? c.requiredSkills
                : []) as string[],
            pros: (Array.isArray(analysis.pros) ? analysis.pros : []) as string[],
            cons: (Array.isArray(analysis.cons) ? analysis.cons : []) as string[],
            jobOpportunity: analysis.demandLevel === 'Cao' ? 90 : 70,
            salary: parseInt(String((analysis.salaryRange as string)?.split('-')[0] ?? '20')) || 20,
            growth: String((analysis.trends as string[])?.[0] || '+15%'),
            growthPct: 15,
            difficultyStars: 3,
            color: '#7c3aed',
          } satisfies Career;
        });

        setAvailableCareers(mapped);

        // Handle selection from URL or AI top match
        const urlIds =
          searchParams
            .get('ids')
            ?.split(',')
            .filter((id) => id.length > 0) || [];

        // Extract top match ID safely
        const firstMatch = topMatchesRes?.[0];
        const firstCareerId = firstMatch?.careerId as Record<string, unknown> | string | undefined;
        const topMatchId =
          (typeof firstCareerId === 'object' && firstCareerId !== null
            ? String(firstCareerId.id || firstCareerId._id || '')
            : null) || (typeof firstCareerId === 'string' ? firstCareerId : null);

        if (urlIds.length > 0) {
          if (urlIds.length === 1 && topMatchId && topMatchId !== urlIds[0]) {
            setSelectedIds([urlIds[0], topMatchId]);
          } else {
            setSelectedIds(urlIds);
          }
        } else if (topMatchId) {
          const secondMatch = topMatchesRes?.[1];
          const secondCareerId = secondMatch?.careerId as
            | Record<string, unknown>
            | string
            | undefined;
          const secondMatchId =
            (typeof secondCareerId === 'object' && secondCareerId !== null
              ? String(secondCareerId.id || secondCareerId._id || '')
              : null) || (typeof secondCareerId === 'string' ? secondCareerId : null);

          if (secondMatchId && secondMatchId !== topMatchId) {
            setSelectedIds([topMatchId, secondMatchId]);
          } else {
            setSelectedIds([topMatchId]);
          }
        } else if (mapped.length >= 2) {
          setSelectedIds([mapped[0].id, mapped[1].id]);
        }
      } catch (error) {
        console.error('Failed to fetch careers:', error);
        setError('Đã xảy ra lỗi không xác định.');
      } finally {
        setFetchingList(false);
      }
    };

    if (accessToken) {
      fetchCareers();
    } else {
      const timer = setTimeout(() => {
        if (!accessToken) setFetchingList(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [accessToken, searchParams]);

  // Fetch comparison analysis
  const fetchAnalysis = useCallback(
    async (ids: string[]) => {
      if (ids.length < 2) return;
      setLoading(true);
      setError(null);
      try {
        const data = await careerComparisonService.generateDetailedAnalysis(ids, accessToken);
        setComparisonData(data);
      } catch (err: unknown) {
        console.error('Failed to fetch analysis:', err);
        setError(
          (err as Error)?.message || 'Không thể thực hiện phân tích chuyên sâu. Vui lòng thử lại.',
        );
      } finally {
        setLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (selectedIds.length >= 2) {
      fetchAnalysis(selectedIds);
    } else {
      setComparisonData(null);
    }
  }, [selectedIds, fetchAnalysis]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) setSelectedIds(selectedIds.filter((s) => s !== id));
    } else if (selectedIds.length < 3) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedCareers = availableCareers.filter((c) => selectedIds.includes(c.id));
  const unselected = availableCareers.filter((c) => !selectedIds.includes(c.id));

  /* Radar data */
  const radarData =
    comparisonData?.scoreBreakdown.reduce(
      (acc: { subject: string; [key: string]: string | number }[], score) => {
        const metrics = [
          { subject: 'Kỹ năng', key: 'skillMatch' },
          { subject: 'Lương', key: 'salaryPotential' },
          { subject: 'Cân bằng', key: 'workLifeBalance' },
          { subject: 'Tăng trưởng', key: 'growthPotential' },
        ];

        metrics.forEach((m) => {
          let entry = acc.find((a) => a.subject === m.subject);
          if (!entry) {
            entry = { subject: m.subject };
            acc.push(entry);
          }
          entry[score.careerTitle] = (score.criteriaScores as Record<string, number>)[m.key];
        });
        return acc;
      },
      [],
    ) || [];

  /* Bar data */
  const barData =
    comparisonData?.scoreBreakdown.map((score) => ({
      name: score.careerTitle,
      'Điểm tổng quát': score.overallScore,
      'Kỹ năng': score.criteriaScores.skillMatch,
      Lương: score.criteriaScores.salaryPotential,
      'Tăng trưởng': score.criteriaScores.growthPotential,
    })) || [];

  if (fetchingList) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground animate-pulse text-sm">
          Đang tải thư viện nghề nghiệp...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-card border-border/60 border-b">
        <div className="container py-10 text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="bg-primary/10 text-primary mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
              Phân tích bằng AI
            </span>
            <h1 className="font-display text-3xl font-bold md:text-4xl">
              So sánh nghề nghiệp chuyên sâu
            </h1>
            <p className="text-muted-foreground mt-2">
              Dựa trên hồ sơ năng lực và tính cách của bạn, AI sẽ phân tích đâu là lựa chọn tối ưu
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mt-6 space-y-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-destructive/10 border-destructive/20 text-destructive flex items-center justify-between rounded-xl border p-4 text-sm font-medium"
          >
            <span>{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="bg-destructive rounded-lg px-3 py-1 text-xs text-white hover:opacity-80"
            >
              Thử lại
            </button>
          </motion.div>
        )}

        {/* Selector */}
        <div className="glass-card border-border/70 bg-card/80 dark:bg-card/60 rounded-2xl border p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-muted-foreground text-sm font-medium">
              Chọn nghề để so sánh ({selectedIds.length}/3):
            </p>
            <span className="text-muted-foreground text-[10px] opacity-50">{debugInfo}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCareers.map((c) => (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className="bg-primary flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-80"
              >
                {c.icon} {renderValue(c.title)} <X className="h-3.5 w-3.5" />
              </button>
            ))}
            {unselected.slice(0, 10).map((c) => (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                disabled={selectedIds.length >= 3}
                className="border-border text-foreground hover:bg-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                {c.icon} {renderValue(c.title)}
              </button>
            ))}
          </div>
        </div>

        {/* AI Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-primary/5 border-primary/20 flex items-center justify-center gap-3 rounded-2xl border p-8"
            >
              <Brain className="text-primary h-6 w-6 animate-pulse" />
              <p className="text-primary animate-pulse font-medium">
                AI đang phân tích sự tương thích của bạn với các nghề nghiệp này...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comparison cards */}
        {selectedCareers.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {selectedCareers.map((career, idx) => {
              const score = comparisonData?.scoreBreakdown.find((s) => s.careerId === career.id);
              return (
                <motion.div
                  key={career.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-card border-border/70 bg-card/80 dark:bg-card/60 overflow-hidden rounded-2xl border"
                >
                  <div className="bg-primary h-1.5 w-full" />
                  <div className="space-y-4 p-5">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-2xl">{career.icon || '💼'}</span>
                        <h3 className="font-display font-semibold">{renderValue(career.title)}</h3>
                      </div>
                      {score ? (
                        <span className="bg-mint/20 text-mint inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">
                          {score.overallScore}% phù hợp
                        </span>
                      ) : (
                        <span className="bg-muted text-muted-foreground inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium italic">
                          Đang tính toán độ phù hợp...
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-mint text-base font-semibold">
                        Lương TB: {career.salary || '15-30'}tr/tháng
                      </span>
                    </div>

                    <div className="text-mint flex items-center gap-1.5 text-sm">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-medium">
                        {renderValue(career.growth) || 'Phát triển ổn định'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {career.skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium"
                        >
                          {renderValue(s)}
                        </span>
                      ))}
                    </div>

                    <div className="space-y-1">
                      {career.pros.slice(0, 2).map((p) => (
                        <div key={p} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="text-mint h-3.5 w-3.5 shrink-0" />
                          <span>{renderValue(p)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Charts */}
        {!loading && comparisonData && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="glass-card border-border/70 bg-card/80 shadow-card dark:bg-card/60 relative overflow-hidden rounded-2xl border p-6">
              <div className="bg-primary/5 pointer-events-none absolute top-0 left-0 -mt-10 -ml-10 h-32 w-32 rounded-full blur-3xl"></div>
              <h3 className="font-display relative z-10 mb-6 flex items-center gap-2 font-semibold">
                <span className="inline-block h-5 w-1.5 rounded-full bg-indigo-500"></span>
                Tương quan năng lực
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                  />
                  {comparisonData.careers.map((c, i) => {
                    const colors = ['#6366f1', '#0ea5e9', '#f43f5e']; // Indigo, Sky, Rose
                    const color = colors[i % colors.length];
                    return (
                      <Radar
                        key={c._id || c.id || i}
                        name={c.title}
                        dataKey={c.title}
                        stroke={color}
                        fill={color}
                        fillOpacity={0.2}
                        strokeWidth={2.5}
                        dot={{ r: 4, strokeWidth: 2, fill: color, stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    );
                  })}
                  <Legend
                    formatter={(v) => (
                      <span className="text-muted-foreground text-xs font-medium">{v}</span>
                    )}
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '1rem',
                      fontSize: 12,
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'hsl(var(--card))',
                      color: 'hsl(var(--foreground))',
                    }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card border-border/70 bg-card/80 shadow-card dark:bg-card/60 relative overflow-hidden rounded-2xl border p-6">
              <div className="bg-primary/5 pointer-events-none absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full blur-3xl"></div>
              <h3 className="font-display relative z-10 mb-6 flex items-center gap-2 font-semibold">
                <span className="inline-block h-5 w-1.5 rounded-full bg-sky-500"></span>
                So sánh chỉ số chi tiết
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} margin={{ left: -10, right: 10, top: 10 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fontWeight: 500, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '1rem',
                      fontSize: 12,
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'hsl(var(--card))',
                      color: 'hsl(var(--foreground))',
                    }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  />
                  <Legend
                    formatter={(v) => (
                      <span className="text-muted-foreground text-xs font-medium">{v}</span>
                    )}
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                  <Bar dataKey="Điểm tổng quát" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={12} />
                  <Bar dataKey="Kỹ năng" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={12} />
                  <Bar dataKey="Lương" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={12} />
                  <Bar dataKey="Tăng trưởng" fill="#10b981" radius={[6, 6, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Detailed AI Analysis Table */}
        {!loading && comparisonData && (
          <div className="glass-card border-border/70 bg-card/80 dark:bg-card/60 overflow-hidden rounded-2xl border">
            <div className="border-border flex items-center gap-2 border-b px-6 py-4">
              <Brain className="text-primary h-5 w-5" />
              <h3 className="font-display font-semibold">Phân tích sâu từ AI</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="text-foreground w-full text-sm">
                <thead>
                  <tr className="border-border bg-muted/40 border-b">
                    <th className="text-muted-foreground w-40 py-3 pr-4 text-left text-sm font-semibold">
                      Tiêu chí
                    </th>
                    {comparisonData.careers.map((c, i) => (
                      <th
                        key={c._id || c.id || i}
                        className="px-4 py-3 text-center text-sm font-semibold"
                      >
                        {c.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  <TableRow
                    label="Lương TB"
                    values={comparisonData.careers.map((c, idx) => {
                      const careerFromList = selectedCareers.find(
                        (sc) => sc.id === c.id || sc._id === c.id || sc.id === c._id,
                      );
                      const score = comparisonData.scoreBreakdown.find(
                        (s) => s.careerId === (c._id || c.id),
                      );
                      const fallbackSalary = score?.criteriaScores.salaryPotential
                        ? `> ${score.criteriaScores.salaryPotential}tr`
                        : 'Đang cập nhật';
                      const salaryStr = careerFromList?.salary
                        ? `${careerFromList.salary}tr/tháng`
                        : fallbackSalary;
                      return (
                        <span key={idx} className="font-semibold text-emerald-500">
                          {salaryStr}
                        </span>
                      );
                    })}
                  />
                  <TableRow
                    label="Tầm nhìn 5 năm"
                    values={comparisonData.detailedAnalysis.marketDemand.map((d, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <span className="text-foreground font-medium">
                          {renderValue(d.jobGrowthRate) || 'Phát triển tốt'}
                        </span>
                      </div>
                    ))}
                    highlight
                  />
                  <TableRow
                    label="Cơ hội việc làm"
                    values={comparisonData.detailedAnalysis.marketDemand.map((d, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <span className="font-semibold text-sky-500">
                          {renderValue(d.demandLevel) || 'Cao'}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          Cạnh tranh: {renderValue(d.competitionLevel) || 'Trung bình'}
                        </span>
                      </div>
                    ))}
                  />
                  <TableRow
                    label="Số năm đào tạo TB"
                    values={comparisonData.careers.map((c, idx) => {
                      const careerFromList = selectedCareers.find(
                        (sc) => sc.id === c.id || sc._id === c.id || sc.id === c._id,
                      );
                      let years = careerFromList?.yearsStudy
                        ? `${careerFromList.yearsStudy} năm`
                        : '';
                      if (!years) {
                        const t = renderValue(c.title).toLowerCase();
                        years =
                          t.includes('bác sĩ') || t.includes('y khoa')
                            ? '6-8 năm'
                            : t.includes('kỹ sư') ||
                                t.includes('chuyên gia') ||
                                t.includes('phân tích')
                              ? '4-5 năm'
                              : '3-4 năm';
                      }
                      return (
                        <span key={idx} className="font-medium text-amber-500">
                          {years}
                        </span>
                      );
                    })}
                    highlight
                  />
                  <TableRow
                    label="Lỗ hổng kỹ năng"
                    values={comparisonData.detailedAnalysis.skillsAlignment.gapAnalysis.map(
                      (g, idx) => (
                        <div key={idx} className="flex flex-wrap justify-center gap-1">
                          {g.missingSkills.slice(0, 3).map((s, sIdx) => (
                            <span
                              key={sIdx}
                              className="rounded-full bg-amber-100/60 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200/60 dark:bg-amber-800/35 dark:text-amber-100 dark:ring-amber-500/30"
                            >
                              {renderValue(s)}
                            </span>
                          ))}
                        </div>
                      ),
                    )}
                  />
                  <TableRow
                    label="Lời khuyên AI"
                    values={comparisonData.careers.map((c, cIdx) => {
                      const isBestMatch =
                        comparisonData.recommendations.bestMatch === (c._id || c.id) || cIdx === 0;

                      return (
                        <div key={cIdx} className="flex flex-col gap-1.5">
                          {isBestMatch ? (
                            comparisonData.recommendations.reasonsForRecommendation
                              .slice(0, 2)
                              .map((r, idx) => (
                                <p
                                  key={idx}
                                  className="rounded-md bg-sky-50/80 px-2 py-1 text-left text-xs font-medium text-sky-700 italic ring-1 ring-sky-200/60 dark:bg-sky-800/35 dark:text-sky-100 dark:ring-sky-500/30"
                                >
                                  &ldquo;{renderValue(r)}&rdquo;
                                </p>
                              ))
                          ) : (
                            <p className="bg-muted/60 text-muted-foreground rounded-md px-2 py-1 text-left text-xs font-medium italic dark:bg-slate-800/60 dark:text-slate-200">
                              Cần cải thiện thêm kỹ năng chuyên môn.
                            </p>
                          )}
                        </div>
                      );
                    })}
                    highlight
                  />
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CareerCompare;
