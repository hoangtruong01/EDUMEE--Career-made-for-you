import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssessmentSession, AssessmentSessionDocument, AssessmentStatus } from '../schemas/assessment-session.schema';
import { CreateAssessmentSessionDto, UpdateAssessmentSessionDto } from '../dto';

@Injectable()
export class AssessmentSessionService {
  constructor(
    @InjectModel(AssessmentSession.name)
    private readonly assessmentSessionModel: Model<AssessmentSessionDocument>,
  ) {}

  async create(createDto: CreateAssessmentSessionDto): Promise<AssessmentSession> {
    const session = new this.assessmentSessionModel({
      ...createDto,
      userId: new Types.ObjectId(createDto.userId),
    });
    return session.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<AssessmentSession> = {},
  ): Promise<{ data: AssessmentSession[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    const query = this.buildQuery(filters);
    
    const [data, total] = await Promise.all([
      this.assessmentSessionModel
        .find(query)
        .populate('userId', 'email firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.assessmentSessionModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<AssessmentSession> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid session ID');
    }

    const session = await this.assessmentSessionModel
      .findById(id)
      .populate('userId', 'email firstName lastName')
      .exec();

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    return session;
  }

  async findByUser(userId: string, status?: AssessmentStatus): Promise<AssessmentSession[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const query: any = { userId: new Types.ObjectId(userId) };
    if (status) {
      query.status = status;
    }

    return this.assessmentSessionModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(id: string, updateDto: UpdateAssessmentSessionDto): Promise<AssessmentSession> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid session ID');
    }

    const session = await this.assessmentSessionModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .populate('userId', 'email firstName lastName')
      .exec();

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    return session;
  }

  async updateStatus(id: string, status: AssessmentStatus): Promise<AssessmentSession> {
    return this.update(id, { status });
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid session ID');
    }

    const result = await this.assessmentSessionModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Assessment session not found');
    }
  }

  async getSessionStats(sessionId: string): Promise<any> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new BadRequestException('Invalid session ID');
    }

    const session = await this.findOne(sessionId);
    
    // Return session metrics and statistics
    return {
      sessionId,
      status: session.status,
      type: session.type,
      progressTracking: session.progressTracking,
      sessionMetrics: session.sessionMetrics,
      results: session.results,
    };
  }

  private buildQuery(filters: Partial<AssessmentSession>): any {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId as any);
    }

    return query;
  }
}