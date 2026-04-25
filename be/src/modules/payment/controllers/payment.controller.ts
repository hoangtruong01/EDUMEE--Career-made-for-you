import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthUserLike } from '../../../common/auth';
import { getAuthUserId } from '../../../common/auth';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CreateAiPlanPurchaseDto, PaymentWebhookTestDto, RefundPaymentDto } from '../dto';
import { PaymentService } from '../services';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('ai-plan/purchase')
  @ApiOperation({ summary: 'Create a pending AI plan SePay purchase and return a browser redirect URL' })
  purchaseAiPlan(@Body() dto: CreateAiPlanPurchaseDto, @CurrentUser() user: AuthUserLike) {
    return this.paymentService.purchaseAiPlan(getAuthUserId(user), dto);
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
  webhookTest(@Body() dto: PaymentWebhookTestDto) {
    return this.paymentService.handleVerifiedPaymentEvent(dto);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Refund a paid payment and revoke linked premium entitlement (admin)' })
  refund(@Param('id') id: string, @Body() dto: RefundPaymentDto) {
    return this.paymentService.refundPayment(id, dto);
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
}
