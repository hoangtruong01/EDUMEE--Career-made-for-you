import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import {
  AssessmentDimension,
  AssessmentQuestion,
  AssessmentQuestionDocument,
  QuestionType,
} from '../schemas/assessment-question.schema';

interface SeedOption {
  value: 'A' | 'B' | 'C' | 'D';
  label: string;
}

interface SeedQuestion {
  questionText: string;
  dimension: AssessmentDimension;
  orderIndex: number;
  options: SeedOption[];
}

@Injectable()
export class AssessmentQuestionSeedService implements OnModuleInit {
  private readonly logger = new Logger(AssessmentQuestionSeedService.name);

  constructor(
    @InjectModel(AssessmentQuestion.name)
    private readonly assessmentQuestionModel: Model<AssessmentQuestionDocument>,
  ) {}

  async onModuleInit() {
    await this.ensureQuestionBank();
  }

  private async ensureQuestionBank(): Promise<void> {
    const existingCount = await this.assessmentQuestionModel.countDocuments().exec();
    if (existingCount > 0) {
      return;
    }

    const seedFile = resolve(process.cwd(), 'personality-assessment-questions.json');
    let fileContent = '';

    try {
      fileContent = await fs.readFile(seedFile, 'utf-8');
    } catch (error) {
      this.logger.warn('Question seed file not found, skip seeding.');
      return;
    }

    let seedQuestions: SeedQuestion[] = [];
    try {
      seedQuestions = JSON.parse(fileContent) as SeedQuestion[];
    } catch (error) {
      this.logger.error('Invalid JSON in personality-assessment-questions.json.');
      return;
    }

    if (!Array.isArray(seedQuestions) || seedQuestions.length === 0) {
      this.logger.warn('Question seed file is empty, skip seeding.');
      return;
    }

    const normalized = seedQuestions.map((q, index) => ({
      questionText: q.questionText,
      dimension: q.dimension,
      questionType: QuestionType.MULTIPLE_CHOICE,
      orderIndex: q.orderIndex || index + 1,
      options: (q.options || []).map((o) => ({
        value: o.value,
        label: o.label,
      })),
      isActive: true,
    }));

    await this.assessmentQuestionModel.insertMany(normalized, { ordered: true });
    this.logger.log(`Seeded ${normalized.length} assessment questions from local file.`);
  }
}
