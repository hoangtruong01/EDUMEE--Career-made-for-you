import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import {
  OnboardingSession,
  OnboardingSessionDocument,
  OnboardingStatus,
  OnboardingStep,
} from '../schemas/onboarding-session.schema';
import { Types } from 'mongoose';

const ONBOARDING_STEPS_ORDER: OnboardingStep[] = [
  OnboardingStep.WELCOME,
  OnboardingStep.PROFILE_SETUP,
  OnboardingStep.INTERESTS_SURVEY,
  OnboardingStep.GOALS_SETTING,
  OnboardingStep.ASSESSMENT_INTRO,
  OnboardingStep.BASELINE_ASSESSMENT,
  OnboardingStep.CAREER_PREFERENCES,
  OnboardingStep.LEARNING_PREFERENCES,
  OnboardingStep.PLATFORM_FEATURES,
  OnboardingStep.FIRST_RECOMMENDATIONS,
  OnboardingStep.COMPLETION,
];

function hasMongoDuplicateKeyCode(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return 'code' in error && (error as { code?: unknown }).code === 11000;
}

@Injectable()
export class OnboardingSessionService {
  constructor(
    @InjectModel(OnboardingSession.name)
    private onboardingSessionModel: Model<OnboardingSessionDocument>,
  ) { }

  async createForUser(userId: string, createDto: object): Promise<OnboardingSessionDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const existing = await this.onboardingSessionModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
    if (existing) {
      throw new ConflictException('Onboarding session already exists');
    }

    const now = new Date();
    const stepProgress = ONBOARDING_STEPS_ORDER.map((stepId, idx) => ({
      stepId,
      status: idx === 0 ? 'current' : 'not_reached',
      startedAt: idx === 0 ? now : undefined,
    }));

    const session = new this.onboardingSessionModel({
      userId: new Types.ObjectId(userId),
      status: OnboardingStatus.IN_PROGRESS,
      startedAt: now,
      progressPercentage: 0,
      stepProgress,
      ...createDto,
    });

    try {
      return await session.save();
    } catch (e: unknown) {
      if (hasMongoDuplicateKeyCode(e)) {
        throw new ConflictException('Onboarding session already exists');
      }
      throw e;
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: FilterQuery<OnboardingSessionDocument> = {},
  ): Promise<{ data: OnboardingSessionDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.onboardingSessionModel.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.onboardingSessionModel.countDocuments(filters).exec(),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<OnboardingSessionDocument> {
    const session = await this.onboardingSessionModel.findById(id).exec();
    if (!session) {
      throw new NotFoundException(`Onboarding session with ID ${id} not found`);
    }
    return session;
  }

  async findByUser(userId: string): Promise<OnboardingSessionDocument | null> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }
    return this.onboardingSessionModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
  }

  async findActive(): Promise<OnboardingSessionDocument[]> {
    return this.onboardingSessionModel.find({ status: 'in_progress' }).exec();
  }

  async findCompleted(): Promise<OnboardingSessionDocument[]> {
    return this.onboardingSessionModel.find({ status: 'completed' }).exec();
  }

  async updateProgress(
    id: string,
    stepId: OnboardingStep,
    stepData: Record<string, unknown>,
  ): Promise<OnboardingSessionDocument> {
    const session = await this.findOne(id);
    const idx = session.stepProgress.findIndex((s) => s.stepId === stepId);
    if (idx < 0) throw new BadRequestException('Invalid stepId');
    if (session.stepProgress[idx].status !== 'current') {
      throw new BadRequestException('Only the current step can be updated');
    }
    session.stepProgress[idx].stepData = stepData;
    return this.update(id, { stepProgress: session.stepProgress });
  }

  async completeStep(
    id: string,
    step: OnboardingStep,
    stepData: unknown,
  ): Promise<OnboardingSessionDocument> {
    const session = await this.findOne(id);

    const stepProgress = session.stepProgress || [];
    const stepIndex = stepProgress.findIndex(
      (stepItem) => stepItem.stepId === (step),
    );

    if (stepIndex < 0) throw new BadRequestException('Invalid step');

    if (stepProgress[stepIndex].status !== 'current') {
      throw new BadRequestException('Only the current step can be completed');
    }

    stepProgress[stepIndex].status = 'completed';
    stepProgress[stepIndex].completedAt = new Date();
    stepProgress[stepIndex].stepData = stepData;

    // advance to next step (no skipping)
    const nextIdx = stepIndex + 1;
    if (nextIdx < stepProgress.length) {
      stepProgress[nextIdx].status = 'current';
      stepProgress[nextIdx].startedAt = new Date();
    }

    const completedCount = stepProgress.filter((s) => s.status === 'completed').length;
    const progressPercentage = Math.round((completedCount / stepProgress.length) * 100);

    const isCompleted = nextIdx >= stepProgress.length;

    return this.update(id, {
      stepProgress,
      progressPercentage,
      status: isCompleted ? OnboardingStatus.COMPLETED : OnboardingStatus.IN_PROGRESS,
      completedAt: isCompleted ? new Date() : undefined,
    });
  }

  async completeOnboarding(id: string): Promise<OnboardingSessionDocument> {
    return this.update(id, {
      status: OnboardingStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  async update(
    id: string,
    updateDto: object,
  ): Promise<OnboardingSessionDocument> {
    const session = await this.onboardingSessionModel
      .findByIdAndUpdate(id, updateDto as Partial<OnboardingSession>, { new: true })
      .exec();
    if (!session) {
      throw new NotFoundException(`Onboarding session with ID ${id} not found`);
    }
    return session;
  }

  async remove(id: string): Promise<OnboardingSessionDocument> {
    const session = await this.onboardingSessionModel.findByIdAndDelete(id).exec();
    if (!session) {
      throw new NotFoundException(`Onboarding session with ID ${id} not found`);
    }
    return session;
  }

  async getStatistics(): Promise<any> {
    const stats = await this.onboardingSessionModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    return stats;
  }
}
