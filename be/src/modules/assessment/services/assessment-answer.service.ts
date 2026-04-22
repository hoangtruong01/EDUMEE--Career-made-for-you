import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssessmentAnswer, AssessmentAnswerDocument } from '../schemas/assessment-answer.schema';
import { CreateAssessmentAnswerDto, UpdateAssessmentAnswerDto } from '../dto';
import { AssessmentQuestion, AssessmentQuestionDocument } from '../schemas/assessment-question.schema';
import { AssessmentSession, AssessmentSessionDocument } from '../schemas/assessment-sesions.schema';
import { SessionStatus } from '../enums/assessment.enum';

@Injectable()
export class AssessmentAnswerService {
  constructor(
    @InjectModel(AssessmentAnswer.name)
    private readonly assessmentAnswerModel: Model<AssessmentAnswerDocument>,
    @InjectModel(AssessmentQuestion.name)
    private readonly assessmentQuestionModel: Model<AssessmentQuestionDocument>,
    @InjectModel(AssessmentSession.name)
    private readonly assessmentSessionModel: Model<AssessmentSessionDocument>,
  ) { }

  private async assertSessionOwnershipAndStatus(sessionId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(sessionId)) throw new BadRequestException('Invalid sessionId');
    const session = await this.assessmentSessionModel.findById(sessionId).exec();
    if (!session) throw new NotFoundException('Assessment session not found');
    if (session.userId.toString() !== userId) throw new BadRequestException('Session does not belong to user');
    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Assessment session is not in progress');
    }
  }

  private async assertQuestionActive(questionId: string): Promise<void> {
    if (!Types.ObjectId.isValid(questionId)) throw new BadRequestException('Invalid questionId');
    const q = await this.assessmentQuestionModel.findById(questionId).exec();
    if (!q) throw new NotFoundException('Assessment question not found');
    if (q.isActive === false) throw new BadRequestException('Question is not active');
  }

  private assertAnswerFormat(answer: string): void {
    if (!['A', 'B', 'C', 'D'].includes(answer)) {
      throw new BadRequestException('Invalid answer format');
    }
  }

  async create(createDto: CreateAssessmentAnswerDto): Promise<AssessmentAnswer> {
    try {
      if (!createDto.sessionId) {
        throw new BadRequestException('sessionId is required');
      }
      if (!Types.ObjectId.isValid(String(createDto.sessionId))) {
        throw new BadRequestException('Invalid sessionId');
      }

      await this.assertSessionOwnershipAndStatus(String(createDto.sessionId), String(createDto.userId));
      await this.assertQuestionActive(String(createDto.questionId));
      this.assertAnswerFormat(String(createDto.answer));

      const answer = new this.assessmentAnswerModel({
        ...createDto,
        questionId: new Types.ObjectId(createDto.questionId),
        userId: new Types.ObjectId(createDto.userId),
        sessionId: new Types.ObjectId(createDto.sessionId),
      });
      return answer.save();
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as { code: number }).code === 11000) {
        throw new ConflictException('User đã trả lời câu hỏi này rồi');
      }
      throw error;
    }
  }

  // Trả lời câu hỏi (tạo mới hoặc cập nhật nếu đã trả lời)
  async answerQuestion(createDto: CreateAssessmentAnswerDto): Promise<AssessmentAnswer> {
    if (!createDto.sessionId) {
      throw new BadRequestException('sessionId is required');
    }
    if (!Types.ObjectId.isValid(String(createDto.sessionId))) {
      throw new BadRequestException('Invalid sessionId');
    }

    await this.assertSessionOwnershipAndStatus(String(createDto.sessionId), String(createDto.userId));
    await this.assertQuestionActive(String(createDto.questionId));
    this.assertAnswerFormat(String(createDto.answer));

    const existingAnswer = await this.assessmentAnswerModel
      .findOne({
        questionId: new Types.ObjectId(createDto.questionId),
        userId: new Types.ObjectId(createDto.userId),
        sessionId: new Types.ObjectId(createDto.sessionId),
      })
      .exec();

    if (existingAnswer) {
      // Cập nhật câu trả lời cũ
      return this.assessmentAnswerModel
        .findByIdAndUpdate(
          existingAnswer._id,
          {
            answer: createDto.answer,
            responseTime: createDto.responseTime,
            answeredAt: new Date(),
            metadata: createDto.metadata,
          },
          { new: true, runValidators: true }
        )
        .exec() as Promise<AssessmentAnswer>;
    } else {
      // Tạo câu trả lời mới
      const answer = new this.assessmentAnswerModel({
        ...createDto,
        questionId: new Types.ObjectId(createDto.questionId),
        userId: new Types.ObjectId(createDto.userId),
        sessionId: new Types.ObjectId(createDto.sessionId),
      });
      return answer.save();
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<AssessmentAnswer> = {},
  ): Promise<{ data: AssessmentAnswer[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const query = this.buildQuery(filters);

    const [data, total] = await Promise.all([
      this.assessmentAnswerModel
        .find(query)
        .populate('questionId', 'questionText dimension orderIndex')
        .populate('userId', 'email firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.assessmentAnswerModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<AssessmentAnswer> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid answer ID');
    }

    const answer = await this.assessmentAnswerModel
      .findById(id)
      .populate('questionId', 'questionText dimension')
      .populate('userId', 'email firstName lastName')
      .exec();

    if (!answer) {
      throw new NotFoundException('Assessment answer not found');
    }

    return answer;
  }



  async findByUser(userId: string): Promise<AssessmentAnswer[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const query: Record<string, any> = { userId: new Types.ObjectId(userId) };

    return this.assessmentAnswerModel
      .find(query)
      .populate('questionId', 'questionText dimension orderIndex')
      .sort({ 'questionId.orderIndex': 1, createdAt: 1 })
      .exec();
  }

  async findByQuestion(questionId: string): Promise<AssessmentAnswer[]> {
    if (!Types.ObjectId.isValid(questionId)) {
      throw new BadRequestException('Invalid question ID');
    }

    return this.assessmentAnswerModel
      .find({ questionId: new Types.ObjectId(questionId) })
      .populate('userId', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(id: string, updateDto: UpdateAssessmentAnswerDto): Promise<AssessmentAnswer> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid answer ID');
    }

    const answer = await this.assessmentAnswerModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .populate('questionId', 'questionText dimension')
      .populate('userId', 'email firstName lastName')
      .exec();

    if (!answer) {
      throw new NotFoundException('Assessment answer not found');
    }

    return answer;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid answer ID');
    }

    const result = await this.assessmentAnswerModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Assessment answer not found');
    }
  }

  // Xóa tất cả câu trả lời của user
  async deleteAllByUser(userId: string): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const result = await this.assessmentAnswerModel.deleteMany({
      userId: new Types.ObjectId(userId),
    });

    return result.deletedCount;
  }

  async bulkCreate(answers: CreateAssessmentAnswerDto[]): Promise<AssessmentAnswer[]> {
    if (answers.length === 0) {
      return [];
    }

    // Get userId from first answer (all answers should belong to same user)
    const userId = answers[0].userId;
    const sessionId = answers[0].sessionId;
    if (!sessionId) throw new BadRequestException('sessionId is required for bulk create');
    if (!Types.ObjectId.isValid(String(sessionId))) throw new BadRequestException('Invalid sessionId');

    // Validate all belong to same session
    const allSameSession = answers.every((a) => String(a.sessionId) === String(sessionId));
    if (!allSameSession) throw new BadRequestException('All answers in bulk must belong to the same session');

    await this.assertSessionOwnershipAndStatus(String(sessionId), String(userId));

    // Validate all questions active + answer format
    for (const a of answers) {
      await this.assertQuestionActive(String(a.questionId));
      this.assertAnswerFormat(String(a.answer));
    }

    // Upsert by (userId, questionId) to respect unique index.
    // We intentionally do NOT wipe existing answers here; bulk acts as "submit these answers".

    const answersWithObjectIds = answers.map(answer => ({
      ...answer,
      questionId: new Types.ObjectId(answer.questionId),
      userId: new Types.ObjectId(answer.userId),
      sessionId: new Types.ObjectId(answer.sessionId),
    }));

    const results: AssessmentAnswer[] = [];
    for (const a of answersWithObjectIds) {
      const saved = await this.assessmentAnswerModel
        .findOneAndUpdate(
          { userId: a.userId, questionId: a.questionId },
          {
            $set: {
              sessionId: a.sessionId,
              answer: a.answer,
              responseTime: a.responseTime,
              answeredAt: new Date(),
              metadata: a.metadata,
            },
          },
          { upsert: true, new: true, runValidators: true },
        )
        .exec();
      results.push(saved as unknown as AssessmentAnswer);
    }
    return results;
  }

  // Thống kê đơn giản cho user
  async getUserAnswerStats(userId: string): Promise<{
    totalAnswered: number;
    answersByDimension: Record<string, number>;
    responseTimeStats?: {
      average: number;
      min: number;
      max: number;
    };
  }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const answers = await this.assessmentAnswerModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('questionId', 'dimension')
      .exec();

    const answersByDimension: Record<string, number> = {};
    const responseTimes: number[] = [];

    answers.forEach(answer => {
      const questionId = answer.questionId as { dimension?: string } | undefined;
      const dimension = questionId?.dimension;
      if (dimension && typeof dimension === 'string') {
        answersByDimension[dimension] = (answersByDimension[dimension] || 0) + 1;
      }
      if (answer.responseTime) {
        responseTimes.push(answer.responseTime);
      }
    });

    let responseTimeStats;
    if (responseTimes.length > 0) {
      responseTimeStats = {
        average: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes),
      };
    }

    return {
      totalAnswered: answers.length,
      answersByDimension,
      responseTimeStats,
    };
  }


  private buildQuery(filters: Partial<AssessmentAnswer>): Record<string, any> {
    const query: Record<string, any> = {};

    if (filters.questionId) {
      const questionId = typeof filters.questionId === 'string' ? filters.questionId : String(filters.questionId);
      query.questionId = new Types.ObjectId(questionId);
    }

    if (filters.userId) {
      const userId = typeof filters.userId === 'string' ? filters.userId : String(filters.userId);
      query.userId = new Types.ObjectId(userId);
    }

    if (filters.sessionId) {
      const sessionId = typeof filters.sessionId === 'string' ? filters.sessionId : String(filters.sessionId);
      query.sessionId = new Types.ObjectId(sessionId);
    }

    return query;
  }
}
