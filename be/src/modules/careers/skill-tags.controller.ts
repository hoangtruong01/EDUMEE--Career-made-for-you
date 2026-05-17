import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { UserRole } from '../../common/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSkillTagDto, UpdateSkillTagDto } from './dto/skill-tag.dto';
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

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a skill tag' })
  @ApiResponse({ status: 201, description: 'Skill tag created successfully', type: SkillTag })
  create(@Body() data: CreateSkillTagDto) {
    return this.skillTagService.create(data);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a skill tag' })
  @ApiResponse({ status: 200, description: 'Skill tag updated successfully', type: SkillTag })
  update(@Param('id') id: string, @Body() data: UpdateSkillTagDto) {
    return this.skillTagService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete a skill tag' })
  @ApiResponse({ status: 200, description: 'Skill tag deleted successfully', type: SkillTag })
  remove(@Param('id') id: string) {
    return this.skillTagService.softDelete(id);
  }
}
