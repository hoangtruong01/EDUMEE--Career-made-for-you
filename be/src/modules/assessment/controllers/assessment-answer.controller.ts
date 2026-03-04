import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AssessmentAnswerService } from '../services/assessment-answer.service';
import { CreateAssessmentAnswerDto, UpdateAssessmentAnswerDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Assessment Answers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessment-answers')
export class AssessmentAnswerController {
  constructor(private readonly assessmentAnswerService: AssessmentAnswerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new assessment answer' })
  @ApiResponse({ 
    status: 201, 
    description: 'Assessment answer created successfully' 
  })
  async create(@Body() createDto: CreateAssessmentAnswerDto) {
    return this.assessmentAnswerService.create(createDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple assessment answers' })
  @ApiResponse({ 
    status: 201, 
    description: 'Assessment answers created successfully' 
  })
  async bulkCreate(@Body() answers: CreateAssessmentAnswerDto[]) {
    return this.assessmentAnswerService.bulkCreate(answers);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assessment answers with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'questionId', required: false, type: String })
  @ApiResponse({ 
    status: 200, 
    description: 'Assessment answers retrieved successfully' 
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sessionId') sessionId?: string,
    @Query('userId') userId?: string,
    @Query('questionId') questionId?: string,
  ) {
    const filters: any = {};
    if (sessionId) filters.sessionId = sessionId;
    if (userId) filters.userId = userId;
    if (questionId) filters.questionId = questionId;

    return this.assessmentAnswerService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      filters,
    );
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get all answers for a specific session' })
  @ApiParam({ name: 'sessionId', description: 'Assessment session ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Session answers retrieved successfully' 
  })
  async findBySession(@Param('sessionId') sessionId: string) {
    return this.assessmentAnswerService.findBySession(sessionId);
  }

  @Get('session/:sessionId/progress')
  @ApiOperation({ summary: 'Get session progress and statistics' })
  @ApiParam({ name: 'sessionId', description: 'Assessment session ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Session progress retrieved successfully' 
  })
  async getSessionProgress(@Param('sessionId') sessionId: string) {
    return this.assessmentAnswerService.calculateSessionProgress(sessionId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get answers for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  @ApiResponse({ 
    status: 200, 
    description: 'User answers retrieved successfully' 
  })
  async findByUser(
    @Param('userId') userId: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.assessmentAnswerService.findByUser(userId, sessionId);
  }

  @Get('my-answers')
  @ApiOperation({ summary: 'Get current user answers' })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  @ApiResponse({ 
    status: 200, 
    description: 'User answers retrieved successfully' 
  })
  async findMyAnswers(
    @CurrentUser() user: any,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.assessmentAnswerService.findByUser(user.id, sessionId);
  }

  @Get('question/:questionId')
  @ApiOperation({ summary: 'Get answers for a specific question' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Question answers retrieved successfully' 
  })
  async findByQuestion(@Param('questionId') questionId: string) {
    return this.assessmentAnswerService.findByQuestion(questionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an assessment answer by ID' })
  @ApiParam({ name: 'id', description: 'Assessment answer ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Assessment answer retrieved successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Assessment answer not found' 
  })
  async findOne(@Param('id') id: string) {
    return this.assessmentAnswerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an assessment answer' })
  @ApiParam({ name: 'id', description: 'Assessment answer ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Assessment answer updated successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Assessment answer not found' 
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAssessmentAnswerDto,
  ) {
    return this.assessmentAnswerService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an assessment answer' })
  @ApiParam({ name: 'id', description: 'Assessment answer ID' })
  @ApiResponse({ 
    status: 204, 
    description: 'Assessment answer deleted successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Assessment answer not found' 
  })
  async remove(@Param('id') id: string) {
    return this.assessmentAnswerService.remove(id);
  }
}