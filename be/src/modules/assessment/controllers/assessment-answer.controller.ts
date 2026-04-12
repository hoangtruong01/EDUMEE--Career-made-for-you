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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { AssessmentAnswerService } from '../services/assessment-answer.service';
import { UpdateAssessmentAnswerDto, BulkAnswerDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { assertOwnerOrAdmin } from '../../../common/auth';

interface CurrentUserPayload {
  userId: string;
  email: string;
  role: string;
}

@ApiTags('Assessment Answers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('assessment-answers')
export class AssessmentAnswerController {
  constructor(private readonly assessmentAnswerService: AssessmentAnswerService) {}

  @Post()
  @ApiOperation({ summary: 'Answer a question (create new or update existing)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Assessment answer saved successfully' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Answer already exists for this question and user' 
  })
  async answerQuestion(
    @Body() createDto: BulkAnswerDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const answerWithUser = {
      ...createDto,
      userId: user.userId,
    };
    return this.assessmentAnswerService.answerQuestion(answerWithUser);
  }

  @Post('force-create')
  @ApiOperation({ summary: 'Force create a new assessment answer (may cause conflict)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Assessment answer created successfully' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'User đã trả lời câu hỏi này rồi' 
  })
  async create(
    @Body() createDto: BulkAnswerDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const answerWithUser = {
      ...createDto,
      userId: user.userId,
    };
    return this.assessmentAnswerService.create(answerWithUser);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple assessment answers' })
  @ApiResponse({ 
    status: 201, 
    description: 'Assessment answers created successfully' 
  })
  async bulkCreate(
    @Body() answers: BulkAnswerDto[],
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!user?.userId) {
      throw new BadRequestException('User ID not found in JWT token');
    }
    
    // Inject userId from token to all answers
    const answersWithUser = answers.map(answer => ({
      ...answer,
      userId: user.userId,
    }));
    return this.assessmentAnswerService.bulkCreate(answersWithUser);
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
    const filters: Partial<Record<string, Types.ObjectId>> = {};
    if (sessionId) filters.sessionId = new Types.ObjectId(sessionId);
    if (userId) filters.userId = new Types.ObjectId(userId);
    if (questionId) filters.questionId = new Types.ObjectId(questionId);

    return this.assessmentAnswerService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      filters,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get answers for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User answers retrieved successfully' 
  })
  async findByUser(@Param('userId') userId: string, @CurrentUser() user: CurrentUserPayload) {
    assertOwnerOrAdmin(userId, user);
    return this.assessmentAnswerService.findByUser(userId);
  }

  @Get('my-answers')
  @ApiOperation({ summary: 'Get current user answers' })
  @ApiResponse({
    status: 200,
    description: 'User answers retrieved successfully'
  })
  async findMyAnswers(@CurrentUser() user: CurrentUserPayload) {
    return this.assessmentAnswerService.findByUser(user.userId);
  }

  @Get('my-stats')
  @ApiOperation({ summary: 'Get current user answer statistics' })
  @ApiResponse({
    status: 200,
    description: 'User answer statistics retrieved successfully'
  })
  async getMyStats(@CurrentUser() user: CurrentUserPayload) {
    return this.assessmentAnswerService.getUserAnswerStats(user.userId);
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
