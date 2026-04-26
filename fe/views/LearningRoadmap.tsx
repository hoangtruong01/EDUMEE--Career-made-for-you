'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/auth-context';
import { roadmapService, GeneratedRoadmap, RoadmapPhase } from '@/lib/roadmap.service';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  Loader2,
  Target,
  Trophy,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/* ── Static fallback data removed ── */

/* ── Map API phase data to display format ── */
function mapApiRoadmap(roadmap: GeneratedRoadmap) {
  return roadmap.phases.map((phase: RoadmapPhase, i: number) => ({
    phase: phase.estimatedDuration || `Giai đoạn ${i + 1}`,
    title: phase.title,
    status: i === 0 ? 'current' : 'locked',
    progress: i === 0 ? 0 : 0,
    milestones: phase.milestones.map((m) => ({
      title: m.title,
      done: false,
      desc: m.description,
      tasks: m.tasks.map((t) => t.taskTitle),
    })),
    skills: phase.milestones.flatMap((m) => m.skills.map((s) => s.skillName)).slice(0, 3),
    kpi: phase.objectives.join(' • ') || 'Hoàn thành giai đoạn',
  }));
}

/* ── Main Component ── */
const LearningRoadmap = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();

  const roadmapId = searchParams.get('id');
  const careerFromParam = searchParams.get('career');

  const [expanded, setExpanded] = useState<number | null>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [apiRoadmap, setApiRoadmap] = useState<GeneratedRoadmap | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    const load = async () => {
      try {
        setIsLoading(true);
        if (roadmapId) {
          const data = await roadmapService.getRoadmapById(accessToken, roadmapId);
          setApiRoadmap(data);
        } else {
          const latest = await roadmapService.getLatestRoadmap(accessToken);
          if (latest) {
            setApiRoadmap(latest);
          }
        }
      } catch {
        // Handle error if needed
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [roadmapId, accessToken]);

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
            <div className="absolute inset-0 rounded-full animate-ping bg-violet-500/10" />
          </div>
          <p className="text-foreground font-semibold text-lg">Đang tải lộ trình của bạn...</p>
        </motion.div>
      </div>
    );
  }

  if (!apiRoadmap) {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
          <BookOpen className="text-muted-foreground h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold">Chưa có lộ trình học tập</h2>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Vui lòng hoàn thành phân tích nghề nghiệp và nhấn &quot;Bắt đầu lộ trình&quot; để AI thiết lập lộ trình cho bạn.
        </p>
        <button
          onClick={() => router.push('/assessment-result')}
          className="mt-6 rounded-xl bg-violet-600 px-6 py-2.5 font-semibold text-white hover:bg-violet-700 transition-colors"
        >
          Quay lại kết quả
        </button>
      </div>
    );
  }

  const roadmapData = mapApiRoadmap(apiRoadmap);
  const roadmapTitle = apiRoadmap.title;
  const isAIGenerated = true;

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-card border-b border-border/50">
        <div className="container py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Back button when coming from analysis */}
            {careerFromParam && (
              <button
                onClick={() => router.back()}
                className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại phân tích
              </button>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm">
                <BookOpen className="h-4 w-4" />
                Lộ trình cá nhân hóa
              </div>
              {isAIGenerated && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 px-3 py-1 text-xs font-semibold text-violet-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Được tạo bởi AI
                </div>
              )}
            </div>

            <h1 className="font-display text-2xl font-bold md:text-3xl">{roadmapTitle}</h1>
            <p className="text-muted-foreground mt-1">
              {isAIGenerated
                ? `Lộ trình học tập AI cá nhân hóa cho nghề ${careerFromParam ?? roadmapTitle}`
                : 'Dựa trên profile và mục tiêu của bạn'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mt-6 space-y-4">
        {roadmapData.map((phase, i) => {
          const isExpanded = expanded === i;
          const isCurrent = phase.status === 'current';
          const isLocked = phase.status === 'locked';

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card overflow-hidden rounded-2xl ${isLocked ? 'opacity-60' : ''}`}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : i)}
                className="flex w-full cursor-pointer items-center gap-4 p-6 text-left"
              >
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                    isCurrent ? 'bg-gradient-hero' : isLocked ? 'bg-muted' : 'bg-mint'
                  }`}
                >
                  {isCurrent ? (
                    <Clock className="text-primary-foreground h-6 w-6" />
                  ) : isLocked ? (
                    <Target className="text-muted-foreground h-6 w-6" />
                  ) : (
                    <Trophy className="text-primary-foreground h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {phase.phase}
                  </div>
                  <div className="text-lg font-semibold">
                    {phase.title}
                    {isLocked && (
                      <Lock className="text-muted-foreground ml-2 inline-block h-4 w-4" />
                    )}
                  </div>
                  {isCurrent && (
                    <Progress value={phase.progress} className="mt-2 h-1.5 max-w-[200px]" />
                  )}
                </div>
                {isCurrent && (
                  <Badge className="bg-primary/10 text-primary border-primary/20">Đang học</Badge>
                )}
                {isLocked && (
                  <Badge variant="outline" className="text-muted-foreground border-border gap-1">
                    <Lock className="h-3 w-3" /> Chưa mở
                  </Badge>
                )}
                {!isLocked &&
                  (isExpanded ? (
                    <ChevronUp className="text-muted-foreground h-5 w-5" />
                  ) : (
                    <ChevronDown className="text-muted-foreground h-5 w-5" />
                  ))}
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="space-y-4 px-6 pb-6"
                >
                  {/* Milestones */}
                  <div className="space-y-3">
                    {phase.milestones.map((m, j) => (
                      <div key={j} className="bg-muted/50 flex items-start gap-3 rounded-xl p-3">
                        <CheckCircle2
                          className={`mt-0.5 h-5 w-5 flex-shrink-0 ${m.done ? 'text-mint' : 'text-muted-foreground/30'}`}
                        />
                        <div>
                          <div
                            className={`text-sm font-medium ${m.done ? 'text-muted-foreground line-through' : ''}`}
                          >
                            {m.title}
                          </div>
                          <div className="text-muted-foreground text-xs">{m.desc}</div>
                          {m.tasks && (
                            <ul className="text-muted-foreground mt-2 ml-4 list-disc text-xs">
                              {m.tasks.map((t, ti) => (
                                <li key={ti}>{t}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Skills */}
                  <div>
                    <div className="mb-2 text-sm font-medium">Kỹ năng cần đạt:</div>
                    <div className="flex flex-wrap gap-2">
                      {phase.skills.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* KPI */}
                  <div className="bg-primary/5 border-primary/10 rounded-xl border p-3">
                    <div className="text-primary mb-1 text-xs font-medium">🎯 KPI giai đoạn</div>
                    <div className="text-sm">{phase.kpi}</div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LearningRoadmap;
