'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAssessment } from '@/context/assessment-context';
import { useAuth } from '@/context/auth-context';
import { type AssessmentQuestion, assessmentService } from '@/lib/assessment.service';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Sparkles, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
const Analyzing = ({ progress = 0 }: { progress?: number }) => {
  const messages = [
    'Đang phân tích tính cách của bạn...',
    'Đánh giá kỹ năng và thế mạnh...',
    'Tìm kiếm nghề nghiệp phù hợp...',
    'Tạo lộ trình cá nhân hóa...',
    'Hoàn tất! 🎉',
  ];
  const msgIndex = Math.min(Math.floor(progress / 25), messages.length - 1);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="bg-gradient-hero mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full"
        >
          <Brain className="text-primary-foreground h-10 w-10" />
        </motion.div>
        <h2 className="font-display mb-2 text-2xl font-bold">AI đang phân tích...</h2>
        <p className="text-muted-foreground mb-6">{messages[msgIndex]}</p>
        <Progress value={progress} className="mb-2 h-3" />
        <p className="text-muted-foreground text-sm">{progress}%</p>
      </motion.div>
    </div>
  );
};

const PersonalityTest = () => {
  const { accessToken, isHydrated, isAuthenticated } = useAuth();
  const [step, setStep] = useState(0);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const router = useRouter();
  const { markHasAssessmentResult } = useAssessment();

  useEffect(() => {
    const initialize = async () => {
      if (!isHydrated || !isAuthenticated || !accessToken) {
        return;
      }

      setIsLoading(true);
      setErrorMessage('');
      try {
        const fetchedQuestions = await assessmentService.getQuestions(accessToken);
        if (!fetchedQuestions.length) {
          throw new Error('Chưa có bộ câu hỏi. Vui lòng seed dữ liệu câu hỏi trước.');
        }
        setQuestions(fetchedQuestions);

        let session = await assessmentService.startSession(accessToken).catch(async () => {
          const sessions = await assessmentService.listSessions(accessToken);
          return sessions.find((s) => s.status === 'in_progress') || sessions[0];
        });

        const resolvedSessionId = session?.id || session?._id;
        if (!resolvedSessionId) {
          throw new Error('Không tạo được phiên làm bài.');
        }
        setSessionId(resolvedSessionId);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Không thể tải bài test.');
      } finally {
        setIsLoading(false);
      }
    };

    void initialize();
  }, [accessToken, isAuthenticated, isHydrated]);

  const progress = questions.length > 0 ? ((step + 1) / questions.length) * 100 : 0;
  const currentQ = questions[step];
  const isLast = step === questions.length - 1;

  const getQuestionId = (q: AssessmentQuestion): string => q.id || q._id || '';

  const selectAnswer = (option: 'A' | 'B' | 'C' | 'D') => {
    const qId = getQuestionId(currentQ);
    setAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  const submitAssessment = async () => {
    if (!accessToken || !sessionId) {
      setErrorMessage('Thiếu thông tin phiên làm bài.');
      return;
    }

    setAnalyzing(true);
    setAnalyzingProgress(15);
    setErrorMessage('');

    try {
      const payload = questions.map((q) => {
        const qId = getQuestionId(q);
        const answer = answers[qId];
        return {
          sessionId,
          questionId: qId,
          answer,
        };
      });

      setAnalyzingProgress(35);
      await assessmentService.submitBulkAnswers(accessToken, payload);

      setAnalyzingProgress(55);
      await assessmentService.finishSession(accessToken, sessionId);

      setAnalyzingProgress(75);
      await assessmentService.generateMyAnalysis(accessToken);

      setAnalyzingProgress(95);
      const results = await assessmentService.getMyResults(accessToken);
      if (!results.length) {
        throw new Error('AI chua tra ket qua. Vui long thu lai.');
      }

      setAnalyzingProgress(100);
      markHasAssessmentResult();
      router.push('/assessment-result');
    } catch (error) {
      setAnalyzing(false);
      setErrorMessage(error instanceof Error ? error.message : 'Khong the phan tich ket qua.');
    }
  };

  const next = () => {
    if (isLast) {
      void submitAssessment();
      return;
    }
    setStep((prev) => prev + 1);
  };

  if (analyzing) {
    return <Analyzing progress={analyzingProgress} />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Dang tai bo cau hoi...</p>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive text-sm">
          {errorMessage || 'Khong co cau hoi de hien thi.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Progress header */}
      <div className="bg-card/80 border-border sticky top-0 z-50 border-b backdrop-blur-lg">
        <div className="container flex items-center gap-4 py-4">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
            <motion.div
              className="bg-gradient-hero h-full rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-muted-foreground text-sm font-medium">
            {step + 1}/{personalityQuestions.length}
          </span>
        </div>
      </div>

      {/* Question */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-10 text-center">
                <div className="bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm">
                  <Sparkles className="h-3 w-3" />
                  RIASEC · Cau {step + 1}
                </div>
                <h2 className="font-display text-2xl font-bold md:text-3xl">
                  {currentQ.questionText}
                </h2>
              </div>

              <div className="grid gap-3">
                {currentQ.options.map((option) => {
                  const qId = getQuestionId(currentQ);
                  const selected = answers[qId] === option.value;
                  return (
                    <motion.button
                      key={option.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectAnswer(option.value)}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        selected
                          ? 'border-primary bg-primary/5 shadow-soft'
                          : 'border-border hover:border-primary/30 bg-card'
                      }`}
                    >
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                          selected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        }`}
                      >
                        {selected && <CheckCircle2 className="text-primary-foreground h-4 w-4" />}
                      </div>
                      <span className="font-medium">
                        {option.value}. {option.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {errorMessage && <p className="text-destructive mt-4 text-sm">{errorMessage}</p>}

          <div className="mt-8 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </Button>
            <Button
              variant="hero"
              size="lg"
              onClick={next}
              disabled={!answers[getQuestionId(currentQ)]}
              className="gap-2"
            >
              {isLast ? (
                <>
                  Xem kết quả <Zap className="h-4 w-4" />
                </>
              ) : (
                <>
                  Tiếp theo <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalityTest;
