import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiPlan, AiPlanDocument, PlanName } from '../schema/ai-plan.schema';

@Injectable()
export class AiPlanSeedService implements OnModuleInit {
  private readonly logger = new Logger(AiPlanSeedService.name);

  constructor(
    @InjectModel(AiPlan.name)
    private readonly aiPlanModel: Model<AiPlanDocument>,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultPlans();
  }

  private async ensureDefaultPlans(): Promise<void> {
    const existing = await this.aiPlanModel.find({ name: { $in: [PlanName.FREE, PlanName.PLUS, PlanName.PRO] } }).lean().exec();
    const existingNames = new Set(existing.map((p) => p.name));

    const toCreate: Partial<AiPlan>[] = [];

    if (!existingNames.has(PlanName.FREE)) {
      toCreate.push({
        name: PlanName.FREE,
        price: 0,
        limits: {
          assessmentsPerMonth: 1,
          careerRecommendationRunsPerMonth: 1,
          maxCareerRecommendationsPerRun: 3,
          maxCareersPerComparison: 0,
        },
        features: {
          careerRecommendation: true,
          careerComparison: false,
          personalizedRoadmap: false,
          jobSimulation: false,
          aiChatbot: false,
          mentorBooking: false,
        },
      });
    }

    if (!existingNames.has(PlanName.PLUS)) {
      toCreate.push({
        name: PlanName.PLUS,
        price: 0,
        limits: {},
        features: {
          careerRecommendation: true,
          careerComparison: true,
          personalizedRoadmap: true,
          jobSimulation: true,
          aiChatbot: true,
          mentorBooking: true,
        },
      });
    }

    if (!existingNames.has(PlanName.PRO)) {
      toCreate.push({
        name: PlanName.PRO,
        price: 0,
        limits: {},
        features: {
          careerRecommendation: true,
          careerComparison: true,
          personalizedRoadmap: true,
          jobSimulation: true,
          aiChatbot: true,
          mentorBooking: true,
        },
      });
    }

    if (toCreate.length === 0) return;

    await this.aiPlanModel.insertMany(toCreate, { ordered: true });
    this.logger.log(`Seeded AI plans: ${toCreate.map((p) => p.name).join(', ')}`);
  }
}

