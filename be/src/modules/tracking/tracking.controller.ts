import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import { TrackingService } from './tracking.service';

@ApiTags('tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('events')
  @ApiOperation({ summary: 'Record an analytics event' })
  async recordEvent(@Body() dto: CreateAnalyticsEventDto, @Req() request: Request) {
    await this.trackingService.recordEvent(dto, request);
    return { received: true };
  }
}
