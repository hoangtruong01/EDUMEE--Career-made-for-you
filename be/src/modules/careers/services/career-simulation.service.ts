import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CareerSimulation, CareerSimulationDocument, CareerSimulationData } from '../schemas/career-simulation.schema';
import { AIService } from '../../../common/services/ai.service';
import { CareerFitResultService } from '../../assessment/services/career-fit-result.service';

interface PersonalityProfile {
  dominantTraits: string[];
   RIASEC?: any;
}

interface CareerFitResultLike {
  careerTitle: string;
  overallFitScore: number;
  strengths: string[];
  personalityProfile?: PersonalityProfile;
}

@Injectable()
export class CareerSimulationService {
  private readonly logger = new Logger(CareerSimulationService.name);

  constructor(
    @InjectModel(CareerSimulation.name)
    private readonly simulationModel: Model<CareerSimulationDocument>,
    private readonly aiService: AIService,
    private readonly careerFitResultService: CareerFitResultService,
  ) {}

  async getTopCareers(userId: string): Promise<{ title: string; fitScore: number; strengths: string[]; personalityTraits: string[] }[]> {
    const results = await this.careerFitResultService.getTopCareerMatches(userId, 3) as unknown as CareerFitResultLike[];
    return results.map(r => ({
      title: r.careerTitle,
      fitScore: r.overallFitScore,
      strengths: r.strengths,
      personalityTraits: r.personalityProfile?.dominantTraits || [],
    }));
  }

  async getOrGenerateSimulation(userId: string, careerTitle: string): Promise<CareerSimulationData> {
    // 1. Check cache
    const existing = await this.simulationModel.findOne({
      userId: new Types.ObjectId(userId),
      careerTitle,
    });

    if (existing) {
      return existing.simulationData;
    }

    // 2. Get user context (personality traits)
    const results = await this.careerFitResultService.getTopCareerMatches(userId, 10) as unknown as CareerFitResultLike[];
    const personalityTraits: string[] = [];
    results.forEach(r => {
      const profile = r.personalityProfile;
      if (profile?.dominantTraits) {
        personalityTraits.push(...profile.dominantTraits);
      }
    });
    const uniqueTraits = [...new Set(personalityTraits)];

    // 3. Generate with AI
    this.logger.log(`Generating simulation for ${careerTitle} (User: ${userId})`);
    const simulationData = await this.aiService.generateCareerSimulation(
      careerTitle,
      uniqueTraits,
    );

    // 4. Save to cache
    const newSimulation = new this.simulationModel({
      userId: new Types.ObjectId(userId),
      careerTitle,
      simulationData,
      lastGeneratedAt: new Date(),
    });
    
    try {
        await newSimulation.save();
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to save simulation to cache:', errorMessage);
        // If save fails (e.g. race condition), just return the data anyway
    }

    return simulationData;
  }
}
