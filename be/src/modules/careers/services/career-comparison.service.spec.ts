import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CareerComparisonService } from './career-comparison.service';

describe('CareerComparisonService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const careerId = '507f1f77bcf86cd799439012';
  const insightId = '507f1f77bcf86cd799439013';
  const lockedResultId = '507f1f77bcf86cd799439014';
  const fitResultId = '507f1f77bcf86cd799439015';

  let service: CareerComparisonService;
  let careerFitResultService: {
    findByUserVisible: jest.Mock;
    findAllInsights: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(() => {
    careerFitResultService = {
      findByUserVisible: jest.fn().mockResolvedValue([
        {
          id: fitResultId,
          careerId,
          careerTitle: 'Software Engineer',
          overallFitScore: 92,
          rank: 1,
          isLocked: false,
          strengths: ['Problem solving'],
        },
        {
          id: insightId,
          careerId: null,
          careerTitle: 'Product Analyst',
          overallFitScore: 88,
          rank: 2,
          isLocked: false,
          strengths: ['Data thinking'],
        },
        {
          id: lockedResultId,
          careerId: null,
          careerTitle: 'Locked Career',
          rank: 4,
          isLocked: true,
        },
      ]),
      findAllInsights: jest.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(insightId),
          careerTitle: 'Product Analyst',
          category: 'business',
          analysis: {
            overview: 'Turns data into product decisions.',
            demandLevel: 'Cao',
            keySkills: ['SQL', 'Product sense'],
            salaryRange: '20-45',
          },
        },
      ]),
      findOne: jest.fn(),
    };

    service = new CareerComparisonService(
      {} as never,
      { findOne: jest.fn() } as never,
      {} as never,
      careerFitResultService as never,
    );
  });

  it('returns only unlocked careers from the latest visible results', async () => {
    const allowed = await service.getAllowedCareersForUser(userId);

    expect(allowed.map((career) => career.id)).toEqual([careerId, insightId]);
    expect(allowed.some((career) => career.careerFitResultId === lockedResultId)).toBe(false);
  });

  it('normalizes allowed aliases and rejects invalid selections before quota', async () => {
    await expect(
      service.normalizeAllowedCareerIdsForUser(userId, [careerId, insightId]),
    ).resolves.toEqual([careerId, insightId]);

    await expect(
      service.normalizeAllowedCareerIdsForUser(userId, [careerId, insightId, fitResultId, lockedResultId]),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.normalizeAllowedCareerIdsForUser(userId, [careerId, lockedResultId]),
    ).rejects.toThrow('Career is not available for comparison');
  });
});
