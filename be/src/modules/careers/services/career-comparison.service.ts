import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CareerComparison, CareerComparisonDocument } from '../schemas/career-comparison.schema';
import { CreateCareerComparisonDto, UpdateCareerComparisonDto } from '../dto';
import { CareerService } from './career.service';

@Injectable()
export class CareerComparisonService {
  constructor(
    @InjectModel(CareerComparison.name)
    private readonly careerComparisonModel: Model<CareerComparisonDocument>,
    private readonly careerService: CareerService,
  ) {}

  async create(createDto: CreateCareerComparisonDto): Promise<CareerComparison> {
    // Validate career IDs
    const careerObjectIds = await this.validateCareerIds(createDto.careerIds);
    
    const comparison = new this.careerComparisonModel({
      ...createDto,
      userId: new Types.ObjectId(createDto.userId),
      careerIds: careerObjectIds,
    });
    
    return comparison.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<CareerComparison> = {},
  ): Promise<{ data: CareerComparison[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    const query = this.buildQuery(filters);
    
    const [data, total] = await Promise.all([
      this.careerComparisonModel
        .find(query)
        .populate('userId', 'email firstName lastName')
        .populate('careerIds', 'title category industry')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.careerComparisonModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<CareerComparison> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comparison ID');
    }

    const comparison = await this.careerComparisonModel
      .findById(id)
      .populate('userId', 'email firstName lastName')
      .populate('careerIds', 'title category industry description requiredSkills')
      .exec();

    if (!comparison) {
      throw new NotFoundException('Career comparison not found');
    }

    return comparison;
  }

  async findByUser(userId: string): Promise<CareerComparison[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.careerComparisonModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('careerIds', 'title category industry')
      .sort({ createdAt: -1 })
      .exec();
  }

  async compareCareersSideBySide(careerIds: string[]): Promise<any> {
    const careerObjectIds = await this.validateCareerIds(careerIds);
    
    const careers = await Promise.all(
      careerObjectIds.map(id => this.careerService.findOne(id.toString()))
    );

    return {
      careers,
      comparison: this.generateSideBySideComparison(careers),
      summary: this.generateComparisonSummary(careers),
    };
  }

  async generateDetailedComparison(
    userId: string, 
    careerIds: string[],
    criteria?: any
  ): Promise<any> {
    const careerObjectIds = await this.validateCareerIds(careerIds);
    
    const careers = await Promise.all(
      careerObjectIds.map(id => this.careerService.findOne(id.toString()))
    );

    const comparison = {
      userId,
      careerIds,
      careers,
      detailedAnalysis: this.performDetailedAnalysis(careers, criteria),
      recommendations: this.generateRecommendations(careers),
      scoreBreakdown: this.calculateScoreBreakdown(careers, criteria),
    };

    // Save the comparison for future reference
    const savedComparison = await this.create({
      userId,
      careerIds,
      comparisonName: 'Detailed Career Analysis',
      purpose: 'detailed_comparison',
      comparisonCriteria: criteria,
      results: comparison,
      insights: comparison.recommendations,
    });

    return {
      ...comparison,
      comparisonId: savedComparison._id,
    };
  }

  async update(id: string, updateDto: UpdateCareerComparisonDto): Promise<CareerComparison> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comparison ID');
    }

    if (updateDto.careerIds) {
      await this.validateCareerIds(updateDto.careerIds);
      updateDto.careerIds = updateDto.careerIds.map(id => new Types.ObjectId(id)) as any;
    }

    const comparison = await this.careerComparisonModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .populate('userId', 'email firstName lastName')
      .populate('careerIds', 'title category industry')
      .exec();

    if (!comparison) {
      throw new NotFoundException('Career comparison not found');
    }

    return comparison;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comparison ID');
    }

    const result = await this.careerComparisonModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Career comparison not found');
    }
  }

  async getComparisonStatistics(): Promise<any> {
    const stats = await this.careerComparisonModel.aggregate([
      {
        $group: {
          _id: null,
          totalComparisons: { $sum: 1 },
          avgCareersPerComparison: { $avg: { $size: '$careerIds' } },
          mostComparedCareers: { $push: '$careerIds' },
        },
      },
    ]);

    return stats[0] || {
      totalComparisons: 0,
      avgCareersPerComparison: 0,
      mostComparedCareers: [],
    };
  }

  private async validateCareerIds(careerIds: string[]): Promise<Types.ObjectId[]> {
    const objectIds: Types.ObjectId[] = [];
    
    for (const careerId of careerIds) {
      if (!Types.ObjectId.isValid(careerId)) {
        throw new BadRequestException(`Invalid career ID: ${careerId}`);
      }
      
      // Verify career exists
      await this.careerService.findOne(careerId);
      objectIds.push(new Types.ObjectId(careerId));
    }
    
    return objectIds;
  }

  private generateSideBySideComparison(careers: any[]): any {
    const comparisonFields = [
      'title',
      'category',
      'industry',
      'requiredSkills',
      'salaryInformation',
      'educationRequirements',
      'workEnvironment',
    ];

    const comparison: any = {};
    
    comparisonFields.forEach(field => {
      comparison[field] = careers.map(career => ({
        careerId: career._id,
        careerTitle: career.title,
        value: career[field],
      }));
    });

    return comparison;
  }

  private generateComparisonSummary(careers: any[]): any {
    return {
      totalCareers: careers.length,
      categories: [...new Set(careers.map(c => c.category))],
      industries: [...new Set(careers.map(c => c.industry))],
      commonSkills: this.findCommonSkills(careers),
      uniqueAspects: this.findUniqueAspects(careers),
    };
  }

  private performDetailedAnalysis(careers: any[], criteria?: any): any {
    // This would perform more sophisticated analysis based on criteria
    return {
      skillsAlignment: this.analyzeSkillsAlignment(careers),
      careerProgression: this.analyzeCareerProgression(careers),
      marketDemand: this.analyzeMarketDemand(careers),
      compatibility: this.analyzeCompatibility(careers),
    };
  }

  private generateRecommendations(careers: any[]): any {
    // Generate intelligent recommendations based on career comparison
    return {
      bestMatch: careers[0]?._id, // This would use more sophisticated logic
      reasonsForRecommendation: ['High skill alignment', 'Strong market demand'],
      alternativeOptions: careers.slice(1, 3).map(c => c._id),
      developmentSuggestions: ['Focus on technical skills', 'Consider additional certifications'],
    };
  }

  private calculateScoreBreakdown(careers: any[], criteria?: any): any {
    // Calculate weighted scores based on different criteria
    return careers.map(career => ({
      careerId: career._id,
      careerTitle: career.title,
      overallScore: 85, // This would be calculated based on actual criteria
      criteriaScores: {
        skillMatch: 90,
        salaryPotential: 80,
        workLifeBalance: 85,
        growthPotential: 88,
      },
    }));
  }

  private findCommonSkills(careers: any[]): string[] {
    const allSkills = careers.flatMap(career => [
      ...(career.requiredSkills || []),
      ...(career.preferredSkills || []),
    ]);
    
    const skillCounts = allSkills.reduce((acc, skill) => {
      acc[skill] = (acc[skill] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(skillCounts)
      .filter(([_, count]) => (count as number) > 1)
      .map(([skill, _]) => skill);
  }

  private findUniqueAspects(careers: any[]): any[] {
    return careers.map(career => ({
      careerId: career._id,
      uniqueSkills: career.requiredSkills?.filter((skill: string) =>
        !this.isCommonSkillAcrossCareers(skill, careers)
      ) || [],
      uniqueFeatures: this.extractUniqueFeatures(career, careers),
    }));
  }

  private isCommonSkillAcrossCareers(skill: string, careers: any[]): boolean {
    return careers.filter(career =>
      career.requiredSkills?.includes(skill) || career.preferredSkills?.includes(skill)
    ).length > 1;
  }

  private extractUniqueFeatures(career: any, allCareers: any[]): string[] {
    // This would extract unique aspects of each career compared to others
    return ['Remote work options', 'Creative freedom']; // Placeholder
  }

  private analyzeSkillsAlignment(careers: any[]): any {
    return {
      overlapPercentage: 75,
      transferableSkills: ['Communication', 'Problem solving'],
      gapAnalysis: careers.map(c => ({
        careerId: c._id,
        missingSkills: ['Leadership', 'Project management'],
      })),
    };
  }

  private analyzeCareerProgression(careers: any[]): any {
    return careers.map(career => ({
      careerId: career._id,
      progressionPath: career.careerPath || {},
      timeToAdvancement: '2-3 years',
      seniorityLevels: ['Junior', 'Mid-level', 'Senior', 'Lead'],
    }));
  }

  private analyzeMarketDemand(careers: any[]): any {
    return careers.map(career => ({
      careerId: career._id,
      demandLevel: 'High', // This would come from market data
      jobGrowthRate: '15%', // This would come from labor statistics
      competitionLevel: 'Moderate',
    }));
  }

  private analyzeCompatibility(careers: any[]): any {
    return {
      personalityFit: 'High',
      skillsCompatibility: 'Moderate',
      lifestyleAlignment: 'High',
      longTermViability: 'Strong',
    };
  }

  private buildQuery(filters: Partial<CareerComparison>): any {
    const query: any = {};

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId as any);
    }

    return query;
  }
}