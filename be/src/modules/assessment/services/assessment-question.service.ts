import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssessmentQuestion, AssessmentQuestionDocument, QuestionType } from '../schemas/assessment-question.schema';
import { CreateAssessmentQuestionDto, UpdateAssessmentQuestionDto } from '../dto';

@Injectable()
export class AssessmentQuestionService {
  constructor(
    @InjectModel(AssessmentQuestion.name)
    private readonly assessmentQuestionModel: Model<AssessmentQuestionDocument>,
  ) {}

  async create(createDto: CreateAssessmentQuestionDto): Promise<AssessmentQuestion> {
    const question = new this.assessmentQuestionModel({
      ...createDto,
      sessionId: new Types.ObjectId(createDto.sessionId),
    });
    return question.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<AssessmentQuestion> = {},
  ): Promise<{ data: AssessmentQuestion[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    const query = this.buildQuery(filters);
    
    const [data, total] = await Promise.all([
      this.assessmentQuestionModel
        .find(query)
        .populate('sessionId', 'title type status')
        .sort({ order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.assessmentQuestionModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<AssessmentQuestion> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid question ID');
    }

    const question = await this.assessmentQuestionModel
      .findById(id)
      .populate('sessionId', 'title type status')
      .exec();

    if (!question) {
      throw new NotFoundException('Assessment question not found');
    }

    return question;
  }

  async findBySession(sessionId: string): Promise<AssessmentQuestion[]> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new BadRequestException('Invalid session ID');
    }

    return this.assessmentQuestionModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .sort({ order: 1, createdAt: 1 })
      .exec();
  }

  async findByType(type: QuestionType, sessionId?: string): Promise<AssessmentQuestion[]> {
    const query: any = { type };
    
    if (sessionId) {
      if (!Types.ObjectId.isValid(sessionId)) {
        throw new BadRequestException('Invalid session ID');
      }
      query.sessionId = new Types.ObjectId(sessionId);
    }

    return this.assessmentQuestionModel
      .find(query)
      .sort({ order: 1, createdAt: 1 })
      .exec();
  }

  async update(id: string, updateDto: UpdateAssessmentQuestionDto): Promise<AssessmentQuestion> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid question ID');
    }

    const question = await this.assessmentQuestionModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .populate('sessionId', 'title type status')
      .exec();

    if (!question) {
      throw new NotFoundException('Assessment question not found');
    }

    return question;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid question ID');
    }

    const result = await this.assessmentQuestionModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Assessment question not found');
    }
  }

  async reorderQuestions(sessionId: string, questionIds: string[]): Promise<AssessmentQuestion[]> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new BadRequestException('Invalid session ID');
    }

    const updates = questionIds.map((questionId, index) => 
      this.assessmentQuestionModel.findByIdAndUpdate(
        questionId,
        { order: index + 1 },
        { new: true }
      ).exec()
    );

    return Promise.all(updates.map(async (updatePromise) => {
      const result = await updatePromise;
      return result || null;
    })).then(results => results.filter(result => result !== null)) as Promise<AssessmentQuestion[]>;
  }

  async bulkCreate(sessionId: string, questions: CreateAssessmentQuestionDto[]): Promise<AssessmentQuestion[]> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new BadRequestException('Invalid session ID');
    }

    const questionsWithSessionId = questions.map((q, index) => ({
      ...q,
      sessionId: new Types.ObjectId(sessionId),
      order: index + 1,
    }));

    return this.assessmentQuestionModel.insertMany(questionsWithSessionId) as any as Promise<AssessmentQuestion[]>;
  }

  private buildQuery(filters: Partial<AssessmentQuestion>): any {
    const query: any = {};

    if (filters.sessionId) {
      query.sessionId = new Types.ObjectId(filters.sessionId as any);
    }

    if (filters.questionType) {
      query.questionType = filters.questionType;
    }

    if (filters.dimension) {
      query.dimension = filters.dimension;
    }

    if (filters.dimension) {
      query.dimension = filters.dimension;
    }

    return query;
  }
}