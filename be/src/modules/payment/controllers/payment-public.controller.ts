import { Body, Controller, Get, Headers, Param, Post, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { PaymentService } from '../services';

@ApiExcludeController()
@Controller('payments')
export class PaymentPublicController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('sepay/ipn')
  handleSepayIpn(
    @Headers('x-secret-key') secretKey: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.paymentService.handleSepayIpn(secretKey, payload);
  }

  @Get('sepay/checkout/:token')
  async renderSepayCheckout(@Param('token') token: string, @Res() response: Response) {
    const html = await this.paymentService.renderSepayCheckoutPage(token);
    response.type('html').send(html);
  }

  @Get('return/success')
  async handleSuccessReturn(@Query('paymentId') paymentId: string, @Res() response: Response) {
    const html = await this.paymentService.renderPaymentReturnPage('success', paymentId);
    response.type('html').send(html);
  }

  @Get('return/error')
  async handleErrorReturn(@Query('paymentId') paymentId: string, @Res() response: Response) {
    const html = await this.paymentService.renderPaymentReturnPage('error', paymentId);
    response.type('html').send(html);
  }

  @Get('return/cancel')
  async handleCancelReturn(@Query('paymentId') paymentId: string, @Res() response: Response) {
    const html = await this.paymentService.renderPaymentReturnPage('cancel', paymentId);
    response.type('html').send(html);
  }
}
