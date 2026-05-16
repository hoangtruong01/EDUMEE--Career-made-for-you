import { Controller, Get, Param, Patch, Query, Sse, UseGuards } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthUserLike } from '../../../common/auth';
import { NotificationService } from '../services';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List notifications for the current user' })
  findMine(@CurrentUser() user: AuthUserLike) {
    return this.notificationService.findMine(user);
  }

  @Patch('read-all')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark all notifications as read for the current user' })
  markAllRead(@CurrentUser() user: AuthUserLike) {
    return this.notificationService.markAllRead(user);
  }

  @Patch(':id/read')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    return this.notificationService.markRead(id, user);
  }

  @Sse('stream')
  @ApiOperation({ summary: 'Subscribe to realtime notifications with a query token' })
  stream(@Query('token') token: string): Observable<MessageEvent> {
    return this.notificationService.stream(token);
  }
}
