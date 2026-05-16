import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { ExperienceLevel } from '../../careers/schemas/career.schema';
import { CreateTutorProfileDto } from './tutor-profile.dto';

const validatePayload = (payload: Record<string, unknown>) => {
  const dto = plainToInstance(CreateTutorProfileDto, payload, {
    enableImplicitConversion: true,
  });

  return validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
};

const flattenMessages = (errors: ValidationError[]): string[] =>
  errors.flatMap((error) => [
    ...Object.values(error.constraints || {}),
    ...flattenMessages(error.children || []),
  ]);

const createValidPayload = () => ({
  professionalBackground: {
    currentPosition: 'Prompt Engineer',
    company: 'Eduma',
    yearsOfExperience: 3,
    industries: ['IT'],
    seniority: ExperienceLevel.MID_LEVEL,
  },
  mentoringExpertise: {
    careerExpertise: [
      {
        careerId: '6a057fa7b5f2abd0118b1993',
        careerTitle: 'AI Product Specialist',
        experienceLevel: ExperienceLevel.MID_LEVEL,
        yearsInField: 3,
        confidenceLevel: 4,
      },
    ],
    skillExpertise: [
      {
        skillName: 'Prompt Engineering',
        skillCategory: 'technical',
        proficiencyLevel: 4,
        teachingExperience: 1,
      },
    ],
    specializations: ['Career transition'],
    targetMenteeLevels: [ExperienceLevel.ENTRY_LEVEL, ExperienceLevel.MID_LEVEL],
  },
  availability: {
    timeZone: 'Asia/Ho_Chi_Minh',
    weeklyAvailability: [
      {
        day: 'saturday',
        timeSlots: [{ startTime: '09:00', endTime: '17:00', available: true }],
      },
    ],
    sessionPreferences: {
      preferredDuration: [60, 90],
      sessionTypes: ['career_guidance', 'skill_coaching', 'interview_preparation'],
      communicationMethods: ['video'],
    },
  },
  pricing: {
    currency: 'VND',
    freeSessionOffered: false,
    sessionRates: [
      { sessionType: 'career_guidance', duration: 60, pricePerSession: 50000 },
      { sessionType: 'skill_coaching', duration: 60, pricePerSession: 50000 },
    ],
  },
});

describe('CreateTutorProfileDto', () => {
  it('accepts a valid tutor profile payload with weekly availability and pricing', () => {
    expect(validatePayload(createValidPayload())).toEqual([]);
  });

  it('rejects unknown top-level fields', () => {
    const errors = validatePayload({
      ...createValidPayload(),
      unexpectedField: true,
    });

    expect(flattenMessages(errors)).toContain('property unexpectedField should not exist');
  });

  it('rejects invalid nested experience level values', () => {
    const payload = createValidPayload();
    payload.professionalBackground.seniority = 'mid' as never;
    payload.mentoringExpertise.targetMenteeLevels = ['beginner'] as never;

    const messages = flattenMessages(validatePayload(payload));

    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('seniority must be one of the following values'),
        expect.stringContaining('each value in targetMenteeLevels must be one of the following values'),
      ]),
    );
  });
});
