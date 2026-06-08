// be/scripts/seed-ai-plans.ts
import mongoose, { Model } from 'mongoose';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { AiPlan, AiPlanSchema } from '../src/modules/ai/schema/ai-plan.schema';
import { Payment, PaymentSchema } from '../src/modules/payment/schema/payment.schema';
import {
  BillingCycle,
  UserSubscription,
  UserSubscriptionSchema,
} from '../src/modules/users/schemas/user-subscriptions';

type AiPlanDocumentModel = Model<AiPlan>;
type PaymentModel = Model<Payment>;
type UserSubscriptionModel = Model<UserSubscription>;

type PlanSeed = {
  name: string;
  description: string;
  price: number;
  currency: string;
  isActive: boolean;
  isDefaultPlan: boolean;
  displayOrder: number;
  allowedBillingCycles: BillingCycle[];
  billingCycleDiscounts?: Partial<Record<BillingCycle, number>>;
  seatLimit?: number;
  limits: {
    assessmentsPerMonth?: number;
    assessmentsLifetimeLimit?: number;
    chatMessagesPerMonth?: number;
    careerComparisonsPerMonth?: number;
    maxCareersPerComparison?: number;
    careerRecommendationRunsPerMonth?: number;
    maxCareerRecommendationsPerRun?: number;
    visibleCareerRecommendationsPerRun?: number;
    personalizedRoadmapsPerMonth?: number;
    simulationsPerMonth?: number;
    mentorBookingsPerMonth?: number;
  };
  features: {
    careerRecommendation?: boolean;
    careerComparison?: boolean;
    personalizedRoadmap?: boolean;
    jobSimulation?: boolean;
    aiChatbot?: boolean;
    mentorBooking?: boolean;
    teamDashboard?: boolean;
    reportExport?: boolean;
    multiUserManagement?: boolean;
  };
};

const PLUS_LIMITS: PlanSeed['limits'] = {
  assessmentsPerMonth: 3,
  maxCareerRecommendationsPerRun: 5,
  visibleCareerRecommendationsPerRun: 5,
  chatMessagesPerMonth: 200,
  careerComparisonsPerMonth: 5,
  maxCareersPerComparison: 3,
  personalizedRoadmapsPerMonth: 20,
  simulationsPerMonth: 20,
  mentorBookingsPerMonth: 5,
};

const PLAN_SEEDS: PlanSeed[] = [
  {
    name: 'Free',
    description: 'Goi mac dinh danh cho nguoi dung chua co subscription AI.',
    price: 0,
    currency: 'VND',
    isActive: true,
    isDefaultPlan: true,
    displayOrder: 0,
    allowedBillingCycles: [BillingCycle.MONTHLY],
    limits: {
      assessmentsPerMonth: 1,
      chatMessagesPerMonth: 10,
      careerRecommendationRunsPerMonth: 1,
      maxCareerRecommendationsPerRun: 5,
      visibleCareerRecommendationsPerRun: 3,
      careerComparisonsPerMonth: 0,
      maxCareersPerComparison: 0,
      personalizedRoadmapsPerMonth: 1,
      simulationsPerMonth: 0,
      mentorBookingsPerMonth: 0,
    },
    features: {
      careerRecommendation: true,
      careerComparison: false,
      personalizedRoadmap: true,
      jobSimulation: false,
      aiChatbot: true,
      mentorBooking: false,
    },
  },
  {
    name: 'Plus',
    description: 'Goi nang cap cho nguoi dung ca nhan voi quota AI rong hon.',
    price: 129000,
    currency: 'VND',
    isActive: true,
    isDefaultPlan: false,
    displayOrder: 1,
    allowedBillingCycles: [
      BillingCycle.MONTHLY,
      BillingCycle.THREE_MONTHS,
      BillingCycle.SIX_MONTHS,
    ],
    billingCycleDiscounts: {
      [BillingCycle.THREE_MONTHS]: 7,
      [BillingCycle.SIX_MONTHS]: 12,
    },
    limits: { ...PLUS_LIMITS },
    features: {
      careerRecommendation: true,
      careerComparison: true,
      personalizedRoadmap: true,
      jobSimulation: true,
      aiChatbot: true,
      mentorBooking: true,
    },
  },
  {
    name: 'Business',
    description: 'Goi doanh nghiep voi seat limit va cac tinh nang quan tri nhom.',
    price: 12900000,
    currency: 'VND',
    isActive: true,
    isDefaultPlan: false,
    displayOrder: 2,
    allowedBillingCycles: [BillingCycle.MONTHLY],
    seatLimit: 200,
    limits: { ...PLUS_LIMITS },
    features: {
      careerRecommendation: true,
      careerComparison: true,
      personalizedRoadmap: true,
      jobSimulation: true,
      aiChatbot: true,
      mentorBooking: true,
      teamDashboard: true,
      reportExport: true,
      multiUserManagement: true,
    },
  },
];

function loadEnvFiles(): void {
  const cwd = process.cwd();
  const envFiles = ['.env', '.env.local'];
  const externallyProvidedKeys = new Set(Object.keys(process.env));

  for (const fileName of envFiles) {
    const filePath = path.join(cwd, fileName);
    if (!fs.existsSync(filePath)) continue;

    const parsed = parseEnvFile(filePath);
    for (const [key, value] of Object.entries(parsed)) {
      if (externallyProvidedKeys.has(key)) continue;
      process.env[key] = value;
    }
  }
}

function parseEnvFile(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, 'utf8');
  const entries: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key) continue;

    const rawValue = line.slice(separatorIndex + 1).trim();
    entries[key] = stripWrappingQuotes(rawValue);
  }

  return entries;
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function getDatabaseUri(): string {
  const uri = process.env.DATABASE_URI?.trim() || process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('Missing MongoDB connection string. Set DATABASE_URI or MONGODB_URI.');
  }

  return uri;
}

function getAiPlanModel(): AiPlanDocumentModel {
  const existing = mongoose.models[AiPlan.name] as AiPlanDocumentModel | undefined;
  return existing ?? mongoose.model(AiPlan.name, AiPlanSchema);
}

function getPaymentModel(): PaymentModel {
  const existing = mongoose.models[Payment.name] as PaymentModel | undefined;
  return existing ?? mongoose.model(Payment.name, PaymentSchema);
}

function getSubscriptionModel(): UserSubscriptionModel {
  const existing = mongoose.models[UserSubscription.name] as UserSubscriptionModel | undefined;
  return existing ?? mongoose.model(UserSubscription.name, UserSubscriptionSchema);
}

async function migrateLegacyProPlan(
  aiPlanModel: AiPlanDocumentModel,
  paymentModel: PaymentModel,
  subscriptionModel: UserSubscriptionModel,
): Promise<void> {
  const legacyProPlan = await aiPlanModel.findOne({ name: /^pro$/i }).exec();
  if (!legacyProPlan) return;

  const existingPlusPlan = await aiPlanModel.findOne({ name: /^plus$/i }).exec();
  if (!existingPlusPlan) {
    legacyProPlan.name = 'Plus';
    await legacyProPlan.save();
    console.log('[seed:ai-plans] Renamed legacy Pro plan to Plus.');
    return;
  }

  await Promise.all([
    subscriptionModel
      .updateMany({ planId: legacyProPlan._id }, { $set: { planId: existingPlusPlan._id } })
      .exec(),
    paymentModel
      .updateMany({ planId: legacyProPlan._id }, { $set: { planId: existingPlusPlan._id } })
      .exec(),
  ]);

  await aiPlanModel.deleteOne({ _id: legacyProPlan._id }).exec();
  console.log('[seed:ai-plans] Migrated legacy Pro references to Plus and removed Pro.');
}

async function upsertPlans(aiPlanModel: AiPlanDocumentModel): Promise<void> {
  for (const plan of PLAN_SEEDS) {
    await aiPlanModel.updateOne({ name: plan.name }, { $set: plan }, { upsert: true }).exec();
    console.log(`[seed:ai-plans] Upserted ${plan.name}.`);
  }
}

export async function backfillLegacyVisibleCareerRecommendationLimits(
  aiPlanModel: AiPlanDocumentModel,
): Promise<number> {
  const result = await aiPlanModel
    .updateMany(
      {
        'limits.maxCareerRecommendationsPerRun': { $type: 'number' },
        $or: [
          { 'limits.visibleCareerRecommendationsPerRun': { $exists: false } },
          { 'limits.visibleCareerRecommendationsPerRun': null },
        ],
      },
      [
        {
          $set: {
            'limits.visibleCareerRecommendationsPerRun': '$limits.maxCareerRecommendationsPerRun',
          },
        },
      ],
    )
    .exec();

  const modifiedCount = result.modifiedCount || 0;
  if (modifiedCount > 0) {
    console.log(
      `[seed:ai-plans] Backfilled visible career recommendation limits for ${modifiedCount} legacy plan(s).`,
    );
  }

  return modifiedCount;
}

async function main(): Promise<void> {
  loadEnvFiles();
  await mongoose.connect(getDatabaseUri());

  const aiPlanModel = getAiPlanModel();
  const paymentModel = getPaymentModel();
  const subscriptionModel = getSubscriptionModel();

  await migrateLegacyProPlan(aiPlanModel, paymentModel, subscriptionModel);
  await upsertPlans(aiPlanModel);
  await backfillLegacyVisibleCareerRecommendationLimits(aiPlanModel);

  await aiPlanModel
    .updateMany(
      { name: { $nin: PLAN_SEEDS.map((plan) => plan.name) }, isDefaultPlan: true },
      { $set: { isDefaultPlan: false } },
    )
    .exec();

  console.log('[seed:ai-plans] Completed.');
}

if (require.main === (module as any)) {
  void main()
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[seed:ai-plans] Failed: ${message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected) {
        await mongoose.disconnect();
      }
    });
}
