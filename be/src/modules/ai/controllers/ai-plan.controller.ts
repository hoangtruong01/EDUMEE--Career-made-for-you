import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CreateAiPlanDto, UpdateAiPlanDto } from '../dto';
import { AiPlanService } from '../services/ai-plan.service';

@ApiTags('ai-plans')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('ai-plans')
export class AiPlanController {
  constructor(private readonly aiPlanService: AiPlanService) {}

  @Get()
  @ApiOperation({ summary: 'List AI plans (admin)' })
  findAll() {
    return this.aiPlanService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get AI plan by id (admin)' })
  findOne(@Param('id') id: string) {
    return this.aiPlanService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create AI plan (admin)' })
  @ApiResponse({ status: HttpStatus.CREATED })
  create(@Body() dto: CreateAiPlanDto) {
    return this.aiPlanService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update AI plan (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateAiPlanDto) {
    return this.aiPlanService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete AI plan (admin)' })
  async remove(@Param('id') id: string) {
    await this.aiPlanService.remove(id);
  }
}

