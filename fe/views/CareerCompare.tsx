'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Brain, DollarSign, Heart, TrendingUp, Zap } from 'lucide-react';
import { useState } from 'react';

const allCareers = [
  {
    id: 'frontend',
    name: 'Frontend Developer',
    salary: { min: 8, max: 45, avg: 20 },
    pressure: 3,
    growth: 5,
    skills: ['React', 'TypeScript', 'CSS', 'UI/UX sense'],
    personality: ['Sáng tạo', 'Chi tiết', 'Kiên nhẫn'],
    trend: 'Rất cao',
    match: 92,
  },
  {
    id: 'ba',
    name: 'Business Analyst',
    salary: { min: 10, max: 40, avg: 22 },
    pressure: 4,
    growth: 4,
    skills: ['Phân tích', 'SQL', 'Communication', 'Documentation'],
    personality: ['Logic', 'Giao tiếp tốt', 'Tỉ mỉ'],
    trend: 'Cao',
    match: 78,
  },
  {
    id: 'data',
    name: 'Data Scientist',
    salary: { min: 12, max: 55, avg: 28 },
    pressure: 3,
    growth: 5,
    skills: ['Python', 'Statistics', 'ML/AI', 'SQL'],
    personality: ['Logic', 'Tò mò', 'Kiên nhẫn'],
    trend: 'Rất cao',
    match: 85,
  },
];

const PressureBar = ({ level }: { level: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex flex-1 gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`h-2 w-full rounded-full ${i <= level ? 'bg-accent' : 'bg-muted'}`}
        />
      ))}
    </div>
    <span className="text-muted-foreground w-7 text-right text-xs font-medium">{level}/5</span>
  </div>
);

const GrowthBar = ({ level }: { level: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex flex-1 gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`h-2 w-full rounded-full ${i <= level ? 'bg-mint' : 'bg-muted'}`} />
      ))}
    </div>
    <span className="text-muted-foreground w-7 text-right text-xs font-medium">{level}/5</span>
  </div>
);

const CareerCompare = () => {
  const [selected, setSelected] = useState<string[]>(['frontend', 'ba']);

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) {
      if (selected.length > 1) setSelected(selected.filter((s) => s !== id));
    } else if (selected.length < 3) {
      setSelected([...selected, id]);
    }
  };

  const selectedCareers = allCareers.filter((c) => selected.includes(c.id));

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-card">
        <div className="container py-8">
          <h1 className="font-display mb-2 text-2xl font-bold md:text-3xl">So sánh nghề nghiệp</h1>
          <p className="text-muted-foreground">Chọn 2-3 ngành để so sánh chi tiết</p>
        </div>
      </div>

      <div className="container mt-6 space-y-6">
        {/* Selector */}
        <div className="flex flex-wrap gap-2">
          {allCareers.map((c) => (
            <Button
              key={c.id}
              variant={selected.includes(c.id) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSelect(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {selectedCareers.map((career, i) => (
            <motion.div
              key={career.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card space-y-5 rounded-2xl p-5"
            >
              {/* Header */}
              <div className="text-center">
                <h3 className="font-display text-base font-semibold">{career.name}</h3>
                <div className="bg-primary/10 text-primary mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium">
                  <Heart className="h-3 w-3" />
                  {career.match}% phù hợp
                </div>
              </div>

              {/* Salary */}
              <div>
                <div className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
                  <DollarSign className="h-3 w-3" /> Thu nhập
                </div>
                <div className="text-mint text-lg font-bold">
                  {career.salary.min}-{career.salary.max}M
                </div>
                <div className="text-muted-foreground text-xs">
                  Trung bình: {career.salary.avg}M
                </div>
              </div>

              {/* Pressure */}
              <div>
                <div className="text-muted-foreground mb-2 flex items-center gap-1 text-xs">
                  <Zap className="h-3 w-3" /> Áp lực
                </div>
                <PressureBar level={career.pressure} />
              </div>

              {/* Growth */}
              <div>
                <div className="text-muted-foreground mb-2 flex items-center gap-1 text-xs">
                  <TrendingUp className="h-3 w-3" /> Thăng tiến
                </div>
                <GrowthBar level={career.growth} />
              </div>

              {/* Skills */}
              <div>
                <div className="text-muted-foreground mb-2 flex items-center gap-1 text-xs">
                  <Brain className="h-3 w-3" /> Kỹ năng
                </div>
                <div className="flex flex-wrap gap-1">
                  {career.skills.map((s) => (
                    <span
                      key={s}
                      className="bg-sky-light text-primary rounded-full px-2 py-0.5 text-xs"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Personality */}
              <div>
                <div className="text-muted-foreground mb-2 flex items-center gap-1 text-xs">
                  <Heart className="h-3 w-3" /> Tính cách phù hợp
                </div>
                <div className="flex flex-wrap gap-1">
                  {career.personality.map((p) => (
                    <span
                      key={p}
                      className="bg-lavender text-secondary rounded-full px-2 py-0.5 text-xs"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Trend */}
              <div className="border-border border-t pt-2 text-center">
                <div className="text-muted-foreground text-xs">Xu hướng 5 năm</div>
                <div className="text-mint text-sm font-semibold">{career.trend}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CareerCompare;
