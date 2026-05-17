import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthUserLike } from '../../../common/auth';
import { getAuthUserId } from '../../../common/auth';
import { UserRole } from '../../../common/enums/user-role.enum';
import {
  CreateAiPlanPurchaseDto,
  CreateMentorBookingPurchaseDto,
  PaymentWebhookTestDto,
  RefundPaymentDto,
} from '../dto';
import { PaymentService } from '../services';
import { AuditLogService } from '../../audit/audit-log.service';
import { AuditLogCategory, AuditLogStatus } from '../../audit/schema/audit-log.schema';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('ai-plan/purchase')
  @ApiOperation({ summary: 'Create a pending AI plan SePay purchase and return a browser redirect URL' })
  purchaseAiPlan(@Body() dto: CreateAiPlanPurchaseDto, @CurrentUser() user: AuthUserLike) {
    return this.paymentService.purchaseAiPlan(getAuthUserId(user), dto);
  }

  @Post('mentor-booking/purchase')
  @ApiOperation({ summary: 'Create a pending mentor booking SePay purchase and return a browser redirect URL' })
  purchaseMentorBooking(@Body() dto: CreateMentorBookingPurchaseDto, @CurrentUser() user: AuthUserLike) {
    return this.paymentService.purchaseMentorBooking(getAuthUserId(user), dto);
  }

  @Post(':id/sepay/sync')
  @ApiOperation({ summary: 'Sync a SePay payment with the upstream gateway order status' })
  syncSepayPayment(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    return this.paymentService.syncSepayPayment(id, user);
  }

  @Post('webhooks/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Process a verified provider-agnostic payment event (admin test webhook)' })
  webhookTest(
    @Body() dto: PaymentWebhookTestDto,
    @CurrentUser() actor: AuthUserLike & { email?: string; name?: string },
    @Req() request: Request,
  ) {
    return this.withAudit(
      {
        actor,
        request,
        action: 'payments.webhook_test',
        resource: 'payment',
        resourceId: dto.paymentId,
        metadata: { eventType: dto.eventType },
      },
      () => this.paymentService.handleVerifiedPaymentEvent(dto),
    );
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Refund a paid payment and revoke linked premium entitlement (admin)' })
  refund(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser() actor: AuthUserLike & { email?: string; name?: string },
    @Req() request: Request,
  ) {
    return this.withAudit(
      {
        actor,
        request,
        action: 'payments.refund',
        resource: 'payment',
        resourceId: id,
        metadata: { amount: dto.amount, reason: dto.reason },
      },
      () => this.paymentService.refundPayment(id, dto),
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'List payments for the current user' })
  findMine(@CurrentUser() user: AuthUserLike) {
    return this.paymentService.findMine(getAuthUserId(user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment by id for its owner or admin' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    return this.paymentService.findOneForActor(id, user);
  }

  private async withAudit<T>(
    params: {
      actor: AuthUserLike & { email?: string; name?: string };
      request: Request;
      action: string;
      resource: string;
      resourceId?: string;
      metadata?: Record<string, unknown>;
    },
    callback: () => Promise<T>,
  ): Promise<T> {
    try {
      const result = await callback();
      await this.auditLogService.record({
        ...params,
        status: AuditLogStatus.SUCCESS,
        category: AuditLogCategory.USER_ACTION,
      });
      return result;
    } catch (error) {
      await this.auditLogService.record({
        ...params,
        status: AuditLogStatus.FAILED,
        category: AuditLogCategory.USER_ACTION,
        metadata: {
          ...(params.metadata || {}),
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }
}
