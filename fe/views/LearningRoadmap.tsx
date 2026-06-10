'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';

// 🎯 FIX ts(2305): Chỉ import những thực thể thực tế có export tại file service gốc của nhóm ông[cite: 5]
import { GeneratedRoadmap, roadmapService } from '@/lib/roadmap.service';

import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  FileText,
  Layers,
  Loader2,
  Lock,
  Sparkles,
  Square,
  Trophy,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
// 🎯 ĐÃ FIX: Import thêm useCallback từ thư viện React
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// 🎯 FIX KẾ THỪA ts(2430): Dùng Omit gạt bỏ trường number thô cũ trước khi bọc lại trường mở trợ mới cực sạch[cite: 5]
interface IExtendedRoadmap extends Omit<GeneratedRoadmap, 'overallProgress'> {
  overallProgress?: number | undefined;
}

// Định nghĩa Interface mở rộng để hứng trọn cấu hình AI thô từ DB nhóm trả ra[cite: 5]
interface IExtendedPhase {
  phaseId: string;
  title: string;
  estimatedDuration?: string;
  milestones: unknown[];
  objectives?: string[];
}

interface IQuizOption {
  value: number;
  label: string;
}

interface IQuizQuestion {
  questionText: string;
  isMultipleChoice: boolean;
  options: IQuizOption[];
  correctValue: number;
}

interface ILastSubmissionData {
  overallScore: number;
  passed: boolean;
  areasForImprovement: string[];
  submissionContent: {
    textContent?: string;
    quizAnswers?: Array<{ questionIndex: number; selectedValue: number }>;
  };
}

interface IRoadmapTask {
  taskId: string;
  taskTitle: string;
  description?: string;
  formatType?: string;
  quizQuestions?: IQuizQuestion[];
  isRequired: boolean;
  estimatedHours: number;
  order: number;
  lastSubmission?: ILastSubmissionData | null;
}

interface ISkillItem {
  skillName: string;
  targetLevel?: number;
}

interface IMilestoneItem {
  milestoneId: string;
  title: string;
  description: string;
  tasks?: IRoadmapTask[];
  skills?: ISkillItem[];
}

interface ITaskProgressState {
  taskId: string;
  status: 'LOCKED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'SKIPPED' | 'FAILED';
}

interface ISubmissionResponseStructure {
  evaluationResult: {
    passed: boolean;
    overallScore: number;
    areasForImprovement?: string[];
  };
}

interface IMappedTask {
  id: string;
  title: string;
  description: string;
  formatType: string;
  displayBadge: string;
  quizQuestions: IQuizQuestion[];
  isRequired: boolean;
  hours: number;
  status: string;
  lastSubmission: ILastSubmissionData | null;
}

interface IMappedMilestone {
  milestoneId: string;
  title: string;
  desc: string;
  done: boolean;
  tasks: IMappedTask[];
  estimatedWeeks: number;
}

function mapApiRoadmap(roadmap: GeneratedRoadmap) {
  const extendedRoadmap = roadmap as GeneratedRoadmap & { taskProgress?: ITaskProgressState[] };
  const rawProgress = extendedRoadmap.taskProgress;

  // Ép kiểu mảng thô sang bộ khung Extended để bypass linter mượt mà[cite: 5]
  const safePhases = Array.isArray(roadmap?.phases)
    ? (roadmap.phases as unknown as IExtendedPhase[])
    : [];

  return safePhases.map((phase, i: number) => {
    let completedInPhase = 0;
    let totalInPhase = 0;

    // 🎯 FIX ÉP KIỂU ts(2352): Bắc cầu thông mạch gián tiếp qua phân hệ 'unknown' để giải phóng mô hình[cite: 5]
    const safeMilestones = Array.isArray(phase?.milestones)
      ? (phase.milestones as unknown as IMilestoneItem[])
      : [];

    const mappedMilestones: IMappedMilestone[] = safeMilestones.map((m) => {
      const safeTasks = Array.isArray(m?.tasks) ? (m.tasks as IRoadmapTask[]) : [];

      const mappedTasks: IMappedTask[] = safeTasks.map((t) => {
        totalInPhase++;
        const matchState = rawProgress?.find((p) => p.taskId === t.taskId);
        const currentStatus = matchState ? matchState.status : i === 0 ? 'IN_PROGRESS' : 'LOCKED';
        if (currentStatus === 'COMPLETED') completedInPhase++;

        let displayBadge = t.formatType || 'READ';
        if (t.formatType === 'QUIZ') displayBadge = 'Dạng 1: Trắc nghiệm';
        if (t.formatType === 'TEXT') displayBadge = 'Dạng 2: Tự Luận / Code';
        if (t.formatType === 'HYBRID') displayBadge = 'Dạng 3: Phức hợp';

        return {
          id: t.taskId,
          title: t.taskTitle,
          description: t.description || 'Nội dung đang tải...',
          formatType: t.formatType || 'READ',
          displayBadge,
          quizQuestions: Array.isArray(t.quizQuestions) ? t.quizQuestions : [],
          isRequired: t.isRequired,
          hours: t.estimatedHours,
          status: currentStatus,
          lastSubmission: t.lastSubmission || null,
        };
      });

      const isMilestoneDone = mappedTasks.every((t) => t.status === 'COMPLETED');
      return {
        milestoneId: m.milestoneId,
        title: m.title,
        desc: m.description,
        done: isMilestoneDone,
        tasks: mappedTasks,
        estimatedWeeks: 2,
      };
    });

    const phaseProgressPercent =
      totalInPhase > 0 ? Math.round((completedInPhase / totalInPhase) * 100) : 0;

    const isPrevPhaseCompleted =
      i === 0 ||
      (() => {
        const prevPhase = safePhases[i - 1];
        if (!prevPhase) return false;
        const prevSafeMilestones = Array.isArray(prevPhase.milestones)
          ? (prevPhase.milestones as unknown as IMilestoneItem[])
          : [];
        const prevTestTasks = prevSafeMilestones.flatMap((mItem) =>
          Array.isArray(mItem?.tasks)
            ? (mItem.tasks as IRoadmapTask[]).filter((tItem) => tItem.formatType !== 'READ')
            : [],
        );
        const targetsToCheck =
          prevTestTasks.length > 0
            ? prevTestTasks.map((t) => t.taskId)
            : prevSafeMilestones.flatMap((mItem) =>
                Array.isArray(mItem?.tasks)
                  ? (mItem.tasks as IRoadmapTask[]).map((t) => t.taskId)
                  : [],
              );

        return (
          targetsToCheck.length > 0 &&
          targetsToCheck.every(
            (id) => rawProgress?.find((p) => p.taskId === id)?.status === 'COMPLETED',
          )
        );
      })();

    let phaseStatus: 'current' | 'locked' | 'completed' = 'locked';
    if (phaseProgressPercent === 100) phaseStatus = 'completed';
    else if (isPrevPhaseCompleted) phaseStatus = 'current';

    const skillsArray = safeMilestones
      .flatMap((mItem) => {
        const sa = Array.isArray(mItem?.skills) ? (mItem.skills as ISkillItem[]) : [];
        return sa.map((s) => s?.skillName || '');
      })
      .filter(Boolean);

    const safeObjectives = Array.isArray(phase?.objectives) ? phase.objectives : [];
    return {
      phaseId: phase.phaseId,
      phase: phase.estimatedDuration
        ? `Thời lượng chặng: ${phase.estimatedDuration}`
        : `Chặng năng lực`,
      title: phase.title || `Giai đoạn ${i + 1}`,
      status: phaseStatus,
      progress: phaseProgressPercent,
      milestones: mappedMilestones,
      skills: skillsArray.slice(0, 3),
      kpi: safeObjectives.join(' • ') || 'Hoàn thành các bài kiểm tra thực chiến để qua chặng',
    };
  });
}

const stContainerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const stItemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 14 } },
};

const LearningRoadmap = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();

  const roadmapId = searchParams.get('id');
  const careerFromParam = searchParams.get('career');

  const [expanded, setExpanded] = useState<number | null>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [apiRoadmap, setApiRoadmap] = useState<GeneratedRoadmap | null>(null);

  const [activeStudyTaskId, setActiveStudyTaskId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number[]>>({});
  const [textSubmissionValues, setTextSubmissionValues] = useState<Record<string, string>>({});
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const [submissionResult, setSubmissionResult] = useState<{
    taskId: string;
    passed: boolean;
    score: number;
    comments: string[];
  } | null>(null);

  // 🎯 FIX DỨT ĐIỂM LINTER: Bọc hàm nạp dữ liệu bằng useCallback để tránh vòng lặp vô hạn và thông mạch Husky
  const loadRoadmapData = useCallback(
    async (silent = false) => {
      if (!accessToken) return;
      try {
        if (!silent) setIsLoading(true);
        if (roadmapId) {
          const data = await roadmapService.getRoadmapById(accessToken, roadmapId);
          setApiRoadmap(data);
        } else {
          const latest = await roadmapService.getLatestRoadmap(accessToken);
          if (latest) setApiRoadmap(latest);
        }
      } catch {
        toast.error('Không thể đồng bộ dữ liệu lộ trình.');
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [accessToken, roadmapId],
  );

  useEffect(() => {
    void loadRoadmapData();
  }, [loadRoadmapData]); // 🎯 Đã cập nhật dependency khít theo luật React Hook

  const roadmapData = useMemo(() => (apiRoadmap ? mapApiRoadmap(apiRoadmap) : []), [apiRoadmap]);
  const flatTasks = useMemo(
    () => roadmapData.flatMap((p) => p.milestones.flatMap((m) => m.tasks)),
    [roadmapData],
  );
  const activeTaskData = useMemo(
    () => flatTasks.find((t) => t.id === activeStudyTaskId),
    [flatTasks, activeStudyTaskId],
  );

  const handleSelectOption = (
    taskId: string,
    questionIdx: number,
    optionValue: number,
    isMultiple: boolean,
  ) => {
    const key = `${taskId}-${questionIdx}`;
    const currentSelected = quizAnswers[key] || [];

    if (isMultiple) {
      if (currentSelected.includes(optionValue)) {
        setQuizAnswers((prev) => ({
          ...prev,
          [key]: currentSelected.filter((v) => v !== optionValue),
        }));
      } else {
        setQuizAnswers((prev) => ({ ...prev, [key]: [...currentSelected, optionValue] }));
      }
    } else {
      setQuizAnswers((prev) => ({ ...prev, [key]: [optionValue] }));
    }
  };

  const handleSkipPhase = async (phaseTitle: string, tasksInPhase: IMappedTask[]) => {
    if (!accessToken || !apiRoadmap) return;
    const readTasks = tasksInPhase.filter(
      (t) => t.formatType === 'READ' && t.status !== 'COMPLETED',
    );

    if (readTasks.length === 0) {
      toast.info('Các bài học lý thuyết trong giai đoạn này đã hoàn thành sạch sẽ!');
      return;
    }

    try {
      toast.loading(`Đang skip lý thuyết của ${phaseTitle}...`, { id: 'skip-loader' });
      for (const task of readTasks) {
        await apiClient.post(
          '/task-submissions',
          {
            taskId: task.id,
            roadmapId: apiRoadmap._id, // 🎯 FIX ID CHUẨN: Đồng bộ trường mã hóa độc nhất của MongoDB[cite: 5]
            status: 'COMPLETED',
            submissionContent: {
              textContent: 'Học viên chủ động skip lý thuyết tiến vào chặng khảo thí.',
            },
          },
          accessToken,
        );
      }
      toast.success('Skip lý thuyết thành công! Vui lòng thực hiện bài kiểm tra bắt buộc.', {
        id: 'skip-loader',
      });
      await loadRoadmapData(true);
    } catch {
      toast.error('Gặp lỗi khi xử lý bỏ qua bài học.', { id: 'skip-loader' });
    }
  };

  const handleInlineSubmitTask = async (
    taskId: string,
    formatType: string,
    questions: IQuizQuestion[],
  ) => {
    if (!accessToken || !apiRoadmap) return;

    try {
      setIsSubmittingTask(true);
      setSubmissionResult(null);

      const currentTask = flatTasks.find((t) => t.id === taskId);

      let answeredCount = 0;
      for (let idx = 0; idx < questions.length; idx++) {
        const key = `${taskId}-${idx}`;
        if (quizAnswers[key] && quizAnswers[key].length > 0) {
          answeredCount++;
        } else {
          const historicalAns = currentTask?.lastSubmission?.submissionContent?.quizAnswers?.find(
            (a: { questionIndex: number; selectedValue: number }) => a.questionIndex === idx,
          );
          if (historicalAns && historicalAns.selectedValue !== undefined) {
            answeredCount++;
          }
        }
      }

      if ((formatType === 'QUIZ' || formatType === 'HYBRID') && answeredCount < questions.length) {
        toast.warning('Vui lòng hoàn thành toàn bộ câu hỏi trắc nghiệm trước khi nộp bài!');
        setIsSubmittingTask(false);
        return;
      }

      const textValue =
        textSubmissionValues[taskId] !== undefined
          ? textSubmissionValues[taskId]
          : currentTask?.lastSubmission?.submissionContent?.textContent || '';

      if ((formatType === 'TEXT' || formatType === 'HYBRID') && textValue.trim().length < 10) {
        toast.warning('Vui lòng nhập nội dung bài luận phân tích thực hành (tối thiểu 10 ký tự)!');
        setIsSubmittingTask(false);
        return;
      }

      const submissionContent: Record<string, unknown> = {};
      if (formatType === 'QUIZ' || formatType === 'HYBRID') {
        submissionContent.quizAnswers = questions.map((_, idx: number) => {
          const key = `${taskId}-${idx}`;
          let userAnswersForQ = quizAnswers[key] || [];
          if (
            userAnswersForQ.length === 0 &&
            currentTask?.lastSubmission?.submissionContent?.quizAnswers
          ) {
            const historicalAns = currentTask.lastSubmission.submissionContent.quizAnswers.find(
              (a: { questionIndex: number; selectedValue: number }) => a.questionIndex === idx,
            );
            if (historicalAns && historicalAns.selectedValue !== undefined) {
              userAnswersForQ = [historicalAns.selectedValue];
            }
          }
          return {
            questionIndex: idx,
            selectedValue: userAnswersForQ.length > 0 ? userAnswersForQ[0] : 0,
          };
        });
      }
      if (formatType === 'TEXT' || formatType === 'HYBRID')
        submissionContent.textContent = textValue;
      else if (formatType === 'READ')
        submissionContent.textContent = 'Học viên nghiên cứu giáo trình hoàn tất.';

      const res = (await apiClient.post(
        '/task-submissions',
        {
          taskId,
          roadmapId: apiRoadmap._id, // 🎯 FIX ID CHUẨN THỨ 2: Đồng bộ cổng Mongo[cite: 5]
          status: formatType === 'READ' ? 'COMPLETED' : 'SUBMITTED',
          submissionContent,
        },
        accessToken,
      )) as unknown as ISubmissionResponseStructure;

      const evalResult = res.evaluationResult;

      if (formatType !== 'READ') {
        setSubmissionResult({
          taskId,
          passed: evalResult.passed,
          score: evalResult.overallScore,
          comments: evalResult.areasForImprovement || [],
        });

        if (evalResult.passed) {
          const lastPhase = roadmapData[roadmapData.length - 1];
          const currentPhaseOfTask = roadmapData.find((p) =>
            p.milestones.some((m) => m.tasks.some((t) => t.id === taskId)),
          );
          const totalUncompletedLeft = flatTasks.filter(
            (t) => t.status !== 'COMPLETED' && t.id !== taskId,
          ).length;

          if (currentPhaseOfTask?.phaseId === lastPhase?.phaseId && totalUncompletedLeft === 0) {
            void confetti({
              particleCount: 90,
              angle: 55,
              spread: 65,
              origin: { x: 0, y: 0.8 },
              colors: ['#10b981', '#34d399', '#6ee7b7'],
            });
            void confetti({
              particleCount: 90,
              angle: 125,
              spread: 65,
              origin: { x: 1, y: 0.8 },
              colors: ['#8b5cf6', '#a78bfa', '#c084fc'],
            });
            toast.success(
              '🎉 KINH ĐIỂN! Bạn đã hoàn thành toàn vẹn 100% lộ trình thực chiến AI và tốt nghiệp xuất sắc!',
            );
          } else {
            toast.success(
              `Đạt ${evalResult.overallScore}/100 điểm! Hệ thống đã bẻ khóa bài học thành công.`,
            );
          }

          setActiveStudyTaskId(null);
          setTimeout(() => {
            void loadRoadmapData(true);
          }, 400);
        } else {
          toast.error(
            `Kết quả khảo thí chưa đạt: ${evalResult.overallScore}/100 điểm. Vui lòng cải thiện bài làm.`,
          );
        }
      } else {
        toast.success('Hệ thống đã ghi nhận tiến trình học tập.');
        setActiveStudyTaskId(null);
        setTimeout(() => {
          void loadRoadmapData(true);
        }, 400);
      }
    } catch {
      toast.error('Gặp lỗi khi ghi nhận kết quả học tập lên hệ thống.');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  if (isLoading && !apiRoadmap) {
    return (
      <div className="bg-background container mx-auto mt-6 min-h-screen space-y-6 p-6">
        <div className="bg-card/40 border-border/30 h-32 animate-pulse space-y-3 rounded-2xl border p-6">
          <div className="bg-muted/60 h-6 w-1/3 rounded-lg" />
          <div className="bg-muted/40 h-4 w-1/2 rounded-md" />
          <div className="grid grid-cols-4 gap-4 pt-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-muted/30 h-10 rounded-xl" />
            ))}
          </div>
        </div>
        {[1, 2, 3].map((n: number) => (
          <div
            key={n}
            className="bg-card/30 border-border/20 flex h-20 animate-pulse items-center justify-between rounded-2xl border px-6"
          >
            <div className="flex items-center gap-4">
              <div className="bg-muted/40 h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <div className="bg-muted/50 h-4 w-40 rounded" />
                <div className="bg-muted/30 h-3 w-24 rounded" />
              </div>
            </div>
            <div className="bg-muted/40 h-6 w-6 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!apiRoadmap)
    return (
      <div className="text-muted-foreground p-6 text-center">
        Không tìm thấy dữ liệu lộ trình học tập.
      </div>
    );

  const totalWeeks =
    (apiRoadmap.phases || [])?.reduce((acc: number, p) => {
      const extendedPhase = p as unknown as IExtendedPhase;
      const durationStr = extendedPhase?.estimatedDuration || '2 tuần';
      const numericWeeks = parseInt(durationStr.replace(/\D/g, '')) || 2;
      return acc + numericWeeks;
    }, 0) || 6;
  const estimatedMonths = (totalWeeks / 4).toFixed(1);

  return (
    <div className="min-h-screen pb-20">
      <div className="relative overflow-hidden bg-gradient-card border-border/60 border-b px-4 py-12">
        <div className="pointer-events-none absolute top-0 right-0 p-8 opacity-5">
          <Compass className="h-64 w-64" />
        </div>
        <div className="container mx-auto">
          {careerFromParam && (
            <button
              onClick={() => router.back()}
              className="text-muted-foreground hover:text-foreground mb-4 flex cursor-pointer items-center gap-2 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại phân tích nghề
            </button>
          )}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-wider uppercase shadow-sm backdrop-blur-md">
              <BookOpen className="h-3.5 w-3.5 text-violet-400" /> Không gian học thực chiến tích hợp AI
            </div>
          </div>
          <h1 className="text-gradient-animate font-display mb-4 py-2 text-4xl leading-[1.2] font-extrabold tracking-tight md:text-6xl">
            {apiRoadmap.title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-base leading-relaxed font-medium md:text-lg">
            Học tập tăng tiến qua 3 chặng doanh nghiệp cốt lộ. Trải nghiệm hệ thống ma trận câu hỏi
            và không gian biên soạn mã nguồn Code thực hành real-time.
          </p>

          <div className="border-border/40 mt-6 grid grid-cols-2 gap-4 border-t pt-6 md:grid-cols-4">
            <div className="glass-card bg-background/30 border-border/40 flex items-center gap-3 rounded-xl border p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                  Thời gian lộ trình
                </span>
                <span className="text-foreground text-sm font-bold">
                  ~ {estimatedMonths} Tháng{' '}
                  <span className="text-muted-foreground text-xs font-normal">
                    ({totalWeeks} tuần)
                  </span>
                </span>
              </div>
            </div>
            <div className="glass-card bg-background/30 border-border/40 flex items-center gap-3 rounded-xl border p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                  Phân đoạn chặng
                </span>
                <span className="text-foreground text-sm font-bold">
                  {roadmapData.length} Chặng Lớn
                </span>
              </div>
            </div>
            <div className="glass-card bg-background/30 border-border/40 flex items-center gap-3 rounded-xl border p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                  Tiến độ hiện tại
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  {(apiRoadmap as IExtendedRoadmap).overallProgress || 0}% Hoàn tất
                </span>
              </div>
            </div>
            <div className="glass-card bg-background/30 border-border/40 flex items-center gap-3 rounded-xl border p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                  Chuẩn đầu ra
                </span>
                <span className="text-foreground text-sm font-bold">65/100 Điểm Pass</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-6 px-4">
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          {/* CỘT TRÁI */}
          <div
            className={`w-full transition-[width] duration-300 ease-in-out will-change-[width] ${activeStudyTaskId ? 'shrink-0 space-y-3 lg:w-[35%]' : 'space-y-4 lg:w-full'}`}
          >
            {roadmapData.map((phase, i: number) => {
              const isExpanded = expanded === i;
              const isPhaseLocked = phase.status === 'locked' && i > 0;
              const allTasksInPhase = phase.milestones.flatMap((m) => m.tasks);
              const hasUncompletedReadTasks = allTasksInPhase.some(
                (t) => t.formatType === 'READ' && t.status !== 'COMPLETED',
              );

              return (
                <div
                  key={phase.phaseId}
                  className="glass-card border-border/40 bg-card group/phase relative overflow-hidden rounded-2xl border transition-all duration-300 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5"
                >
                  <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent group-hover/phase:animate-[shimmer_2s_infinite]" />

                  <button
                    onClick={() => setExpanded(isExpanded ? null : i)}
                    className="flex w-full cursor-pointer items-center gap-4 p-5 text-left focus:outline-none"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 transition-colors">
                      {phase.status === 'completed' ? (
                        <Trophy className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[9px] font-bold tracking-wider text-violet-400 uppercase">
                        {phase.phase}
                      </span>
                      <div className="flex items-center gap-2">
                        <h3 className="text-foreground/90 mt-0.5 truncate text-base font-bold">
                          {phase.title}
                        </h3>
                        {isPhaseLocked && <Lock className="text-muted-foreground/60 h-3.5 w-3.5" />}
                      </div>
                      <div className="mt-1 flex max-w-xs items-center gap-2">
                        <Progress value={phase.progress} className="bg-muted/60 h-1 flex-1" />
                        <span className="text-muted-foreground text-[11px] font-bold">
                          {phase.progress}%
                        </span>
                      </div>
                    </div>

                    {!isPhaseLocked && phase.progress < 100 && hasUncompletedReadTasks && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mr-1 ml-auto h-7 rounded-md border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-500 transition-all duration-200 hover:bg-amber-500 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleSkipPhase(phase.title, allTasksInPhase);
                        }}
                      >
                        <Sparkles className="mr-1 h-3 w-3 animate-pulse" /> Skip lý thuyết
                      </Button>
                    )}

                    <div
                      className={
                        !isPhaseLocked && phase.progress < 100 && hasUncompletedReadTasks
                          ? ''
                          : 'ml-auto'
                      }
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        variants={stContainerVariants}
                        initial="hidden"
                        animate="show"
                        exit="hidden"
                        className="space-y-4 overflow-hidden px-5 pb-5"
                      >
                        {phase.milestones.map((m: IMappedMilestone, mIdx: number) => {
                          const milestoneReadTasks = m.tasks.filter((t) => t.formatType === 'READ');
                          const isAllReadFinishedInMilestone = milestoneReadTasks.every(
                            (t) => t.status === 'COMPLETED',
                          );

                          return (
                            <motion.div
                              variants={stItemVariants}
                              key={m.milestoneId || mIdx}
                              className="border-border/60 bg-muted/10 relative space-y-3 rounded-xl border p-4"
                            >
                              <div className="bg-background/50 border-border/40 text-muted-foreground absolute top-4 right-4 flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold">
                                <Calendar className="h-3 w-3 text-violet-400" /> ~{m.estimatedWeeks}{' '}
                                Tuần
                              </div>

                              <h4 className="text-foreground/90 flex items-center gap-2 pr-24 text-xs font-bold">
                                <CheckCircle2
                                  className={`h-3.5 w-3.5 ${m.done ? 'text-emerald-500' : 'text-muted-foreground/40'}`}
                                />{' '}
                                {m.title}
                              </h4>

                              <div className="relative ml-1.5 space-y-3 border-l border-dashed border-violet-500/20 pt-1 pl-5">
                                {m.tasks.map((task: IMappedTask) => {
                                  const isTestComponent = task.formatType !== 'READ';
                                  const isTaskLockedByCondition =
                                    isPhaseLocked ||
                                    (isTestComponent && !isAllReadFinishedInMilestone);
                                  const isTaskDone = task.status === 'COMPLETED';
                                  const isThisActive = activeStudyTaskId === task.id;

                                  return (
                                    <div
                                      key={task.id}
                                      className={`group/task relative -left-5 w-[calc(100%+1.25rem)] rounded-xl border p-3.5 transition-all duration-300 ${isThisActive ? 'border-violet-500 bg-violet-500/5 shadow-md shadow-violet-500/5' : isTaskDone ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : isTaskLockedByCondition ? 'border-muted/40 bg-zinc-500/[0.02]' : 'bg-background border-border/80 hover:border-violet-500/20'}`}
                                    >
                                      <div
                                        className={`bg-background absolute top-5.5 left-[-24px] h-2 w-2 rounded-full border transition-all duration-300 ${isTaskDone ? 'border-emerald-500 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : isTaskLockedByCondition ? 'border-muted' : 'animate-pulse border-violet-500 bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]'}`}
                                      />

                                      <div className="flex items-center justify-between gap-2.5">
                                        <div className="min-w-0 flex-1">
                                          <h5
                                            className={`line-clamp-1 text-xs font-bold tracking-tight ${isTaskDone ? 'text-muted-foreground/70 line-through' : isThisActive ? 'text-violet-400' : 'text-foreground'}`}
                                          >
                                            {task.title}
                                          </h5>
                                          <div className="mt-0.5 flex items-center gap-1.5">
                                            <Badge
                                              variant="secondary"
                                              className="text-muted-foreground bg-muted/40 rounded px-1 py-0 text-[8px] font-bold tracking-wide uppercase"
                                            >
                                              {task.formatType}
                                            </Badge>
                                          </div>
                                        </div>

                                        <div className="shrink-0">
                                          {isTaskLockedByCondition ? (
                                            <div className="text-muted-foreground/40 bg-muted/30 border-border/50 flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold select-none">
                                              <Lock className="h-3 w-3" />{' '}
                                              {isTestComponent &&
                                              !isAllReadFinishedInMilestone &&
                                              !isPhaseLocked
                                                ? 'Khóa (Học lý thuyết trước)'
                                                : 'Khóa chặng'}
                                            </div>
                                          ) : (
                                            <Button
                                              size="sm"
                                              variant={isThisActive ? 'hero' : 'outline'}
                                              className="h-7 rounded-md px-2 text-[10px] font-bold"
                                              onClick={() =>
                                                setActiveStudyTaskId(isThisActive ? null : task.id)
                                              }
                                            >
                                              {isThisActive
                                                ? 'Đang mở'
                                                : isTaskDone
                                                  ? 'Đọc lại'
                                                  : isTestComponent
                                                    ? 'Làm bài'
                                                    : 'Học ngay'}
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          );
                        })}

                        <div className="bg-primary/5 border-primary/10 rounded-xl border p-3.5 text-[11px]">
                          <span className="text-primary mb-0.5 block text-[9px] font-bold tracking-wider uppercase">
                            🎯 KPI ĐÁNH GIÁ GIAI ĐOẠN
                          </span>
                          <p className="text-muted-foreground leading-tight">{phase.kpi}</p>

                          {/* 🎯 FIX TRIỆT ĐỂ LỖI ts(2367): Xóa sạch hàng dấu bằng thừa để React map thẻ Badge sạch đẹp[cite: 5] */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {phase.skills.map((s: string) => (
                              <Badge key={s} variant="secondary" className="bg-muted/60 text-[9px]">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* CỘT PHẢI */}
          <AnimatePresence mode="wait">
            {activeStudyTaskId && activeTaskData && (
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ type: 'spring', stiffness: 140, damping: 16 }}
                className="bg-card border-border/60 w-full space-y-5 rounded-2xl border p-6 shadow-xl shadow-violet-500/5 lg:sticky lg:top-6 lg:w-[65%]"
              >
                <div className="border-border/40 flex items-center justify-between border-b pb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="rounded border border-violet-500/20 bg-violet-500/5 px-1.5 text-[9px] font-bold text-violet-400 uppercase"
                      >
                        {activeTaskData.displayBadge}
                      </Badge>
                      <span className="text-muted-foreground flex items-center gap-0.5 text-[11px] font-medium">
                        <Clock className="h-3 w-3" /> ~{activeTaskData.hours} giờ nghiên cứu
                      </span>
                    </div>
                    <h2 className="text-foreground mt-1 truncate text-lg font-bold tracking-tight">
                      {activeTaskData.title}
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground h-8 rounded-lg px-2.5 text-xs font-semibold"
                    onClick={() => setActiveStudyTaskId(null)}
                  >
                    Đóng workspace
                  </Button>
                </div>

                {(() => {
                  const currentEval =
                    submissionResult?.taskId === activeTaskData.id
                      ? submissionResult
                      : activeTaskData.lastSubmission
                        ? {
                            passed: activeTaskData.lastSubmission.passed,
                            score: activeTaskData.lastSubmission.overallScore,
                            comments: activeTaskData.lastSubmission.areasForImprovement || [],
                          }
                        : null;
                  if (!currentEval) return null;
                  return (
                    <div
                      className={`rounded-xl border p-4 transition-all duration-200 ${currentEval.passed ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600' : 'border-rose-500/20 bg-rose-500/5 text-rose-500'}`}
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
                        {currentEval.passed ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        Kết quả bài nộp gần nhất: {currentEval.score}/100 Điểm -{' '}
                        {currentEval.passed ? 'Đạt yêu cầu' : 'Chưa đạt chặng'}
                      </div>
                      {currentEval.comments.length > 0 && (
                        <div className="text-muted-foreground mt-2 space-y-1 border-t border-current/10 pt-2 text-xs">
                          <span className="text-foreground mb-0.5 block font-bold">
                            💡 Khuyến nghị cải thiện cấu phần từ AI Mentor:
                          </span>
                          {currentEval.comments.map((c: string, idx: number) => (
                            <p
                              key={idx}
                              className="border-l border-violet-500/30 pl-3 leading-relaxed font-medium"
                            >
                              {c}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="bg-muted/30 border-border/30 rounded-xl border p-4">
                  <h6 className="text-foreground/90 mb-1.5 flex items-center gap-1.5 text-xs font-bold">
                    <FileText className="h-3.5 w-3.5 text-violet-400" /> Giáo trình hướng dẫn nghiệp
                    vụ:
                  </h6>
                  <p className="text-foreground/80 text-xs leading-relaxed font-medium whitespace-pre-line">
                    {activeTaskData.description}
                  </p>
                </div>

                {(activeTaskData.formatType === 'QUIZ' || activeTaskData.formatType === 'HYBRID') &&
                  activeTaskData.quizQuestions &&
                  activeTaskData.quizQuestions.length > 0 && (
                    <div className="space-y-4 rounded-xl border border-violet-500/10 bg-violet-500/[0.01] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-500/10 pb-3">
                        <div>
                          <h6 className="flex items-center gap-1.5 text-xs font-bold text-violet-400">
                            <Sparkles className="h-3.5 w-3.5" /> Bảng điều khiển khảo thí thông minh
                            Edumee
                          </h6>
                          <p className="text-muted-foreground mt-0.5 text-[10px]">
                            Tiến độ sẽ tự động cập nhật ngay khi bạn tích chọn phương án
                          </p>
                        </div>
                        <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-right">
                          <span className="text-muted-foreground block text-[9px] font-bold tracking-wider uppercase">
                            Tiến độ câu hỏi
                          </span>
                          <span className="text-sm font-bold text-violet-400">
                            {activeTaskData.quizQuestions.reduce((acc: number, _, idx: number) => {
                              const k = `${activeTaskData.id}-${idx}`;
                              const hasLive = quizAnswers[k] && quizAnswers[k].length > 0;
                              const hasHist =
                                activeTaskData.lastSubmission?.submissionContent?.quizAnswers?.some(
                                  (a: { questionIndex: number; selectedValue: number }) =>
                                    a.questionIndex === idx,
                                );
                              return hasLive || hasHist ? acc + 1 : acc;
                            }, 0)}{' '}
                            / {activeTaskData.quizQuestions.length} Câu
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                          Lưới định vị câu hỏi nhanh:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {activeTaskData.quizQuestions.map((_, idx: number) => {
                            const k = `${activeTaskData.id}-${idx}`;
                            const isLive = quizAnswers[k] && quizAnswers[k].length > 0;
                            const isHist =
                              activeTaskData.lastSubmission?.submissionContent?.quizAnswers?.some(
                                (a: { questionIndex: number; selectedValue: number }) =>
                                  a.questionIndex === idx,
                              );
                            const isDone = isLive || isHist;
                            return (
                              <div
                                key={idx}
                                className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold transition-all duration-200 ${isDone ? 'scale-105 border-violet-500 bg-violet-600 font-bold text-white shadow-sm shadow-violet-500/10' : 'bg-background border-border/70 text-muted-foreground/60'}`}
                              >
                                {idx + 1}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="scrollbar-thin max-h-[380px] space-y-4 overflow-y-auto border-t border-violet-500/10 pt-3 pr-1">
                        {activeTaskData.quizQuestions.map((q: IQuizQuestion, qIdx: number) => {
                          const isMultiple = q.isMultipleChoice === true;
                          const key = `${activeTaskData.id}-${qIdx}`;

                          let selectedList = quizAnswers[key];
                          if (
                            !selectedList &&
                            activeTaskData.lastSubmission?.submissionContent?.quizAnswers
                          ) {
                            const historicalAns =
                              activeTaskData.lastSubmission.submissionContent.quizAnswers.find(
                                (a: { questionIndex: number; selectedValue: number }) =>
                                  a.questionIndex === qIdx,
                              );
                            if (historicalAns && historicalAns.selectedValue !== undefined) {
                              selectedList = [historicalAns.selectedValue];
                            }
                          }
                          if (!selectedList) selectedList = [];

                          return (
                            <div
                              key={qIdx}
                              className="bg-background/40 border-border/40 space-y-2 rounded-xl border p-3 text-xs"
                            >
                              <p className="text-foreground/90 flex items-center gap-2 text-xs leading-snug font-bold">
                                <span>
                                  {qIdx + 1}. {q.questionText}
                                </span>
                              </p>
                              <div className="grid grid-cols-1 gap-2 pl-1 md:grid-cols-2">
                                {Array.isArray(q.options) &&
                                  q.options.map((opt: IQuizOption, oIdx: number) => {
                                    const optionVal =
                                      typeof opt.value === 'number' ? opt.value : oIdx + 1;
                                    const isChecked = selectedList.includes(optionVal);

                                    return (
                                      <div
                                        key={oIdx}
                                        onClick={() =>
                                          handleSelectOption(
                                            activeTaskData.id,
                                            qIdx,
                                            optionVal,
                                            isMultiple,
                                          )
                                        }
                                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-all duration-150 ${isChecked ? 'bg-primary/10 border-primary shadow-sm' : 'bg-background border-border/60 hover:bg-muted/40'}`}
                                      >
                                        <div className="text-primary flex shrink-0 items-center justify-center">
                                          {isMultiple ? (
                                            isChecked ? (
                                              <CheckSquare className="h-4 w-4 text-violet-500" />
                                            ) : (
                                              <Square className="text-muted-foreground/40 h-4 w-4" />
                                            )
                                          ) : (
                                            <div
                                              className={`flex h-4 w-4 items-center justify-center rounded-full border ${isChecked ? 'border-violet-500 bg-violet-500/10' : 'border-muted-foreground/40'}`}
                                            >
                                              {isChecked && (
                                                <div className="h-2 w-2 rounded-full bg-violet-500" />
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <span className="text-muted-foreground bg-muted/50 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded text-[10px] font-bold">
                                          {String.fromCharCode(65 + oIdx)}
                                        </span>
                                        <span
                                          className={`truncate text-xs ${isChecked ? 'text-primary font-bold' : 'text-foreground/80'}`}
                                        >
                                          {opt.label}
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {(activeTaskData.formatType === 'TEXT' ||
                  activeTaskData.formatType === 'HYBRID') && (
                  <div className="space-y-2 rounded-xl border border-blue-500/10 bg-blue-500/5 p-4">
                    <h6 className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                      <FileText className="h-3.5 w-3.5" /> Không gian viết mã nguồn Code dự án /
                      Đoạn văn phân tích tự luận (
                      {activeTaskData.formatType === 'HYBRID'
                        ? 'Chiếm 40% trọng số'
                        : '100% trọng số'}
                      )
                    </h6>
                    <textarea
                      value={
                        textSubmissionValues[activeTaskData.id] !== undefined
                          ? textSubmissionValues[activeTaskData.id]
                          : activeTaskData.lastSubmission?.submissionContent?.textContent || ''
                      }
                      onChange={(e) =>
                        setTextSubmissionValues((prev) => ({
                          ...prev,
                          [activeTaskData.id]: e.target.value,
                        }))
                      }
                      placeholder="Gõ đoạn mã nguồn code thực hành hoặc nội dung phân tích nghiệp vụ của bạn vào đây..."
                      className="bg-background border-border/80 placeholder:text-muted-foreground/30 h-40 w-full resize-none rounded-xl border p-3 font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white shadow-md shadow-emerald-600/10 transition-transform hover:bg-emerald-700 active:scale-95"
                    disabled={isSubmittingTask}
                    onClick={() =>
                      handleInlineSubmitTask(
                        activeTaskData.id,
                        activeTaskData.formatType || 'READ',
                        activeTaskData.quizQuestions || [],
                      )
                    }
                  >
                    {isSubmittingTask ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    {activeTaskData.formatType === 'READ'
                      ? 'Xác nhận hoàn thành bài học'
                      : 'Nộp bài chấm điểm tự động'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LearningRoadmap;
