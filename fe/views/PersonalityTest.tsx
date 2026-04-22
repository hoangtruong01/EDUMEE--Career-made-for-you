'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAssessment } from '@/context/assessment-context';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Sparkles, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const personalityQuestions = [
  {
    id: 1,
    category: 'Tính cách',
    question: 'Khi gặp vấn đề mới, bạn thường:',
    options: [
      'Phân tích logic từng bước',
      'Tìm giải pháp sáng tạo',
      'Hỏi ý kiến người khác',
      'Thử nghiệm ngay lập tức',
    ],
  },
  {
    id: 2,
    category: 'Tính cách',
    question: 'Trong nhóm, bạn thường đảm nhận vai trò:',
    options: ['Người dẫn dắt', 'Người lên ý tưởng', 'Người hòa giải', 'Người thực thi'],
  },
  {
    id: 3,
    category: 'Tính cách',
    question: 'Bạn cảm thấy thoải mái nhất khi:',
    options: [
      'Làm việc một mình, tập trung',
      'Brainstorm cùng nhóm',
      'Hướng dẫn người khác',
      'Giải quyết vấn đề kỹ thuật',
    ],
  },
  {
    id: 4,
    category: 'Kỹ năng',
    question: 'Bạn tự tin nhất ở kỹ năng nào?',
    options: [
      'Tư duy phân tích',
      'Giao tiếp & thuyết trình',
      'Sáng tạo & thiết kế',
      'Quản lý & tổ chức',
    ],
  },
  {
    id: 5,
    category: 'Kỹ năng',
    question: 'Bạn có kinh nghiệm với lĩnh vực nào?',
    options: [
      'Lập trình / Công nghệ',
      'Marketing / Kinh doanh',
      'Thiết kế / Nghệ thuật',
      'Nghiên cứu / Khoa học',
    ],
  },
  {
    id: 6,
    category: 'Kỹ năng',
    question: 'Bạn học tốt nhất bằng cách nào?',
    options: [
      'Đọc tài liệu & nghiên cứu',
      'Thực hành dự án thực tế',
      'Xem video & nghe giảng',
      'Thảo luận & trao đổi',
    ],
  },
  {
    id: 7,
    category: 'Giá trị',
    question: 'Điều gì thúc đẩy bạn trong công việc?',
    options: [
      'Thành tựu & phát triển bản thân',
      'Thu nhập & ổn định tài chính',
      'Tác động xã hội & ý nghĩa',
      'Tự do & linh hoạt',
    ],
  },
  {
    id: 8,
    category: 'Giá trị',
    question: 'Môi trường làm việc lý tưởng của bạn:',
    options: [
      'Startup năng động',
      'Tập đoàn lớn ổn định',
      'Freelance / Remote',
      'Tổ chức phi lợi nhuận',
    ],
  },
  {
    id: 9,
    category: 'Xu hướng',
    question: 'Bạn quan tâm đến xu hướng nào?',
    options: [
      'AI & Machine Learning',
      'Blockchain & Web3',
      'Green Tech & Bền vững',
      'Healthcare & Biotech',
    ],
  },
  {
    id: 10,
    category: 'Xu hướng',
    question: 'Bạn sẵn sàng đầu tư bao lâu để học kỹ năng mới?',
    options: [
      '1-3 tháng (học nhanh)',
      '3-6 tháng (trung bình)',
      '6-12 tháng (chuyên sâu)',
      '1-2 năm (chuyên gia)',
    ],
  },
];

const Analyzing = ({ onDone }: { onDone: () => void }) => {
  const [progress, setProgress] = useState(0);
  const messages = [
    'Đang phân tích tính cách của bạn...',
    'Đánh giá kỹ năng và thế mạnh...',
    'Tìm kiếm nghề nghiệp phù hợp...',
    'Tạo lộ trình cá nhân hóa...',
    'Hoàn tất! 🎉',
  ];
  const msgIndex = Math.min(Math.floor(progress / 25), messages.length - 1);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setTimeout(onDone, 500);
          return 100;
        }
        return p + 2;
      });
    }, 80);
    return () => clearInterval(timer);
  }, [onDone]);

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
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const router = useRouter();
  const { markHasAssessmentResult } = useAssessment();

  const progress = ((step + 1) / personalityQuestions.length) * 100;
  const currentQ = personalityQuestions[step];
  const isLast = step === personalityQuestions.length - 1;

  const selectAnswer = (option: string) => {
    setAnswers({ ...answers, [currentQ.id]: option });
  };

  const next = () => {
    if (isLast) {
      setAnalyzing(true);
    } else {
      setStep(step + 1);
    }
  };

  if (analyzing) {
    return (
      <Analyzing
        onDone={() => {
          markHasAssessmentResult();
          router.push('/assessment-result');
        }}
      />
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
                  {currentQ.category} · Câu {step + 1}
                </div>
                <h2 className="font-display text-2xl font-bold md:text-3xl">{currentQ.question}</h2>
              </div>

              <div className="grid gap-3">
                {currentQ.options.map((option) => {
                  const selected = answers[currentQ.id] === option;
                  return (
                    <motion.button
                      key={option}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectAnswer(option)}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        selected
                          ? 'border-primary bg-primary/5 shadow-soft'
                          : 'border-border hover:border-primary/30 bg-card'
                      }`}
                    >
                      <div
                        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                          selected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        }`}
                      >
                        {selected && <CheckCircle2 className="text-primary-foreground h-4 w-4" />}
                      </div>
                      <span className="font-medium">{option}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

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
              disabled={!answers[currentQ.id]}
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
