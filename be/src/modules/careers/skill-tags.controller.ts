import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards';
import { SkillTagService } from './services/skill-tag.service';
import { SkillTag } from './schemas/skill-tag.schema';
import type { SkillTagCategory } from './schemas/skill-tag.schema';

@ApiTags('Skill Tags')
@Controller('skill-tags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SkillTagController {
  constructor(private readonly skillTagService: SkillTagService) {}

  @Get()
  @ApiOperation({ summary: 'Get skill tags for career and mentor filters' })
  @ApiQuery({ name: 'careerId', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Skill tags retrieved successfully', type: [SkillTag] })
  findAll(
    @Query('careerId') careerId?: string,
    @Query('category') category?: SkillTagCategory,
    @Query('q') q?: string,
  ) {
    return this.skillTagService.findAll({ careerId, category, q });
  }
}
