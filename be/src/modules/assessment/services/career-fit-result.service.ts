import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CareerFitResult, CareerFitResultDocument } from '../schemas/career-fit-result.schema';
import { CreateCareerFitResultDto, UpdateCareerFitResultDto } from '../dto';

@Injectable()
export class CareerFitResultService {
  constructor(
    @InjectModel(CareerFitResult.name)
    private readonly careerFitResultModel: Model<CareerFitResultDocument>,
  ) {}

  async create(createDto: CreateCareerFitResultDto): Promise<CareerFitResult> {
    const result = new this.careerFitResultModel({
      ...createDto,
      sessionId: new Types.ObjectId(createDto.sessionId),
      userId: new Types.ObjectId(createDto.userId),
      careerId: new Types.ObjectId(createDto.careerId),
    });
    return result.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<CareerFitResult> = {},
  ): Promise<{ data: CareerFitResult[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    const query = this.buildQuery(filters);
    
    const [data, total] = await Promise.all([
      this.careerFitResultModel
        .find(query)
        .populate('sessionId', 'title type status')
        .populate('userId', 'email firstName lastName')
        .populate('careerId', 'title category industry')
        .sort({ overallFitScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.careerFitResultModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<CareerFitResult> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid career fit result ID');
    }

    const result = await this.careerFitResultModel
      .findById(id)
      .populate('sessionId', 'title type status')
      .populate('userId', 'email firstName lastName')
      .populate('careerId', 'title category industry')
      .exec();

    if (!result) {
      throw new NotFoundException('Career fit result not found');
    }

    return result;
  }

  async findBySession(sessionId: string): Promise<CareerFitResult[]> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new BadRequestException('Invalid session ID');
    }

    return this.careerFitResultModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .populate('careerId', 'title category industry')
      .sort({ overallFitScore: -1 })
      .exec();
  }

  async findByUser(userId: string, limit?: number): Promise<CareerFitResult[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    let query = this.careerFitResultModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('sessionId', 'title type')
      .populate('careerId', 'title category industry')
      .sort({ overallFitScore: -1, createdAt: -1 });

    if (limit) {
      query = query.limit(limit);
    }

    return query.exec();
  }

  async findByCareer(careerId: string): Promise<CareerFitResult[]> {
    if (!Types.ObjectId.isValid(careerId)) {
      throw new BadRequestException('Invalid career ID');
    }

    return this.careerFitResultModel
      .find({ careerId: new Types.ObjectId(careerId) })
      .populate('userId', 'email firstName lastName')
      .populate('sessionId', 'title type')
      .sort({ overallFitScore: -1 })
      .exec();
  }

  async getTopCareerMatches(userId: string, limit = 10): Promise<CareerFitResult[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.careerFitResultModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('careerId', 'title category industry description')
      .sort({ overallFitScore: -1 })
      .limit(limit)
      .exec();
  }

  async update(id: string, updateDto: UpdateCareerFitResultDto): Promise<CareerFitResult> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid career fit result ID');
    }

    const result = await this.careerFitResultModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .populate('sessionId', 'title type')
      .populate('userId', 'email firstName lastName')
      .populate('careerId', 'title category industry')
      .exec();

    if (!result) {
      throw new NotFoundException('Career fit result not found');
    }

    return result;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid career fit result ID');
    }

    const result = await this.careerFitResultModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Career fit result not found');
    }
  }

  async generateComparisonReport(userId: string, careerIds: string[]): Promise<any> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const objectIdCareerIds = careerIds.map(id => {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(`Invalid career ID: ${id}`);
      }
      return new Types.ObjectId(id);
    });

    const results = await this.careerFitResultModel
      .find({
        userId: new Types.ObjectId(userId),
        careerId: { $in: objectIdCareerIds }
      })
      .populate('careerId', 'title category industry')
      .sort({ overallFitScore: -1 })
      .exec();

    return {
      userId,
      careerComparisons: results.map(result => ({
        career: result.careerId,
        fitScore: result.overallFitScore,
        strengths: result.strengths,
        developmentAreas: result.developmentAreas,
        dimensionScores: result.dimensionScores,
      })),
      recommendations: this.generateRecommendations(results),
    };
  }

  async getStatistics(): Promise<any> {
    const stats = await this.careerFitResultModel.aggregate([
      {
        $group: {
          _id: null,
          totalResults: { $sum: 1 },
          averageFitScore: { $avg: '$overallFitScore' },
          highFitCount: { 
            $sum: { 
              $cond: [{ $gte: ['$overallFitScore', 80] }, 1, 0] 
            } 
          },
          mediumFitCount: { 
            $sum: { 
              $cond: [
                { $and: [{ $gte: ['$overallFitScore', 60] }, { $lt: ['$overallFitScore', 80] }] }, 
                1, 
                0
              ] 
            } 
          },
          lowFitCount: { 
            $sum: { 
              $cond: [{ $lt: ['$overallFitScore', 60] }, 1, 0] 
            } 
          },
        }
      }
    ]);

    return stats[0] || {
      totalResults: 0,
      averageFitScore: 0,
      highFitCount: 0,
      mediumFitCount: 0,
      lowFitCount: 0,
    };
  }

  private generateRecommendations(results: CareerFitResult[]): any {
    if (results.length === 0) return [];

    const topResult = results[0];
    
    return {
      topRecommendation: topResult.careerId,
      reasonsForRecommendation: topResult.strengths?.slice(0, 3) || [],
      developmentSuggestions: topResult.developmentAreas?.slice(0, 3) || [],
      alternativeOptions: results.slice(1, 4).map(r => r.careerId),
    };
  }

  private buildQuery(filters: Partial<CareerFitResult>): any {
    const query: any = {};

    if (filters.sessionId) {
      query.sessionId = new Types.ObjectId(filters.sessionId as any);
    }

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId as any);
    }

    if (filters.careerId) {
      query.careerId = new Types.ObjectId(filters.careerId as any);
    }

    if (filters.overallFitScore) {
      query.overallFitScore = { $gte: filters.overallFitScore };
    }

    return query;
  }
}