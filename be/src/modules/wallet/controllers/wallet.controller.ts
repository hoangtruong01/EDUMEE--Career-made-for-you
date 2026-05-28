import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { getAuthUserId } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WalletService } from '../services';

@ApiTags('wallet')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user Edumee Credit balance' })
  getMine(@CurrentUser() user: AuthUserLike) {
    return this.walletService.getMyWallet(getAuthUserId(user));
  }

  @Get('me/transactions')
  @ApiOperation({ summary: 'List current user Edumee Credit ledger entries' })
  getMyTransactions(@CurrentUser() user: AuthUserLike) {
    return this.walletService.listTransactions(getAuthUserId(user));
  }

  @Get('me/withdrawals')
  @ApiOperation({ summary: 'List current user withdrawal requests' })
  getMyWithdrawals(@CurrentUser() user: AuthUserLike) {
    return this.walletService.listMyWithdrawals(getAuthUserId(user));
  }

  @Post('me/withdrawals')
  @ApiOperation({ summary: 'Create a withdrawal request for withdrawable wallet balances' })
  createWithdrawal(
    @CurrentUser() user: AuthUserLike,
    @Body()
    body: {
      accountType: string;
      amount: number;
      bankAccountSnapshot?: Record<string, unknown>;
    },
  ) {
    return this.walletService.createWithdrawalRequest({
      userId: getAuthUserId(user),
      accountType: body.accountType,
      amount: Number(body.amount),
      bankAccountSnapshot: body.bankAccountSnapshot,
    });
  }
}
