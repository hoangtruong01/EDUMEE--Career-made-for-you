import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssessmentAnswer, AssessmentAnswerDocument } from '../schemas/assessment-answer.schema';
import { CreateAssessmentAnswerDto, UpdateAssessmentAnswerDto } from '../dto';

@Injectable()
export class AssessmentAnswerService {
  constructor(
    @InjectModel(AssessmentAnswer.name)
    private readonly assessmentAnswerModel: Model<AssessmentAnswerDocument>,
  ) {}

  async create(createDto: CreateAssessmentAnswerDto): Promise<AssessmentAnswer> {
    const answer = new this.assessmentAnswerModel({
      ...createDto,
      sessionId: new Types.ObjectId(createDto.sessionId),
      questionId: new Types.ObjectId(createDto.questionId),
      userId: new Types.ObjectId(createDto.userId),
    });
    return answer.save();
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
        .populate('sessionId', 'title type')
        .populate('questionId', 'questionText type category')
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
      .populate('sessionId', 'title type')
      .populate('questionId', 'questionText type category')
      .populate('userId', 'email firstName lastName')
      .exec();

    if (!answer) {
      throw new NotFoundException('Assessment answer not found');
    }

    return answer;
  }

  async findBySession(sessionId: string): Promise<AssessmentAnswer[]> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new BadRequestException('Invalid session ID');
    }

    return this.assessmentAnswerModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .populate('questionId', 'questionText type order')
      .populate('userId', 'email firstName lastName')
      .sort({ createdAt: 1 })
      .exec();
  }

  async findByUser(userId: string, sessionId?: string): Promise<AssessmentAnswer[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const query: any = { userId: new Types.ObjectId(userId) };
    
    if (sessionId) {
      if (!Types.ObjectId.isValid(sessionId)) {
        throw new BadRequestException('Invalid session ID');
      }
      query.sessionId = new Types.ObjectId(sessionId);
    }

    return this.assessmentAnswerModel
      .find(query)
      .populate('sessionId', 'title type')
      .populate('questionId', 'questionText type order')
      .sort({ createdAt: -1 })
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
      .populate('sessionId', 'title type')
      .populate('questionId', 'questionText type')
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

  async calculateSessionProgress(sessionId: string): Promise<any> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new BadRequestException('Invalid session ID');
    }

    const answers = await this.assessmentAnswerModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .populate('questionId', 'type category dimension')
      .exec();

    return {
      totalAnswers: answers.length,
      averageScore: this.calculateAverageScore(answers),
      dimensionBreakdown: this.calculateDimensionScores(answers),
      responseTimeStats: this.calculateResponseTimeStats(answers),
    };
  }

  async bulkCreate(answers: CreateAssessmentAnswerDto[]): Promise<AssessmentAnswer[]> {
    const answersWithObjectIds = answers.map(answer => ({
      ...answer,
      sessionId: new Types.ObjectId(answer.sessionId),
      questionId: new Types.ObjectId(answer.questionId),
      userId: new Types.ObjectId(answer.userId),
    }));

    return this.assessmentAnswerModel.insertMany(answersWithObjectIds);
  }

  private calculateAverageScore(answers: AssessmentAnswer[]): number {
    const validScores = answers
      .filter(answer => typeof answer.normalizedScore === 'number')
      .map(answer => answer.normalizedScore!);
    
    return validScores.length > 0 
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
      : 0;
  }

  private calculateDimensionScores(answers: AssessmentAnswer[]): any {
    const dimensionScores: { [key: string]: number[] } = {};
    
    answers.forEach(answer => {
      if (answer.dimensionScores && typeof answer.dimensionScores === 'object') {
        Object.entries(answer.dimensionScores).forEach(([dimension, score]) => {
          if (!dimensionScores[dimension]) {
            dimensionScores[dimension] = [];
          }
          dimensionScores[dimension].push(score as number);
        });
      }
    });

    // Calculate average for each dimension
    const avgDimensionScores: { [key: string]: number } = {};
    Object.entries(dimensionScores).forEach(([dimension, scores]) => {
      avgDimensionScores[dimension] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    return avgDimensionScores;
  }

  private calculateResponseTimeStats(answers: AssessmentAnswer[]): any {
    const responseTimes = answers
      .filter(answer => typeof answer.responseTime === 'number')
      .map(answer => answer.responseTime!);
    
    if (responseTimes.length === 0) {
      return { average: 0, min: 0, max: 0 };
    }

    return {
      average: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
    };
  }

  private buildQuery(filters: Partial<AssessmentAnswer>): any {
    const query: any = {};

    if (filters.sessionId) {
      query.sessionId = new Types.ObjectId(filters.sessionId as any);
    }

    if (filters.questionId) {
      query.questionId = new Types.ObjectId(filters.questionId as any);
    }

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId as any);
    }

    return query;
  }
}