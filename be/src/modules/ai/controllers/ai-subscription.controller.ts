import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { getAuthUserId } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';
import { AssignAiSubscriptionDto, UpsertAiSubscriptionDto } from '../dto';
import { AiSubscriptionService } from '../services/ai-subscription.service';
import { AiQuotaService } from '../services/ai-quota.service';
import { AiFeature } from '../schema/ai-usage-logs.schema';
import { BillingCycle } from '../../users/schemas/user-subscriptions';

type QuotaView = {
  used: number;
  limit: number;
  remaining: number;
};

@ApiTags('ai-subscriptions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('ai-subscriptions')
export class AiSubscriptionController {
  constructor(
    private readonly aiSubscriptionService: AiSubscriptionService,
    private readonly aiQuotaService: AiQuotaService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manual subscription override for user (admin backoffice)' })
  upsert(@Body() dto: UpsertAiSubscriptionDto) {
    return this.aiSubscriptionService.upsertActiveSubscription({
      userId: dto.userId,
      planId: dto.planId,
      billingCycle: dto.billingCycle,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @Post('admin/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign AI plan to selected user, with email/phone fallback (admin)' })
  assign(@Body() dto: AssignAiSubscriptionDto) {
    return this.aiSubscriptionService.assignUserToPlan({
      userId: dto.userId,
      identifier: dto.identifier,
      planId: dto.planId,
      billingCycle: dto.billingCycle,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel subscription (admin)' })
  cancel(@Param('id') id: string) {
    return this.aiSubscriptionService.cancelSubscription(id);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user plan + remaining quota (monthly)' })
  async me(@CurrentUser() user: AuthUserLike) {
    const userId = getAuthUserId(user);
    const plan = await this.aiQuotaService.getPlanForUserOrFree(userId);
    const activeSubscription = await this.aiSubscriptionService.getActiveSubscriptionForUser(userId);
    const featuresToShow: Record<string, AiFeature> = {
      assessment: AiFeature.ASSESSMENT,
      careerComparison: AiFeature.CAREER_COMPARISON,
      aiChat: AiFeature.CHATBOT,
      roadmap: AiFeature.PERSONALIZED_ROADMAP,
      simulation: AiFeature.SIMULATION,
      mentorBooking: AiFeature.MENTOR_BOOKING,
    };
    const quotaEntries = await Promise.all(
      Object.entries(featuresToShow).map(async ([key, feature]) => {
        try {
          const quota = await this.aiQuotaService.getRemainingQuota(userId, feature);
          return [key, this.toQuotaView(quota)] as const;
        } catch {
          return [key, this.toQuotaView()] as const;
        }
      }),
    );

    return {
      currentPlan: this.resolveCurrentPlanCode(plan?.name),
      source: activeSubscription ? this.resolveSubscriptionSource(plan?.name) : 'default',
      subscriptionStatus: activeSubscription?.status || null,
      billingCycle: activeSubscription?.billingCycle || null,
      expiresAt: activeSubscription?.endDate || null,
      seatLimit: plan?.seatLimit || null,
      plan,
      quotas: Object.fromEntries(quotaEntries),
      features: {
        careerComparison: plan?.features?.careerComparison === true,
        personalizedRoadmap: plan?.features?.personalizedRoadmap === true,
        jobSimulation: plan?.features?.jobSimulation === true,
        mentorBooking: plan?.features?.mentorBooking === true,
        teamDashboard: plan?.features?.teamDashboard === true,
        reportExport: plan?.features?.reportExport === true,
        multiUserManagement: plan?.features?.multiUserManagement === true,
      },
      subscription: activeSubscription
        ? {
            status: activeSubscription.status,
            billingCycle: activeSubscription.billingCycle,
            startDate: activeSubscription.startDate,
            endDate: activeSubscription.endDate,
          }
        : null,
      availableBillingCycles: plan?.allowedBillingCycles || [BillingCycle.MONTHLY],
    };
  }

  private resolveCurrentPlanCode(planName?: string | null): 'free' | 'plus' | 'business' {
    const normalized = planName?.trim().toLowerCase();
    if (normalized === 'business') return 'business';
    if (normalized === 'plus') return 'plus';
    return 'free';
  }

  private resolveSubscriptionSource(planName?: string | null): 'personal_subscription' | 'business_subscription' {
    return this.resolveCurrentPlanCode(planName) === 'business'
      ? 'business_subscription'
      : 'personal_subscription';
  }

  private toQuotaView(quota?: {
    limit?: number;
    used: number;
    remaining?: number;
    unlimited: boolean;
  }): QuotaView {
    if (!quota || quota.unlimited) {
      return { used: quota?.used || 0, limit: 0, remaining: 0 };
    }

    return {
      used: quota.used,
      limit: quota.limit ?? 0,
      remaining: quota.remaining ?? 0,
    };
  }
}
