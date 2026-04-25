import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { getAuthUserId } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';
import { UpsertAiSubscriptionDto } from '../dto';
import { AiSubscriptionService } from '../services/ai-subscription.service';
import { AiQuotaService } from '../services/ai-quota.service';
import { AiFeature } from '../schema/ai-usage-logs.schema';

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
    const featuresToShow: AiFeature[] = [
      AiFeature.ASSESSMENT,
      AiFeature.CAREER_RECOMMENDATION,
      AiFeature.CAREER_COMPARISON,
      AiFeature.PERSONALIZED_ROADMAP,
      AiFeature.SIMULATION,
      AiFeature.CHATBOT,
    ];
    const quotas = await Promise.all(
      featuresToShow.map(async (f) => {
        try {
          return await this.aiQuotaService.getRemainingQuota(userId, f);
        } catch {
          return { feature: f, month: new Date().getMonth() + 1, year: new Date().getFullYear(), used: 0, unlimited: false, remaining: 0 };
        }
      }),
    );
    return { plan, quotas };
  }
}
