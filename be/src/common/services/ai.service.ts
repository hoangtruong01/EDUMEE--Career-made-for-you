import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIAnalysisResult,
  AssessmentAnswerData,
} from '../interfaces/ai-analysis.interface';
import { CareerSimulationData } from '../../modules/careers/schemas/career-simulation.schema';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface Career {
  title: string;
  description?: string;
}

export interface CareerRoadmap {
  title: string;
  description: string;
  totalDuration: string;
  phases: Array<{
    phaseId: string;
    phase: string;
    title: string;
    description: string;
    estimatedDuration: string;
    objectives: string[];
    order: number;
    milestones: Array<{
      milestoneId: string;
      title: string;
      description: string;
      tasks: Array<{
        taskId: string;
        taskTitle: string;
        isRequired: boolean;
        estimatedHours: number;
        order: number;
      }>;
      skills: Array<{ skillName: string; targetLevel: number }>;
      completionCriteria: { requiredTasks: string[] };
    }>;
  }>;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly model = 'models/gemini-flash-latest';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('app.geminiApiKey') || 
                  this.configService.get<string>('GEMINI_API_KEY') || 
                  '';
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY is not configured! AI features will not work.');
    }
  }

  async analyzePersonalityAndCareers(
    assessmentAnswers: AssessmentAnswerData[],
    availableCareers: Career[] = []
  ): Promise<AIAnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(assessmentAnswers, availableCareers);
      const response = await this.callGeminiAPI(prompt);
      return this.parseAnalysisResponse(response);
    } catch (error) {
      this.logger.error('Failed to analyze personality and careers:', error);
      this.logger.warn('Using fallback analysis due to AI failure');
      return this.createFallbackAnalysis();
    }
  }

  private buildAnalysisPrompt(answers: AssessmentAnswerData[], careers: Career[]): string {
    const answersText = answers.map(a => {
      const optionsDesc = a.options && a.options.length > 0 
        ? `\nOptions:\n${a.options.map(o => `  ${o.value}: ${o.label}`).join('\n')}`
        : '';
      return `Question: ${a.questionText}${optionsDesc}\nDimension: ${a.dimension}\nUser's Answer: ${JSON.stringify(a.answer)}`;
    }).join('\n\n');

    const careersText = careers.length > 0 
      ? careers.map(c => `- ${c.title}: ${c.description || 'No description'}`).join('\n')
      : "Please suggest suitable careers based on personality analysis.";

    return `
You are an expert career counselor and psychologist. Analyze the following personality assessment results and provide career recommendations.

ASSESSMENT ANSWERS (RIASEC format, score 1-5 where 1=Strongly Disagree, 5=Strongly Agree):
${answersText}

AVAILABLE CAREERS:
${careersText}

Please provide a comprehensive analysis in the following JSON format:
{
  "personalityAnalysis": {
    "bigFiveScores": {
      "openness": <0-100>,
      "conscientiousness": <0-100>,
      "extraversion": <0-100>,
      "agreeableness": <0-100>,
      "neuroticism": <0-100>
    },
    "riasecScores": {
      "realistic": <0-100>,
      "investigative": <0-100>,
      "artistic": <0-100>,
      "social": <0-100>,
      "enterprising": <0-100>,
      "conventional": <0-100>
    },
    "personalityProfile": {
      "dominantTraits": ["trait1", "trait2"],
      "strengthAreas": ["strength1", "strength2"],
      "developmentAreas": ["area1", "area2"],
      "workStyle": "mô tả phong cách làm việc ưa thích",
      "communication": "mô tả sở thích giao tiếp", 
      "leadership": "mô tả phong cách lãnh đạo"
    }
  },
  "careerRecommendations": [
    {
      "careerId": "unique_id_or_null",
      "careerTitle": "Tên nghề nghiệp",
      "fitScore": <0-100>,
      "personalityMatch": {
        "bigFiveAlignment": <0-100>,
        "riasecAlignment": <0-100>,
        "overallFit": <0-100>
      },
      "reasons": ["lý do 1", "lý do 2"],
      "potentialChallenges": ["thách thức 1", "thách thức 2"],
      "developmentSuggestions": ["gợi ý phát triển 1", "gợi ý phát triển 2"]
    }
  ],
  "explanation": "Giải thích tổng quát về kết quả phân tích và lời khuyên nghề nghiệp",
  "confidence": <0-100>
}

Requirements:
1. Analyze personality dimensions based on assessment answers (Scale 1-5).
2. Calculate realistic scores (0-100) for Big Five and RIASEC. For RIASEC, map each dimension from its corresponding answer.
3. Recommend exactly 5 most suitable careers. The "careerRecommendations" array MUST contain 5 unique careers.
4. Provide specific, actionable insights.
5. Be accurate and evidence-based.
6. Return valid JSON only (no additional text, no markdown code blocks).
7. ALL text content (traits, strengths, reasons, suggestions, explanations, etc.) MUST be written in Vietnamese language.
`;
  }

  public async callGeminiAPI(prompt: string, retries = 3): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const fetch = (await import('node-fetch')).default;
    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    };

    this.logger.debug('Calling Gemini API for personality analysis');

    for (let attempt = 1; attempt <= retries; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Gemini API error (Attempt ${attempt}/${retries}):`, errorText);
        
        if (this.isRetryableGeminiStatus(response.status) && attempt < retries) {
          // Exponential backoff: wait 1s, 2s, 4s...
          const waitTime = Math.pow(2, attempt - 1) * 1000;
          this.logger.warn(`Retryable Gemini error (${response.status}). Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json() as GeminiResponse;
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        if (attempt < retries) continue;
        throw new Error('Invalid response from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('Gemini API error: Max retries reached');
  }

  private isRetryableGeminiStatus(status: number): boolean {
    return status === 429 || status >= 500;
  }

  private parseAnalysisResponse(responseText: string): AIAnalysisResult {
    try {
      // Clean up the response to extract JSON
      let cleanJson = responseText.trim();
      
      // Remove markdown code blocks if present
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/```json\n?/, '').replace(/```$/, '');
      }
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/```\n?/, '').replace(/```$/, '');
      }

      // Try to fix truncated JSON by attempting to close brackets
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(cleanJson) as Record<string, unknown>;
      } catch (parseError) {
        this.logger.warn('JSON parse failed, attempting to fix truncated response...');
        // Try to fix by adding closing brackets
        let fixedJson = cleanJson;
        const openBraces = (fixedJson.match(/{/g) || []).length;
        const closeBraces = (fixedJson.match(/}/g) || []).length;
        const openBrackets = (fixedJson.match(/\[/g) || []).length;
        const closeBrackets = (fixedJson.match(/]/g) || []).length;
        
        // Add missing closing brackets
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixedJson += ']';
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedJson += '}';
        }
        
        try {
          parsed = JSON.parse(fixedJson) as Record<string, unknown>;
          this.logger.log('Successfully fixed truncated JSON');
        } catch {
          throw parseError;
        }
      }
      
      // Validate the structure
      if (!parsed.personalityAnalysis || !parsed.careerRecommendations) {
        throw new Error('Invalid analysis response structure');
      }

      return parsed as unknown as AIAnalysisResult;
    } catch (error) {
      this.logger.error('Failed to parse AI analysis response:', error);
      this.logger.debug('Raw response:', responseText);
      
      // Return a fallback structure
      return this.createFallbackAnalysis();
    }
  }

  private createFallbackAnalysis(): AIAnalysisResult {
    return {
      personalityAnalysis: {
        bigFiveScores: {
          openness: 60,
          conscientiousness: 60,
          extraversion: 60,
          agreeableness: 60,
          neuroticism: 40
        },
        riasecScores: {
          realistic: 50,
          investigative: 50,
          artistic: 50,
          social: 50,
          enterprising: 50,
          conventional: 50
        },
        personalityProfile: {
          dominantTraits: ['Tính cách cân bằng'],
          strengthAreas: ['Khả năng thích ứng', 'Kỹ năng giao tiếp'],
          developmentAreas: ['Cần đánh giá thêm'],
          workStyle: 'Linh hoạt với nhiều môi trường làm việc khác nhau',
          communication: 'Kỹ năng giao tiếp hiệu quả',
          leadership: 'Phong cách lãnh đạo hợp tác'
        }
      },
      careerRecommendations: [
        {
          careerId: null,
          careerTitle: 'Chuyên viên phân tích kinh doanh',
          fitScore: 75,
          personalityMatch: {
            bigFiveAlignment: 70,
            riasecAlignment: 80,
            overallFit: 75
          },
          reasons: ['Kỹ năng phân tích tốt', 'Khả năng giao tiếp mạnh'],
          potentialChallenges: ['Có thể cần đào tạo kỹ thuật'],
          developmentSuggestions: ['Phát triển kỹ năng phân tích dữ liệu', 'Tìm hiểu quy trình kinh doanh']
        },
        {
          careerId: null,
          careerTitle: 'Chuyên viên phân tích dữ liệu',
          fitScore: 73,
          personalityMatch: {
            bigFiveAlignment: 72,
            riasecAlignment: 78,
            overallFit: 73
          },
          reasons: ['Phù hợp với tư duy logic', 'Có thể phát triển từ kỹ năng phân tích'],
          potentialChallenges: ['Cần học thêm công cụ dữ liệu'],
          developmentSuggestions: ['Học SQL, Excel nâng cao và trực quan hóa dữ liệu']
        },
        {
          careerId: null,
          careerTitle: 'Quản lý sản phẩm',
          fitScore: 71,
          personalityMatch: {
            bigFiveAlignment: 74,
            riasecAlignment: 70,
            overallFit: 71
          },
          reasons: ['Kết hợp phân tích, giao tiếp và định hướng người dùng'],
          potentialChallenges: ['Cần rèn kỹ năng ưu tiên và ra quyết định'],
          developmentSuggestions: ['Xây dựng portfolio sản phẩm nhỏ và học discovery người dùng']
        },
        {
          careerId: null,
          careerTitle: 'Chuyên viên tư vấn giải pháp',
          fitScore: 69,
          personalityMatch: {
            bigFiveAlignment: 70,
            riasecAlignment: 68,
            overallFit: 69
          },
          reasons: ['Tận dụng khả năng giao tiếp và phân tích nhu cầu'],
          potentialChallenges: ['Áp lực làm việc với nhiều bên liên quan'],
          developmentSuggestions: ['Rèn kỹ năng trình bày, đặt câu hỏi và phân tích quy trình']
        },
        {
          careerId: null,
          careerTitle: 'Chuyên viên vận hành kinh doanh',
          fitScore: 67,
          personalityMatch: {
            bigFiveAlignment: 68,
            riasecAlignment: 66,
            overallFit: 67
          },
          reasons: ['Phù hợp với người thích tối ưu quy trình và làm việc có hệ thống'],
          potentialChallenges: ['Cần chú ý chi tiết và theo dõi chỉ số thường xuyên'],
          developmentSuggestions: ['Học quản trị quy trình, dashboard và phân tích hiệu suất']
        }
      ],
      explanation: 'Phân tích hoàn thành với dữ liệu hạn chế. Vui lòng hoàn thành đầy đủ bài đánh giá để có kết quả chính xác hơn.',
      confidence: 60
    };
  }

  async generateCareerInsight(careerTitle: string, personalityTraits: string[]): Promise<string> {
    const prompt = `
Với tư cách là chuyên gia tư vấn nghề nghiệp, hãy cung cấp nhận xét ngắn gọn về việc một người có những đặc điểm tính cách sau sẽ phù hợp với nghề ${careerTitle} như thế nào:

Đặc điểm tính cách: ${personalityTraits.join(', ')}

Cung cấp nhận xét cụ thể, có thể hành động trong 2-3 câu về:
1. Tại sao nghề này phù hợp với tính cách của họ
2. Họ nên tập trung vào điều gì để thành công

Giữ phản hồi chuyên nghiệp và khích lệ. Trả lời bằng tiếng Việt.
`;

    try {
      const response = await this.callGeminiAPI(prompt);
      return response;
    } catch (error) {
      this.logger.error('Failed to generate career insight:', error);
      return `${careerTitle} có thể phù hợp với hồ sơ tính cách của bạn. Hãy tập trung phát triển các kỹ năng liên quan và tích lũy kinh nghiệm trong lĩnh vực này.`;
    }
  }

  async generateDetailedCareerAnalysis(careerTitle: string, personalityTraits: string[]): Promise<{
    overview: string;
    pros: string[];
    cons: string[];
    trends: { year: string; description: string }[];
    salaryRange: string;
    demandLevel: string;
    keySkills: string[];
    topCompanies: string[];
  }> {
    const prompt = `
Bạn là chuyên gia tư vấn nghề nghiệp hàng đầu tại Việt Nam. Hãy phân tích chi tiết về nghề "${careerTitle}" dựa trên hồ sơ tính cách:
${personalityTraits.length > 0 ? `Tính cách nổi bật: ${personalityTraits.join(', ')}` : ''}

Trả lời JSON hợp lệ KHÔNG có markdown code blocks:
{
  "overview": "Mô tả tổng quan chi tiết 3-4 câu về nghề này, xu hướng hiện tại và tại sao nó phù hợp với tính cách được mô tả",
  "pros": ["ưu điểm 1", "ưu điểm 2", "ưu điểm 3", "ưu điểm 4", "ưu điểm 5"],
  "cons": ["nhược điểm 1", "nhược điểm 2", "nhược điểm 3", "nhược điểm 4"],
  "trends": [
    { "year": "2025", "description": "Xu hướng năm 2025" },
    { "year": "2026", "description": "Xu hướng năm 2026" },
    { "year": "2027", "description": "Xu hướng năm 2027" },
    { "year": "2028", "description": "Xu hướng năm 2028" },
    { "year": "2029", "description": "Xu hướng năm 2029" }
  ],
  "salaryRange": "X - Y triệu/tháng tùy kinh nghiệm",
  "demandLevel": "Cao / Rất cao / Trung bình",
  "keySkills": ["kỹ năng 1", "kỹ năng 2", "kỹ năng 3", "kỹ năng 4", "kỹ năng 5"],
  "topCompanies": ["Công ty 1", "Công ty 2", "Công ty 3", "Công ty 4"]
}

Quy tắc:
1. Tất cả nội dung phải bằng tiếng Việt.
2. Thực tế, dựa trên thị trường lao động Việt Nam.
3. Chỉ trả về JSON, không có text thêm.
`;

    try {
      const response = await this.callGeminiAPI(prompt);
      let clean = response.trim();
      if (clean.startsWith('```json')) clean = clean.replace(/```json\n?/, '').replace(/```$/, '');
      if (clean.startsWith('```')) clean = clean.replace(/```\n?/, '').replace(/```$/, '');
      return JSON.parse(clean) as {
        overview: string;
        pros: string[];
        cons: string[];
        trends: { year: string; description: string }[];
        salaryRange: string;
        demandLevel: string;
        keySkills: string[];
        topCompanies: string[];
      };
    } catch (error) {
      this.logger.error('Failed to generate detailed career analysis:', error);
      return {
        overview: `${careerTitle} là một lĩnh vực đầy tiềm năng với nhu cầu tuyển dụng cao tại Việt Nam. Với hồ sơ tính cách của bạn, đây là một lựa chọn sự nghiệp phù hợp và có thể phát triển bền vững trong tương lai.`,
        pros: ['Cơ hội việc làm rộng mở', 'Mức lương cạnh tranh', 'Phát triển nghề nghiệp rõ ràng', 'Môi trường làm việc hiện đại', 'Tích lũy kinh nghiệm quý báu'],
        cons: ['Đòi hỏi học hỏi liên tục', 'Áp lực công việc cao', 'Cạnh tranh trong ngành ngày càng tăng', 'Cần cập nhật kỹ năng thường xuyên'],
        trends: [
          { year: '2025', description: 'Nhu cầu tuyển dụng tăng mạnh, nhiều cơ hội mới' },
          { year: '2026', description: 'Ứng dụng AI và công nghệ mới vào công việc' },
          { year: '2027', description: 'Mở rộng thị trường, cơ hội quốc tế' },
          { year: '2028', description: 'Chuyên môn hóa sâu hơn được đề cao' },
          { year: '2029', description: 'Vai trò ngày càng quan trọng trong nền kinh tế số' },
        ],
        salaryRange: '15 - 50 triệu/tháng tùy kinh nghiệm',
        demandLevel: 'Cao',
        keySkills: ['Tư duy phân tích', 'Kỹ năng giao tiếp', 'Làm việc nhóm', 'Học hỏi liên tục', 'Giải quyết vấn đề'],
        topCompanies: ['FPT Software', 'VNG', 'Tiki', 'VinGroup'],
      };
    }
  }

  async generateCareerRoadmap(careerTitle: string, personalityTraits: string[]): Promise<CareerRoadmap> {
    const prompt = `
Bạn là chuyên gia thiết kế lộ trình học tập nghề nghiệp. Tạo lộ trình học tập chi tiết cho nghề "${careerTitle}" từ người mới bắt đầu.
${personalityTraits.length > 0 ? `Tính cách học viên: ${personalityTraits.join(', ')}` : ''}

Trả lời JSON hợp lệ KHÔNG có markdown code blocks:
{
  "title": "Lộ trình ${careerTitle}",
  "description": "Mô tả lộ trình 1-2 câu",
  "totalDuration": "X tháng",
  "phases": [
    {
      "phaseId": "phase_1",
      "phase": "foundation",
      "title": "Tên giai đoạn 1",
      "description": "Mô tả giai đoạn",
      "estimatedDuration": "Tháng 1-3",
      "order": 1,
      "objectives": ["mục tiêu 1", "mục tiêu 2"],
      "milestones": [
        {
          "milestoneId": "m1_1",
          "title": "Tên milestone",
          "description": "Mô tả milestone",
          "tasks": [
            { "taskId": "t1_1_1", "taskTitle": "Tên task", "isRequired": true, "estimatedHours": 10, "order": 1 }
          ],
          "skills": [
            { "skillName": "Tên kỹ năng", "targetLevel": 3 }
          ],
          "completionCriteria": { "requiredTasks": ["t1_1_1"] }
        }
      ]
    }
  ]
}

Quy tắc:
1. Tạo 3-4 phases theo trình tự: foundation -> skill_building -> practice -> advanced
2. Mỗi phase có 2-3 milestones
3. Mỗi milestone có 3-5 tasks
4. Giá trị "phase" chỉ được dùng: "foundation", "skill_building", "practice", "advanced", "specialization"
5. Nội dung phải bằng tiếng Việt
6. Phù hợp với thị trường Việt Nam
7. Chỉ trả về JSON, không có text thêm
`;

    try {
      const response = await this.callGeminiAPI(prompt);
      let clean = response.trim();
      if (clean.startsWith('```json')) clean = clean.replace(/```json\n?/, '').replace(/```$/, '');
      if (clean.startsWith('```')) clean = clean.replace(/```\n?/, '').replace(/```$/, '');
      return JSON.parse(clean) as CareerRoadmap;
    } catch (error) {
      this.logger.error('Failed to generate career roadmap:', error);
      // Return a sensible fallback
      return {
        title: `Lộ trình ${careerTitle}`,
        description: `Lộ trình học tập từ cơ bản đến nâng cao cho nghề ${careerTitle}`,
        totalDuration: '12 tháng',
        phases: [
          {
            phaseId: 'phase_1',
            phase: 'foundation',
            title: 'Nền tảng & Cơ bản',
            description: 'Xây dựng kiến thức nền tảng cần thiết',
            estimatedDuration: 'Tháng 1–3',
            order: 1,
            objectives: ['Nắm vững kiến thức cơ bản', 'Làm quen với công cụ nghề nghiệp'],
            milestones: [
              {
                milestoneId: 'm1_1',
                title: 'Kiến thức nền tảng',
                description: 'Học các khái niệm và kỹ năng cơ bản',
                tasks: [
                  { taskId: 't1_1_1', taskTitle: 'Nghiên cứu tổng quan về ngành', isRequired: true, estimatedHours: 8, order: 1 },
                  { taskId: 't1_1_2', taskTitle: 'Học các khái niệm cơ bản', isRequired: true, estimatedHours: 16, order: 2 },
                  { taskId: 't1_1_3', taskTitle: 'Thực hành bài tập cơ bản', isRequired: true, estimatedHours: 12, order: 3 },
                ],
                skills: [{ skillName: 'Kiến thức nền tảng', targetLevel: 2 }],
                completionCriteria: { requiredTasks: ['t1_1_1', 't1_1_2', 't1_1_3'] },
              },
            ],
          },
          {
            phaseId: 'phase_2',
            phase: 'skill_building',
            title: 'Xây dựng kỹ năng',
            description: 'Phát triển các kỹ năng chuyên môn cốt lõi',
            estimatedDuration: 'Tháng 4–7',
            order: 2,
            objectives: ['Thành thạo kỹ năng chuyên môn', 'Áp dụng vào dự án thực tế'],
            milestones: [
              {
                milestoneId: 'm2_1',
                title: 'Kỹ năng chuyên môn',
                description: 'Phát triển các kỹ năng cốt lõi của nghề',
                tasks: [
                  { taskId: 't2_1_1', taskTitle: 'Học công cụ chuyên ngành', isRequired: true, estimatedHours: 20, order: 1 },
                  { taskId: 't2_1_2', taskTitle: 'Thực hành dự án nhỏ', isRequired: true, estimatedHours: 24, order: 2 },
                ],
                skills: [{ skillName: 'Kỹ năng chuyên môn', targetLevel: 3 }],
                completionCriteria: { requiredTasks: ['t2_1_1', 't2_1_2'] },
              },
            ],
          },
          {
            phaseId: 'phase_3',
            phase: 'practice',
            title: 'Thực hành & Dự án',
            description: 'Áp dụng kiến thức vào các dự án thực tế',
            estimatedDuration: 'Tháng 8–12',
            order: 3,
            objectives: ['Hoàn thành ít nhất 2 dự án thực tế', 'Sẵn sàng đi làm'],
            milestones: [
              {
                milestoneId: 'm3_1',
                title: 'Dự án thực tế',
                description: 'Xây dựng portfolio với các dự án chất lượng',
                tasks: [
                  { taskId: 't3_1_1', taskTitle: 'Lên kế hoạch dự án', isRequired: true, estimatedHours: 8, order: 1 },
                  { taskId: 't3_1_2', taskTitle: 'Triển khai dự án', isRequired: true, estimatedHours: 40, order: 2 },
                  { taskId: 't3_1_3', taskTitle: 'Trình bày và nhận phản hồi', isRequired: false, estimatedHours: 4, order: 3 },
                ],
                skills: [{ skillName: 'Thực hành dự án', targetLevel: 4 }],
                completionCriteria: { requiredTasks: ['t3_1_1', 't3_1_2'] },
              },
            ],
          },
        ],
      };
    }
  }

  async generateCareerSimulation(careerTitle: string, personalityTraits: string[]): Promise<CareerSimulationData> {
    const prompt = `
      Bạn là một chuyên gia tư vấn sự nghiệp AI. Hãy tạo một bản mô phỏng lộ trình nghề nghiệp chi tiết cho nghề: "${careerTitle}".
      Dựa trên đặc điểm tính cách của người dùng: ${personalityTraits.join(', ')}.
      
      Hãy tạo ra 4 cấp độ (levels) phát triển nghề nghiệp: Intern, Junior, Senior, và Lead/Manager.
      Mỗi cấp độ cần có:
      - label (Tên cấp độ)
      - salaryRange (Mức lương tham khảo tại VN, ví dụ: "10-15 triệu VNĐ")
      - yearRange (Số năm kinh nghiệm, ví dụ: "0-1 năm")
      - dailyTasks (Mảng gồm 3-4 công việc hàng ngày tiêu biểu)
      - typicalSchedule (Mảng gồm 4 mốc thời gian trong ngày và công việc tương ứng)
      - challenges (Mảng gồm 2-3 khó khăn thường gặp)
      - tips (Mảng gồm 2-3 lời khuyên để thăng tiến)

      Yêu cầu kết quả trả về là JSON thuần túy theo cấu trúc sau:
      {
        "careerTitle": "...",
        "levels": [
          {
            "label": "...",
            "salaryRange": "...",
            "yearRange": "...",
            "dailyTasks": ["...", "..."],
            "typicalSchedule": [
              {"time": "08:00", "activity": "..."},
              {"time": "10:00", "activity": "..."},
              {"time": "14:00", "activity": "..."},
              {"time": "17:00", "activity": "..."}
            ],
            "challenges": ["...", "..."],
            "tips": ["...", "..."]
          }
        ]
      }
      Lưu ý: Ngôn ngữ sử dụng là tiếng Việt. Trả về đúng định dạng JSON, không kèm thêm văn bản nào khác.
    `;

    try {
      const text = await this.callGeminiAPI(prompt);
      const cleanJson = this.stripJsonCodeFence(text);
      return JSON.parse(cleanJson) as CareerSimulationData;
    } catch (error) {
      this.logger.error('Error generating career simulation:', error);
      this.logger.warn(`Using fallback career simulation for ${careerTitle}`);
      return this.createFallbackCareerSimulation(careerTitle);
    }
  }

  private stripJsonCodeFence(text: string): string {
    return text.replace(/```json|```/gi, '').trim();
  }

  private createFallbackCareerSimulation(careerTitle: string): CareerSimulationData {
    const normalizedTitle = careerTitle.trim() || 'nghề nghiệp đã chọn';

    return {
      careerTitle: normalizedTitle,
      levels: [
        {
          label: `Thực tập sinh ${normalizedTitle}`,
          salaryRange: '3-6 triệu VND',
          yearRange: '0-1 năm',
          dailyTasks: [
            `Tìm hiểu quy trình làm việc của nghề ${normalizedTitle}`,
            'Hỗ trợ thu thập thông tin và chuẩn bị tài liệu',
            'Tham gia các buổi hướng dẫn với mentor',
            'Thực hiện các nhiệm vụ có phạm vi nhỏ và được giám sát',
          ],
          typicalSchedule: [
            { time: '08:00', activity: 'Cập nhật kế hoạch trong ngày với mentor' },
            { time: '10:00', activity: 'Nghiên cứu tài liệu và hỗ trợ các đầu việc cơ bản' },
            { time: '14:00', activity: 'Thực hành nhiệm vụ được giao và xin phản hồi' },
            { time: '17:00', activity: 'Tổng hợp kết quả và ghi chú bài học trong ngày' },
          ],
          challenges: [
            'Cần thích nghi nhanh với công cụ và thuật ngữ chuyên môn',
            'Kinh nghiệm thực tế còn hạn chế',
            'Cần chủ động hỏi và tiếp nhận phản hồi',
          ],
          tips: [
            'Ghi lại những câu hỏi phát sinh trong quá trình làm việc',
            'Tập trung xây dựng nền tảng và thái độ chuyên nghiệp',
            'Xin phản hồi thường xuyên để tiến bộ nhanh hơn',
          ],
        },
        {
          label: `Nhân viên Junior ${normalizedTitle}`,
          salaryRange: '8-15 triệu VND',
          yearRange: '1-3 năm',
          dailyTasks: [
            `Xử lý các nhiệm vụ chuyên môn cơ bản của vị trí ${normalizedTitle}`,
            'Phối hợp với đồng đội để hoàn thành hạng mục dự án',
            'Báo cáo tiến độ và rủi ro cho người phụ trách',
            'Cải thiện kỹ năng thông qua các nhiệm vụ lặp lại',
          ],
          typicalSchedule: [
            { time: '08:00', activity: 'Kiểm tra ưu tiên công việc và họp ngắn với nhóm' },
            { time: '10:00', activity: 'Thực hiện nhiệm vụ chuyên môn chính' },
            { time: '14:00', activity: 'Trao đổi với các bên liên quan và xử lý phản hồi' },
            { time: '17:00', activity: 'Cập nhật tiến độ, tài liệu và kế hoạch ngày tiếp theo' },
          ],
          challenges: [
            'Cần cân bằng tốc độ và độ chính xác',
            'Gặp các tình huống mới chưa có nhiều kinh nghiệm',
            'Cần học cách ưu tiên công việc',
          ],
          tips: [
            'Xây dựng checklist cá nhân cho các nhiệm vụ lặp lại',
            'Học cách trình bày vấn đề rõ ràng trước khi xin hỗ trợ',
            'Chủ động nhận việc có độ khó tăng dần',
          ],
        },
        {
          label: `Chuyên viên Senior ${normalizedTitle}`,
          salaryRange: '20-40 triệu VND',
          yearRange: '3-6 năm',
          dailyTasks: [
            `Đảm nhận các bài toán phức tạp trong lĩnh vực ${normalizedTitle}`,
            'Đánh giá chất lượng đầu ra và đưa ra khuyến nghị cải tiến',
            'Hướng dẫn thành viên mới hoặc junior trong nhóm',
            'Làm việc với quản lý để lập kế hoạch và giảm rủi ro',
          ],
          typicalSchedule: [
            { time: '08:00', activity: 'Rà soát mục tiêu và các vấn đề ưu tiên cao' },
            { time: '10:00', activity: 'Phân tích, ra quyết định và xử lý công việc chuyên sâu' },
            { time: '14:00', activity: 'Review kết quả, hướng dẫn đồng đội và đồng bộ với các nhóm' },
            { time: '17:00', activity: 'Tổng kết rủi ro, quyết định và bước tiếp theo' },
          ],
          challenges: [
            'Phải đưa ra quyết định khi thông tin chưa đầy đủ',
            'Cần đảm bảo chất lượng cho phạm vi công việc lớn hơn',
            'Áp lực về tiến độ và tác động kinh doanh cao hơn',
          ],
          tips: [
            'Rèn luyện tư duy hệ thống và khả năng phân tích rủi ro',
            'Chia sẻ kiến thức để nâng mặt bằng năng lực của nhóm',
            'Đo lường tác động công việc bằng kết quả cụ thể',
          ],
        },
        {
          label: `Lead/Manager ${normalizedTitle}`,
          salaryRange: '45-80 triệu VND',
          yearRange: '6+ năm',
          dailyTasks: [
            `Định hướng chiến lược và tiêu chuẩn cho nhóm ${normalizedTitle}`,
            'Phân bổ nguồn lực và theo dõi mục tiêu quan trọng',
            'Làm việc với lãnh đạo hoặc khách hàng về ưu tiên dài hạn',
            'Phát triển năng lực đội ngũ và xử lý các điểm nghẽn',
          ],
          typicalSchedule: [
            { time: '08:00', activity: 'Rà soát mục tiêu, chỉ số và ưu tiên của nhóm' },
            { time: '10:00', activity: 'Họp chiến lược, ra quyết định và tháo gỡ khó khăn' },
            { time: '14:00', activity: 'Làm việc với các bên liên quan và coaching thành viên' },
            { time: '17:00', activity: 'Đánh giá tiến độ, rủi ro và điều chỉnh kế hoạch' },
          ],
          challenges: [
            'Cần cân bằng mục tiêu kinh doanh và năng lực đội ngũ',
            'Xử lý xung đột ưu tiên giữa nhiều bên liên quan',
            'Chịu trách nhiệm về kết quả thay vì chỉ đầu ra cá nhân',
          ],
          tips: [
            'Xây dựng hệ thống giao việc và phản hồi minh bạch',
            'Tập trung vào kết quả có thể đo lường được',
            'Phát triển kỹ năng lãnh đạo, giao tiếp và quản trị thay đổi',
          ],
        },
      ],
    };
  }

  async generateFullCareerData(title: string): Promise<Record<string, any>> {
    const prompt = `
Bạn là một chuyên gia hướng nghiệp và phân tích thị trường lao động. Hãy tạo một hồ sơ nghề nghiệp cực kỳ chi tiết cho nghề: "${title}" tại thị trường Việt Nam.

Trả về một đối tượng JSON hợp lệ (KHÔNG có markdown code blocks) khớp với cấu trúc sau:
{
  "title": "${title}",
  "description": "Mô tả chi tiết 3-4 câu về nghề",
  "category": "technology | healthcare | finance | education | creative | business | engineering | science | legal | sales_marketing | social_services | other",
  "industries": ["Ngành 1", "Ngành 2"],
  "discoveryData": {
    "pros": ["Ưu điểm 1", "Ưu điểm 2", "Ưu điểm 3"],
    "cons": ["Nhược điểm 1", "Nhược điểm 2"],
    "topCompanies": ["Công ty A", "Công ty B", "Công ty C"],
    "trends": [
      { "year": "2024", "description": "Mô tả xu hướng năm hiện tại" },
      { "year": "2025-2029", "description": "Dự báo xu hướng 5 năm tới" }
    ],
    "salarySummary": "Tóm tắt mức lương (ví dụ: 15-40 triệu VNĐ/tháng)"
  },
  "skillRequirements": {
    "technical": [
      { "skillName": "Tên kỹ năng", "importance": 5, "minimumLevel": 3 }
    ],
    "soft": [
      { "skillName": "Tên kỹ năng", "importance": 4, "minimumLevel": 3 }
    ]
  },
  "personalityFit": {
    "idealTraits": ["trait 1", "trait 2"],
    "challengingTraits": ["trait 3"],
    "hollandCodes": ["R", "I"],
    "workEnvironment": ["Môi trường 1"]
  },
  "careerLevels": [
    {
      "level": "intern",
      "title": "Thực tập sinh ${title}",
      "description": "Mô tả vai trò",
      "experience": { "years": { "min": 0, "max": 1 }, "description": "Mới bắt đầu" },
      "skills": { "technical": ["skill 1"], "soft": ["skill 2"] },
      "responsibilities": ["trách nhiệm 1"],
      "salary": [{ "currency": "VND", "min": 5000000, "max": 8000000, "location": "Việt Nam" }],
      "typicalTasks": ["task 1"],
      "nextLevels": ["entry_level"]
    }
  ],
  "marketInfo": {
    "demandLevel": "high",
    "growthProjection": "Tăng trưởng 15% trong 5 năm tới",
    "jobAvailability": 4,
    "competitionLevel": "medium",
    "automationRisk": "low"
  },
  "workEnvironment": {
    "workSettings": ["Remote", "Office"],
    "workSchedule": ["Flexible"],
    "travelRequirement": "minimal",
    "physicalDemands": "low",
    "stressLevel": "medium"
  },
  "tags": ["tag1", "tag2"]
}

Lưu ý quan trọng:
1. "category" PHẢI là một trong các giá trị: technology, healthcare, finance, education, creative, business, engineering, science, legal, sales_marketing, social_services, other.
2. "careerLevels" nên có ít nhất 4 cấp độ: intern, entry_level, mid_level, senior.
3. Toàn bộ nội dung văn bản phải bằng TIẾNG VIỆT.
4. "hollandCodes" là các chữ cái RIASEC (R, I, A, S, E, C).
5. Chỉ trả về JSON, không giải thích thêm.
`;

    try {
      const response = await this.callGeminiAPI(prompt);
      let clean = response.trim();
      if (clean.startsWith('```json')) clean = clean.replace(/```json\n?/, '').replace(/```$/, '');
      if (clean.startsWith('```')) clean = clean.replace(/```\n?/, '').replace(/```$/, '');
      return JSON.parse(clean) as Record<string, any>;
    } catch (error) {
      this.logger.error('Failed to generate full career data:', error);
      throw error;
    }
  }
}
