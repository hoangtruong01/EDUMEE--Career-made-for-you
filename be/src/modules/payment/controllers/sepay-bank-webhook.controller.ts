import { Body, Controller, Headers, Post, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { PaymentService } from '../services';

@ApiExcludeController()
@Controller('hooks')
export class SepayBankWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('sepay-payments')
  async handleSepayPayments(
    @Headers('authorization') authorization: string | undefined,
    @Body() payload: Record<string, unknown>,
    @Res() response: Response,
  ) {
    await this.paymentService.handleSepayBankWebhook(authorization, payload);
    response.status(200).json({ success: true });
  }
}
