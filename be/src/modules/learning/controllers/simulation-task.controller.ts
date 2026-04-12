import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SimulationTaskService } from '../services/simulation-task.service';
import { CreateSimulationTaskDto, UpdateSimulationTaskDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../../common/enums/user-role.enum';

@ApiTags('simulation-tasks')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('simulation-tasks')
export class SimulationTaskController {
  constructor(private readonly simulationTaskService: SimulationTaskService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new simulation task' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Task created successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createDto: CreateSimulationTaskDto) {
    return this.simulationTaskService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all simulation tasks' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tasks retrieved successfully' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('careerId') careerId?: string,
    @Query('taskType') taskType?: string,
    @Query('difficulty') difficulty?: string,
  ) {
    const filters = {
      ...(careerId ? { careerId } : {}),
      ...(taskType ? { taskType } : {}),
      ...(difficulty ? { difficulty } : {}),
    } as Parameters<SimulationTaskService['findAll']>[2];

    return this.simulationTaskService.findAll(page, limit, filters);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search tasks by criteria' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Search results retrieved successfully' })
  searchTasks(@Query() criteria: any) {
    return this.simulationTaskService.searchTasks(criteria);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get task analytics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Analytics retrieved successfully' })
  getAnalytics(@Query('taskId') taskId?: string) {
    return this.simulationTaskService.getTaskAnalytics(taskId);
  }

  @Get('career/:careerId')
  @ApiOperation({ summary: 'Get tasks by career' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tasks retrieved successfully' })
  findByCareer(@Param('careerId') careerId: string) {
    return this.simulationTaskService.findByCareer(careerId);
  }

  @Get('type/:taskType')
  @ApiOperation({ summary: 'Get tasks by type' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tasks retrieved successfully' })
  findByType(@Param('taskType') taskType: string) {
    return this.simulationTaskService.findByType(
      taskType as Parameters<SimulationTaskService['findByType']>[0],
    );
  }

  @Get('difficulty/:difficulty')
  @ApiOperation({ summary: 'Get tasks by difficulty' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tasks retrieved successfully' })
  findByDifficulty(@Param('difficulty') difficulty: string) {
    return this.simulationTaskService.findByDifficulty(
      difficulty as Parameters<SimulationTaskService['findByDifficulty']>[0],
    );
  }

  @Get('skill/:skillName')
  @ApiOperation({ summary: 'Get tasks by skill' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tasks retrieved successfully' })
  findBySkill(@Param('skillName') skillName: string) {
    return this.simulationTaskService.findBySkill(skillName);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get recommended tasks for a user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Recommendations retrieved successfully' })
  getRecommendedTasks(
    @Query('userId') userId: string,
    @Query('currentSkills') currentSkills: string,
    @Query('targetLevel') targetLevel: string,
    @Query('limit') limit?: number,
  ) {
    const skillsArray = currentSkills.split(',');
    return this.simulationTaskService.getRecommendedTasks(userId, skillsArray, targetLevel, limit);
  }

  @Get('learning-path/:careerId/:targetLevel')
  @ApiOperation({ summary: 'Get tasks by learning path' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tasks retrieved successfully' })
  getTasksByLearningPath(
    @Param('careerId') careerId: string,
    @Param('targetLevel') targetLevel: string,
  ) {
    return this.simulationTaskService.getTasksByLearningPath(careerId, targetLevel);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a simulation task by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Task retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Task not found' })
  findOne(@Param('id') id: string) {
    return this.simulationTaskService.findOne(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a task' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Task duplicated successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  duplicateTask(@Param('id') id: string, @Body() modifications?: any) {
    return this.simulationTaskService.duplicateTask(
      id,
      modifications as Parameters<SimulationTaskService['duplicateTask']>[1],
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a simulation task' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Task updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Task not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateDto: UpdateSimulationTaskDto) {
    return this.simulationTaskService.update(id, updateDto);
  }

  @Put(':id/statistics')
  @ApiOperation({ summary: 'Update task statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics updated successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatistics(@Param('id') id: string, @Body() submissionResult: any) {
    return this.simulationTaskService.updateTaskStatistics(id, submissionResult);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a simulation task' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Task deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Task not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.simulationTaskService.remove(id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Permanently delete a simulation task' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Task permanently deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Task not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  hardDelete(@Param('id') id: string) {
    return this.simulationTaskService.hardDelete(id);
  }
}
