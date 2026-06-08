// be/src/modules/dashboard/services/dashboard.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { AIService } from '../../../common/services/ai.service';
import {
  LearningRoadmap,
  LearningRoadmapDocument,
} from '../../learning/schemas/learning-roadmap.schema2';
import {
  UserLearningProfile,
  UserLearningProfileDocument,
} from '../../learning/schemas/user-learning-profile.schema';
import {
  AnalyticsEvent,
  AnalyticsEventDocument,
} from '../../tracking/schema/analytics-event.schema';
import {
  AiCourseRecommendationDto,
  DashboardResponseDto,
  PendingTaskReminderDto,
} from '../dto/dashboard.dto';

interface IDashboardTaskIdNode {
  $oid?: string;
  _id?: string | Types.ObjectId;
}

interface IDashboardMilestone {
  milestoneId: string;
  title: string;
  order: number;
  taskIds?: IDashboardTaskIdNode[];
}

interface IDashboardPhase {
  phaseId: string;
  title: string;
  order: number;
  milestones?: IDashboardMilestone[];
}

interface IFlatTask {
  taskId: string;
  taskTitle: string;
  formatType: string;
  phaseTitle: string;
}

interface IDashboardTaskProgress {
  taskId: string | Types.ObjectId | { $oid: string };
  status: string;
  startedAt?: Date;
  completedAt?: Date;
  score?: number;
}

// 🎯 CONTRACT GIỮA CÁC TRƯỜNG ĐỘNG ĐỂ VƯỢT QUA BỘ LỌC STRICT TYPESCRIPT LINTER
interface IIsolatedProfileContract {
  exploredCareersCount?: number;
  exploredCareerIds?: string[];
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly aiCache = new Map<
    string,
    { data: AiCourseRecommendationDto[]; timestamp: number }
  >();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(
    @InjectModel(LearningRoadmap.name)
    private readonly roadmapModel: Model<LearningRoadmapDocument>,
    @InjectModel(UserLearningProfile.name)
    private readonly learningProfileModel: Model<UserLearningProfileDocument>,
    @InjectModel(AnalyticsEvent.name)
    private readonly analyticsModel: Model<AnalyticsEventDocument>,
    private readonly aiService: AIService,
  ) {}

  /**
   * 🎯 HÀM TĂNG CHỈ SỐ DUY NHẤT: Kiểm tra trùng lặp ID ngành nghề trước khi bẻ khóa cộng số đếm
   */
  async incrementExplorationCount(userId: string, careerId: string): Promise<{ success: boolean }> {
    const userObjectId = new Types.ObjectId(userId);

    // 1. Dùng .lean() đọc object thô từ database lên để quét mảng chống kẹt Schema chặn trường
    const rawProfile = await this.learningProfileModel
      .findOne({ userId: userObjectId })
      .lean()
      .exec();
    const typedProfile = rawProfile as unknown as IIsolatedProfileContract | null;

    const currentCareerIds: string[] = typedProfile?.exploredCareerIds || [];
    const currentCount = typedProfile?.exploredCareersCount || 0;

    // 🛑 CHẶN ĐỨNG TRÙNG LẶP: Nếu ID nghề này đã tồn tại trong danh sách đã xem, thoát luôn không cộng số!
    if (currentCareerIds.includes(careerId)) {
      return { success: true };
    }

    // 2. Nếu là ngành nghề mới hoàn toàn, đẩy vào mảng quản lý độc bản
    currentCareerIds.push(careerId);

    // 3. Tiến hành cập nhật nguyên tử lên MongoDB với cờ lệnh strict: false
    await this.learningProfileModel
      .updateOne(
        { userId: userObjectId },
        {
          $set: {
            exploredCareerIds: currentCareerIds,
            exploredCareersCount: currentCount + 1, // Chỉ tăng tịnh tiến duy nhất +1 tại đây
          },
          $setOnInsert: {
            currentStreak: 1,
            longestStreak: 1,
            lastActiveDate: new Date(),
            totalTasksCompleted: 0,
            achievements: [],
            totalHoursSpent: 0,
          },
        },
        { upsert: true, strict: false }, // strict: false ép Mongoose nhận trường mới tinh[cite: 6]
      )
      .exec();

    return { success: true };
  }

  async getDashboardData(userId: string): Promise<DashboardResponseDto> {
    const userObjectId = new Types.ObjectId(userId);

    const activeRoadmap = await this.roadmapModel
      .findOne({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .exec();

    const streakData = await this.calculateAndFlushStreak(userId);

    const profile = await this.learningProfileModel.findOne({ userId: userObjectId }).lean().exec();
    const typedProfile = profile as unknown as IIsolatedProfileContract | null;
    const exploreClicks = typedProfile?.exploredCareersCount || 0;

    if (!activeRoadmap) {
      return {
        hasActiveRoadmap: false,
        stats: {
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          totalTasksCompleted: 0,
          exploredCareersCount: exploreClicks,
          uncompletedTasksCount: 0,
          achievements: [],
        },
        aiRecommendations: [],
        pendingTasks: [],
      };
    }

    const flatTasks: IFlatTask[] = [];
    const safePhases = (activeRoadmap.phases as unknown as IDashboardPhase[]) || [];

    safePhases.forEach((p) => {
      const milestones = p.milestones || [];
      milestones.forEach((m) => {
        const taskIdsList = m.taskIds || [];
        if (Array.isArray(taskIdsList)) {
          taskIdsList.forEach((t, index) => {
            let extractedTaskId = '';
            if (t.$oid) {
              extractedTaskId = t.$oid;
            } else if (t._id) {
              extractedTaskId = t._id.toString();
            }

            if (extractedTaskId) {
              flatTasks.push({
                taskId: extractedTaskId,
                taskTitle: `Nhiệm vụ số ${index + 1} - Mốc ${m.title}`,
                formatType: 'READ',
                phaseTitle: p.title,
              });
            }
          });
        }
      });
    });

    const rawProgress = (activeRoadmap.taskProgress as unknown as IDashboardTaskProgress[]) || [];
    const completedTaskIds = new Set<string>();
    let hasPerfectScore = false;

    rawProgress.forEach((p) => {
      if (p.status === 'COMPLETED') {
        const pTaskId = p.taskId;
        if (pTaskId && typeof pTaskId === 'object' && '$oid' in pTaskId) {
          completedTaskIds.add(String(pTaskId.$oid));
        } else if (pTaskId) {
          completedTaskIds.add(pTaskId.toString());
        }

        if (p.score === 100) {
          hasPerfectScore = true;
        }
      }
    });

    const completedCount = flatTasks.filter((t) => completedTaskIds.has(t.taskId)).length;
    const remainingCount = flatTasks.length - completedCount;

    const currentInProgTask =
      flatTasks.find((t) => {
        const match = rawProgress.find((p) => {
          let pTaskIdStr = '';
          if (p.taskId) {
            if (typeof p.taskId === 'object' && '$oid' in p.taskId) {
              pTaskIdStr = (p.taskId as { $oid: string }).$oid;
            } else {
              pTaskIdStr = p.taskId.toString();
            }
          }
          return pTaskIdStr === t.taskId;
        });
        return match && match.status === 'IN_PROGRESS';
      }) ||
      flatTasks.find((t) => !completedTaskIds.has(t.taskId)) ||
      flatTasks[0];

    const pendingTasksList: PendingTaskReminderDto[] = flatTasks
      .filter((t) => !completedTaskIds.has(t.taskId))
      .slice(0, 3)
      .map((t) => ({
        taskId: t.taskId,
        title: t.taskTitle,
        formatType: t.formatType,
        phaseTitle: t.phaseTitle,
      }));

    const dynamicAchievements: string[] = [];
    if (completedCount > 0) dynamicAchievements.push('PHASE_LAUNCHER');
    if (hasPerfectScore) dynamicAchievements.push('PERFECT_SCORE');
    if (streakData.currentStreak >= 2 && completedCount >= 3)
      dynamicAchievements.push('SPEED_RUNNER');
    if (exploreClicks >= 3) dynamicAchievements.push('EXPLORER_PRO');
    if (streakData.currentStreak >= 3) dynamicAchievements.push('STREAK_MASTER');

    const typedRoadmap = activeRoadmap as unknown as { overallProgress?: number };
    if (typedRoadmap.overallProgress === 100 || remainingCount === 0) {
      dynamicAchievements.push('ROADMAP_CONQUEROR');
    }

    const recommendations = await this.getOrCacheAiRecommendations(
      activeRoadmap._id.toString(),
      activeRoadmap.title,
    );

    const rawProgressPercentage = typedRoadmap.overallProgress || 0;

    return {
      hasActiveRoadmap: true,
      stats: {
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        totalTasksCompleted: completedCount,
        exploredCareersCount: exploreClicks,
        uncompletedTasksCount: remainingCount,
        achievements: dynamicAchievements,
      },
      activeRoadmap: {
        roadmapId: activeRoadmap._id.toString(),
        careerTitle: activeRoadmap.title,
        overallProgressPercentage: rawProgressPercentage,
        completedCount,
        remainingCount,
        currentState: {
          phaseTitle: currentInProgTask?.phaseTitle || 'Giai đoạn khởi động chặng',
          taskTitle: currentInProgTask?.taskTitle || 'Nghiên cứu giáo trình',
        },
      },
      aiRecommendations: recommendations,
      pendingTasks: pendingTasksList,
    };
  }

  private async calculateAndFlushStreak(
    userId: string,
  ): Promise<{ currentStreak: number; longestStreak: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let profile = await this.learningProfileModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();

    if (!profile) {
      profile = new this.learningProfileModel({
        userId: new Types.ObjectId(userId),
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: today,
      });
      await profile.save();
      return { currentStreak: 1, longestStreak: 1 };
    }

    const lastActive = profile.lastActiveDate ? new Date(profile.lastActiveDate) : null;
    if (lastActive) lastActive.setHours(0, 0, 0, 0);

    if (!lastActive) {
      profile.currentStreak = 1;
      profile.lastActiveDate = today;
    } else {
      const diffTime = today.getTime() - lastActive.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        profile.currentStreak += 1;
        if (profile.currentStreak > profile.longestStreak) {
          profile.longestStreak = profile.currentStreak;
        }
        profile.lastActiveDate = today;
      } else if (diffDays > 1) {
        profile.currentStreak = 1;
        profile.lastActiveDate = today;
      }
    }

    await profile.save();
    return { currentStreak: profile.currentStreak, longestStreak: profile.longestStreak };
  }

  async getAiRecommendationsIsolated(careerTitle: string): Promise<AiCourseRecommendationDto[]> {
    const cacheKey = `rec_isolated_${careerTitle.replace(/\s+/g, '_')}`;
    const cached = this.aiCache.get(cacheKey) as {
      data: AiCourseRecommendationDto[];
      timestamp: number;
    } | null;
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    // 🎯 FIX BUG NGẦM JSON: Đã bổ sung dấu ngoặc kép chuẩn xác cho "authorityScore"
    const prompt = `
      Bạn là chuyên gia phân tích thị trường giáo dục cao cấp. Hãy đề xuất từ 3 đến 7 nguồn tài liệu hoặc khóa học trực tuyến (Coursera, Udemy, edX, LinkedIn Learning) chất lượng và chuyên sâu nhất cho ngành nghề: "${careerTitle}".

      Trả về cấu trúc mảng JSON chính xác không giải thích thêm:
      [
        {
          "courseName": "Tên khóa học hoặc nguồn tài liệu tiếng Việt cụ thể chuyên sâu",
          "provider": "Tên nền tảng cung cấp (Ví dụ: Google, Meta, IBM...)",
          "url": "https://coursera.org hoặc link thực tế",
          "reason": "Lý do chi tiết chứng minh nguồn này cực kỳ hữu ích cho lộ trình học viên",
          "type": "Course",
          "matchScore": 95,
          "authorityScore": 94,
          "dotColor": "bg-blue-400"
        }
      ]
      Lưu ý: Chỉ nhả duy nhất chuỗi JSON mảng phẳng, tuyệt đối không bọc trong markdown code blocks. Không dùng dấu ngoặc kép đôi trong nội dung text, chỉ dùng nháy đơn.
    `;

    try {
      // 🎯 FIX TRIỆT ĐỂ TS(2554): Bỏ tham số 'true' dư thừa để khớp khít với signature của hàm gốc
      const text = await this.aiService.generateText(prompt);
      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
      }

      const parsedRecommendations = JSON.parse(cleaned) as unknown as AiCourseRecommendationDto[];

      if (Array.isArray(parsedRecommendations) && parsedRecommendations.length > 0) {
        this.aiCache.set(cacheKey, { data: parsedRecommendations, timestamp: Date.now() });
        return parsedRecommendations;
      }
      throw new Error('Dữ liệu AI trả về không đúng cấu trúc mảng mong muốn');
    } catch (error) {
      this.logger.error('Lỗi khi cô lập sinh tài liệu học tập bổ trợ:', error);

      const fallbackRecommendations: AiCourseRecommendationDto[] = [
        {
          courseName: `Khóa học chuyên sâu ${careerTitle} chuyên nghiệp trên Coursera`,
          provider: 'Google / Meta Enterprise',
          url: '[https://coursera.org](https://coursera.org)',
          reason: 'Cung cấp nền tảng tư duy cấu trúc doanh nghiệp lõi.',
          type: 'Course',
          matchScore: 98,
          authorityScore: 96,
          dotColor: 'bg-blue-400',
        },
        {
          courseName: `Bí quyết làm chủ nghiệp vụ chuyên môn ${careerTitle} thực chiến`,
          provider: 'Udemy Academic',
          url: '[https://udemy.com](https://udemy.com)',
          reason:
            'Tích lũy các kỹ thuật và quy trình xử lý lỗi thực tế phát sinh tại doanh nghiệp.',
          type: 'Course',
          matchScore: 92,
          authorityScore: 88,
          dotColor: 'bg-emerald-400',
        },
      ];
      return fallbackRecommendations;
    }
  }

  // 🎯 TỐI ƯU: Cho hàm cũ gọi chuyển tiếp sang hàm mới để không phá vỡ cấu trúc tích hợp cũ của DashboardData
  private async getOrCacheAiRecommendations(
    _roadmapId: string,
    careerTitle: string,
  ): Promise<AiCourseRecommendationDto[]> {
    return this.getAiRecommendationsIsolated(careerTitle);
  }
}
