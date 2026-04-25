import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CreateAiPlanDto, UpdateAiPlanDto } from '../dto';
import { AiPlanService } from '../services/ai-plan.service';

@ApiTags('ai-plans')
@Controller('ai-plans')
export class AiPlanController {
  constructor(private readonly aiPlanService: AiPlanService) {}

  @Get()
  @ApiOperation({ summary: 'List public AI plans for purchase and display' })
  catalog() {
    return this.aiPlanService.findCatalog();
  }

  @Get('catalog')
  @ApiOperation({ summary: 'List public AI plans for purchase and display (legacy alias)' })
  catalogAlias() {
    return this.aiPlanService.findCatalog();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List AI plans for admin management' })
  findAllAdmin() {
    return this.aiPlanService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get AI plan by id (admin)' })
  findOne(@Param('id') id: string) {
    return this.aiPlanService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create AI plan (admin)' })
  @ApiResponse({ status: HttpStatus.CREATED })
  create(@Body() dto: CreateAiPlanDto) {
    return this.aiPlanService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update AI plan (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateAiPlanDto) {
    return this.aiPlanService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete AI plan (admin)' })
  async remove(@Param('id') id: string) {
    await this.aiPlanService.remove(id);
  }
}
