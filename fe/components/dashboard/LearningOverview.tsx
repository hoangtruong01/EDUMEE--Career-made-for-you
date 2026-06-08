'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useCancelRoadmap, useDashboardData } from '@/hooks/useDashboardData';
import {
  AlertCircle,
  BookOpen,
  Clock,
  Compass,
  Flame,
  Target,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

export function LearningOverview() {
  const { data, isLoading, isError } = useDashboardData();
  const cancelMutation = useCancelRoadmap();

  // 1. TRẠNG THÁI LOADING (Skeleton UI mượt mà, không dùng Spinner giật cục)
  if (isLoading) {
    return (
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) return null;

  const { stats, hasActiveRoadmap, activeRoadmap, pendingTasks } = data;
  // Trích xuất nhiệm vụ đầu tiên từ mảng nhắc nhở của Backend
  const nextTask = pendingTasks && pendingTasks.length > 0 ? pendingTasks[0] : null;

  return (
    <div className="mb-8 space-y-6">
      {/* KHỐI 1: THỐNG KÊ NHANH (GAMIFICATION) */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="Chuỗi ngày học"
          value={`${stats.currentStreak} ngày`}
          icon={Flame}
          color="text-orange-500"
        />
        <StatCard
          title="Kỷ lục chuỗi"
          value={`${stats.longestStreak} ngày`}
          icon={Target}
          color="text-red-500"
        />
        <StatCard
          title="Đã hoàn thành"
          value={`${stats.totalTasksCompleted} bài`}
          icon={BookOpen}
          color="text-blue-500"
        />
        <StatCard
          title="Nghề đã khám phá"
          value={`${stats.exploredCareersCount} nghề`}
          icon={Compass}
          color="text-emerald-500"
        />
      </div>

      {/* KHỐI 2: TRẠNG THÁI LỘ TRÌNH (EMPTY STATE & ACTIVE STATE) */}
      {!hasActiveRoadmap ? (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-primary/10 mb-4 rounded-full p-4">
              <Compass className="text-primary h-12 w-12" />
            </div>
            <h3 className="mb-2 text-xl font-bold">Bạn chưa bắt đầu lộ trình nào</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Tìm hiểu thị trường việc làm, so sánh các ngành nghề và chọn cho mình một lộ trình
              phát triển sự nghiệp phù hợp ngay hôm nay.
            </p>
            <Link href="/career-analysis">
              <Button size="lg" className="rounded-full shadow-lg transition-all hover:shadow-xl">
                Khám phá ngay
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        activeRoadmap && (
          <Card className="border-primary/20 relative overflow-hidden">
            <div className="bg-primary absolute top-0 left-0 h-full w-1" />
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-primary mb-1 text-sm font-medium">Đang theo học</p>
                  <CardTitle className="text-2xl">{activeRoadmap.careerTitle}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm('Bạn có chắc chắn muốn từ bỏ lộ trình này?')) {
                      cancelMutation.mutate(activeRoadmap.roadmapId);
                    }
                  }}
                  disabled={cancelMutation.isPending}
                >
                  Từ bỏ lộ trình
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-6 md:flex-row">
                <div className="w-full space-y-4 md:w-2/3">
                  <div className="flex justify-between text-sm">
                    <span>Tiến độ tổng quan</span>
                    {/* 🎯 FIX TRÚNG ĐÍCH TRƯỜNG DỮ LIỆU CHUẨN BACKEND */}
                    <span className="text-primary font-bold">
                      {activeRoadmap.overallProgressPercentage}%
                    </span>
                  </div>
                  <Progress value={activeRoadmap.overallProgressPercentage} className="h-3" />
                  <div className="text-muted-foreground flex gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" /> Đã xong: {activeRoadmap.completedCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" /> Còn lại: {activeRoadmap.remainingCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" /> Dự kiến: ~
                      {/* Ép kiểu bắc cầu gián tiếp để lấy thuộc tính mở rộng an toàn */}
                      {((activeRoadmap as unknown as Record<string, unknown>)
                        .estimatedDaysToComplete as number) || 30}{' '}
                      ngày
                    </span>
                  </div>
                </div>

                {nextTask && (
                  <div className="bg-secondary/50 w-full rounded-xl border p-4 md:w-1/3">
                    <div className="text-secondary-foreground mb-2 flex items-center gap-2 text-sm font-semibold">
                      <AlertCircle className="h-4 w-4 text-orange-500" /> Nhiệm vụ tiếp theo
                    </div>
                    {/* 🎯 Sửa chỗ gọi title luôn */}
                    <p className="line-clamp-2 text-sm font-medium">{nextTask.title}</p>
                    <Link href={`/learning-roadmap`}>
                      <Button className="mt-4 w-full" size="sm">
                        Tiếp tục học
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`bg-secondary rounded-xl p-3 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium">{title}</p>
          <h4 className="text-xl font-bold">{value}</h4>
        </div>
      </CardContent>
    </Card>
  );
}
