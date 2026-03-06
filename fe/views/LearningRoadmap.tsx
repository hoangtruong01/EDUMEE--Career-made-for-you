'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  Target,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';

const roadmapData = [
  {
    phase: 'Tháng 1–3',
    title: 'Nền tảng cơ bản',
    status: 'current',
    progress: 35,
    milestones: [
      { title: 'HTML/CSS nâng cao', done: true, desc: 'Responsive design, Flexbox, Grid' },
      { title: 'JavaScript cơ bản', done: true, desc: 'Variables, functions, DOM' },
      { title: 'React cơ bản', done: false, desc: 'Components, props, state' },
      { title: 'Dự án: Portfolio cá nhân', done: false, desc: 'Xây dựng portfolio đầu tiên' },
    ],
    skills: ['HTML/CSS', 'JavaScript', 'React Basics', 'Git'],
    kpi: 'Hoàn thành 1 dự án portfolio & push lên GitHub',
  },
  {
    phase: 'Tháng 4–6',
    title: 'Phát triển kỹ năng',
    status: 'locked',
    progress: 0,
    milestones: [
      { title: 'React nâng cao', done: false, desc: 'Hooks, Context, Router' },
      { title: 'TypeScript', done: false, desc: 'Types, interfaces, generics' },
      { title: 'API & Backend cơ bản', done: false, desc: 'REST API, fetch, authentication' },
      { title: 'Dự án: Todo App fullstack', done: false, desc: 'CRUD với database' },
    ],
    skills: ['React Advanced', 'TypeScript', 'REST APIs', 'Database'],
    kpi: 'Hoàn thành 1 fullstack app & deploy live',
  },
  {
    phase: 'Tháng 7–12',
    title: 'Chuyên sâu & Thực chiến',
    status: 'locked',
    progress: 0,
    milestones: [
      { title: 'State management', done: false, desc: 'Redux/Zustand, server state' },
      { title: 'Testing', done: false, desc: 'Unit tests, integration tests' },
      { title: 'Performance', done: false, desc: 'Optimization, lazy loading' },
      { title: 'Dự án: E-commerce hoặc SaaS', done: false, desc: 'Dự án lớn thực tế' },
    ],
    skills: ['State Management', 'Testing', 'CI/CD', 'Performance'],
    kpi: 'Đóng góp open-source & hoàn thành 1 dự án thực tế lớn',
  },
];

const LearningRoadmap = () => {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-card">
        <div className="container py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-primary/10 text-primary mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm">
              <BookOpen className="h-4 w-4" /> Lộ trình cá nhân hóa
            </div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">
              Lộ trình Frontend Developer
            </h1>
            <p className="text-muted-foreground mt-1">Dựa trên profile và mục tiêu của bạn</p>
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
                onClick={() => !isLocked && setExpanded(isExpanded ? null : i)}
                className={`flex w-full items-center gap-4 p-6 text-left ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
                  <div className="text-lg font-semibold">{phase.title}</div>
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
