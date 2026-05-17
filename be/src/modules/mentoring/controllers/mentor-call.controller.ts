import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthUserLike } from '../../../common/auth';
import { MentorCallService } from '../services/mentor-call.service';

@ApiTags('mentor-calls')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('mentor-calls')
export class MentorCallController {
  constructor(private readonly mentorCallService: MentorCallService) {}

  @Get(':meetingCode')
  @ApiOperation({ summary: 'Get mentor call details for a confirmed booking' })
  @ApiResponse({ status: 200, description: 'Mentor call details retrieved successfully' })
  getSummary(@Param('meetingCode') meetingCode: string, @CurrentUser() user: AuthUserLike) {
    return this.mentorCallService.getSummary(meetingCode, user);
  }

  @Post(':meetingCode/token')
  @ApiOperation({ summary: 'Create a LiveKit join token for a mentor call' })
  @ApiResponse({ status: 201, description: 'LiveKit token created successfully' })
  createToken(@Param('meetingCode') meetingCode: string, @CurrentUser() user: AuthUserLike) {
    return this.mentorCallService.createJoinToken(meetingCode, user);
  }
}
