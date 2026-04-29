'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, TrendingUp, X, Brain, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
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
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { careerComparisonService, type Career, type CareerComparisonResponse } from '@/lib/career-comparison.service';
import { apiClient } from '@/lib/api-client';

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
  <tr className={highlight ? 'bg-primary/5' : ''}>
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
  if (Array.isArray(val)) return val.map(v => renderValue(v)).join(', ');
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
        let topMatchesRes: unknown = null;

        try {
          const [cRes, tRes] = await Promise.allSettled([
            apiClient.get<unknown[]>('/career-fit-results/insights', accessToken),
            apiClient.get<unknown[]>('/career-fit-results/top-matches?limit=3', accessToken)
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

          topMatchesRes = tRes.status === 'fulfilled' ? tRes.value : [];
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
        const mapped: Career[] = careersArray.map(cObj => {
          const c = cObj as Record<string, unknown>;
          const analysis = (c.analysis as Record<string, unknown>) || {};
          const title = String(c.careerTitle || c.title || '');
          const id = String(c._id || c.id || '');
          
          return {
            id,
            _id: id,
            title,
            description: analysis.overview || c.description || 'Đang cập nhật...',
            category: c.category || 'Công nghệ',
            icon: '💼',
            skills: analysis.keySkills || c.requiredSkills || [],
            pros: analysis.pros || [],
            cons: analysis.cons || [],
            jobOpportunity: analysis.demandLevel === 'Cao' ? 90 : 70,
            salary: parseInt(analysis.salaryRange?.split('-')[0]) || 20,
            growth: analysis.trends?.[0] || '+15%',
            growthPct: 15,
            difficultyStars: 3,
            color: '#7c3aed',
          };
        });
        
        setAvailableCareers(mapped);
        
        // Handle selection from URL or AI top match
        const urlIds = searchParams.get('ids')?.split(',').filter(id => id.length > 0) || [];
        
        // Extract top match ID safely
        const firstMatch = topMatchesRes?.[0];
        const topMatchId = firstMatch?.careerId?.id || firstMatch?.careerId?._id || (typeof firstMatch?.careerId === 'string' ? firstMatch.careerId : null);
        
        if (urlIds.length > 0) {
          if (urlIds.length === 1 && topMatchId && topMatchId !== urlIds[0]) {
             setSelectedIds([urlIds[0], topMatchId]);
          } else {
             setSelectedIds(urlIds);
          }
        } else if (topMatchId) {
          const secondMatch = topMatchesRes?.[1];
          const secondMatchId = secondMatch?.careerId?.id || secondMatch?.careerId?._id || (typeof secondMatch?.careerId === 'string' ? secondMatch.careerId : null);
          
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
  const fetchAnalysis = useCallback(async (ids: string[]) => {
    if (ids.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const data = await careerComparisonService.generateDetailedAnalysis(ids, accessToken);
      setComparisonData(data);
    } catch (err: unknown) {
      console.error('Failed to fetch analysis:', err);
      setError((err as Error)?.message || 'Không thể thực hiện phân tích chuyên sâu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

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
  const radarData = comparisonData?.scoreBreakdown.reduce((acc: { subject: string; [key: string]: string | number }[], score) => {
    const metrics = [
      { subject: 'Kỹ năng', key: 'skillMatch' },
      { subject: 'Lương', key: 'salaryPotential' },
      { subject: 'Cân bằng', key: 'workLifeBalance' },
      { subject: 'Tăng trưởng', key: 'growthPotential' },
    ];

    metrics.forEach(m => {
      let entry = acc.find(a => a.subject === m.subject);
      if (!entry) {
        entry = { subject: m.subject };
        acc.push(entry);
      }
      entry[score.careerTitle] = (score.criteriaScores as Record<string, number>)[m.key];
    });
    return acc;
  }, []) || [];

  /* Bar data */
  const barData = comparisonData?.scoreBreakdown.map(score => ({
    name: score.careerTitle,
    'Điểm tổng quát': score.overallScore,
    'Kỹ năng': score.criteriaScores.skillMatch,
    'Lương': score.criteriaScores.salaryPotential,
    'Tăng trưởng': score.criteriaScores.growthPotential,
  })) || [];

  if (fetchingList) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground animate-pulse text-sm">Đang tải thư viện nghề nghiệp...</p>
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
              Phân tích bằng AI
            </span>
            <h1 className="font-display text-3xl font-bold md:text-4xl">So sánh nghề nghiệp chuyên sâu</h1>
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
              className="bg-destructive text-white rounded-lg px-3 py-1 text-xs hover:opacity-80"
            >
              Thử lại
            </button>
          </motion.div>
        )}

        {/* Selector */}
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-muted-foreground text-sm font-medium">
              Chọn nghề để so sánh ({selectedIds.length}/3):
            </p>
            <span className="text-[10px] text-muted-foreground opacity-50">{debugInfo}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCareers.map((c) => (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-80"
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
              className="bg-primary/5 flex items-center justify-center gap-3 rounded-2xl p-8 border border-primary/20"
            >
              <Brain className="text-primary h-6 w-6 animate-pulse" />
              <p className="font-medium text-primary animate-pulse">AI đang phân tích sự tương thích của bạn với các nghề nghiệp này...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comparison cards */}
        {selectedCareers.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {selectedCareers.map((career, idx) => {
              const score = comparisonData?.scoreBreakdown.find(s => s.careerId === career.id);
              return (
                <motion.div
                  key={career.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-card overflow-hidden rounded-2xl"
                >
                  <div className="h-1.5 w-full bg-primary" />
                  <div className="space-y-4 p-5">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-2xl">{career.icon || '💼'}</span>
                        <h3 className="font-display font-semibold">{renderValue(career.title)}</h3>
                      </div>
                      {score ? (
                        <span className="inline-block rounded-full bg-mint/20 px-2.5 py-0.5 text-xs font-semibold text-mint">
                          {score.overallScore}% phù hợp
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground italic">
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
                      <span className="font-medium">{renderValue(career.growth) || 'Phát triển ổn định'}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {career.skills.slice(0, 4).map((s) => (
                        <span key={s} className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">
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
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display mb-4 font-semibold">Tương quan năng lực</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  {comparisonData.careers.map((c, i) => (
                    <Radar
                      key={c._id || c.id || i}
                      name={c.title}
                      dataKey={c.title}
                      stroke={i === 0 ? '#7c3aed' : i === 1 ? '#0ea5e9' : '#f43f5e'}
                      fill={i === 0 ? '#7c3aed' : i === 1 ? '#0ea5e9' : '#f43f5e'}
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                  <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display mb-4 font-semibold">So sánh chỉ số chi tiết</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: 12 }} />
                  <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                  <Bar dataKey="Điểm tổng quát" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={15} />
                  <Bar dataKey="Kỹ năng" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={15} />
                  <Bar dataKey="Tăng trưởng" fill="#10b981" radius={[4, 4, 0, 0]} barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Detailed AI Analysis Table */}
        {!loading && comparisonData && (
          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="border-border flex items-center gap-2 border-b px-6 py-4">
              <Brain className="text-primary h-5 w-5" />
              <h3 className="font-display font-semibold">Phân tích sâu từ AI</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted-foreground w-40 py-3 pr-4 text-left text-sm font-semibold">Tiêu chí</th>
                    {comparisonData.careers.map((c, i) => (
                      <th key={c._id || c.id || i} className="px-4 py-3 text-center text-sm font-semibold">{c.title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  <TableRow
                    label="Lộ trình thăng tiến"
                    values={comparisonData.detailedAnalysis.careerProgression.map((p, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <span className="font-semibold">{renderValue(p.seniorityLevels)}</span>
                        {p.progressionPath && Array.isArray(p.progressionPath) && (
                          <div className="mt-1 space-y-1 text-left text-[10px] text-muted-foreground">
                            {p.progressionPath.slice(0, 2).map((step: unknown, sIdx: number) => (
                              <div key={sIdx} className="flex gap-1">
                                <span>•</span>
                                <span>{renderValue(step)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  />
                  <TableRow
                    label="Nhu cầu thị trường"
                    values={comparisonData.detailedAnalysis.marketDemand.map((d, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <span className="text-mint">{renderValue(d.demandLevel)}</span>
                        <span className="text-muted-foreground text-[10px]">{renderValue(d.jobGrowthRate)}</span>
                      </div>
                    ))}
                    highlight
                  />
                  <TableRow
                    label="Lỗ hổng kỹ năng"
                    values={comparisonData.detailedAnalysis.skillsAlignment.gapAnalysis.map((g, idx) => (
                      <div key={idx} className="flex flex-wrap justify-center gap-1">
                        {g.missingSkills.slice(0, 3).map((s, sIdx) => (
                          <span key={sIdx} className="bg-destructive/10 text-destructive rounded-full px-1.5 py-0.5 text-[9px]">{renderValue(s)}</span>
                        ))}
                      </div>
                    ))}
                  />
                  <TableRow
                    label="Lời khuyên AI"
                    values={comparisonData.careers.map((c, cIdx) => (
                      <div key={cIdx} className="flex flex-col gap-1">
                        {cIdx === 0 && comparisonData.recommendations.reasonsForRecommendation.slice(0, 2).map((r, idx) => (
                          <p key={idx} className="text-left text-xs font-normal italic text-mint">{renderValue(r)}</p>
                        ))}
                      </div>
                    ))}
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
