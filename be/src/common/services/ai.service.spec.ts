import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';

describe('AIService', () => {
  let service: AIService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AIService({
      get: jest.fn((key: string) => (key === 'app.geminiApiKey' ? 'test-gemini-key' : undefined)),
    } as unknown as ConfigService);
  });

  describe('generateCareerSimulation', () => {
    it('returns parsed Gemini JSON on success', async () => {
      const response = {
        careerTitle: 'Business Analyst',
        levels: [
          {
            label: 'Intern',
            salaryRange: '3-6 trieu VND',
            yearRange: '0-1 nam',
            dailyTasks: ['Hoc viec'],
            typicalSchedule: [{ time: '08:00', activity: 'Hop nhom' }],
            challenges: ['Thieu kinh nghiem'],
            tips: ['Chu dong hoc hoi'],
          },
        ],
      };
      jest.spyOn(service, 'callGeminiAPI').mockResolvedValue(JSON.stringify(response));

      await expect(service.generateCareerSimulation('Business Analyst', [])).resolves.toEqual(response);
    });

    it('strips markdown JSON fences before parsing', async () => {
      const response = {
        careerTitle: 'Data Analyst',
        levels: [
          {
            label: 'Junior',
            salaryRange: '10-15 trieu VND',
            yearRange: '1-3 nam',
            dailyTasks: ['Phan tich du lieu'],
            typicalSchedule: [{ time: '10:00', activity: 'Lam bao cao' }],
            challenges: ['Du lieu thieu'],
            tips: ['Kiem tra nguon du lieu'],
          },
        ],
      };
      jest.spyOn(service, 'callGeminiAPI').mockResolvedValue(`\`\`\`json\n${JSON.stringify(response)}\n\`\`\``);

      await expect(service.generateCareerSimulation('Data Analyst', [])).resolves.toEqual(response);
    });

    it('returns fallback data when Gemini returns 403', async () => {
      jest.spyOn(service, 'callGeminiAPI').mockRejectedValue(new Error('Gemini API error: 403'));

      const result = await service.generateCareerSimulation('Chuyên viên phân tích kinh doanh', [
        'Tư duy phân tích',
      ]);

      expect(result.careerTitle).toBe('Chuyên viên phân tích kinh doanh');
      expect(result.levels).toHaveLength(4);
      expect(result.levels[0].label).toContain('Chuyên viên phân tích kinh doanh');
      expect(result.levels.every(level => level.typicalSchedule.length === 4)).toBe(true);
    });

    it('returns fallback data when Gemini returns invalid JSON', async () => {
      jest.spyOn(service, 'callGeminiAPI').mockResolvedValue('not valid json');

      const result = await service.generateCareerSimulation('Product Manager', []);

      expect(result.careerTitle).toBe('Product Manager');
      expect(result.levels).toHaveLength(4);
      expect(result.levels.map(level => level.label)).toEqual([
        'Thực tập sinh Product Manager',
        'Nhân viên Junior Product Manager',
        'Chuyên viên Senior Product Manager',
        'Lead/Manager Product Manager',
      ]);
    });
  });
});
