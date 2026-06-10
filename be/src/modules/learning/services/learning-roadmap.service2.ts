// be/src/modules/learning/services/learning-roadmap.service2.ts
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  RoadmapStatus,
  TaskFormatType,
  TaskProgressStatus,
} from '../../../common/enums/learning.enum';
import { AIService } from '../../../common/services/ai.service';
import { CreateLearningRoadmapDto, UpdateLearningRoadmapDto } from '../dto/learning-roadmap.dto2';
import { LearningRoadmap, LearningRoadmapDocument } from '../schemas/learning-roadmap.schema2';
import { SimulationTask } from '../schemas/simulation-task.schema2';
import { TaskSubmission, TaskSubmissionDocument } from '../schemas/task-submission.schema2';

export type CreateRoadmapPayload = CreateLearningRoadmapDto & {
  userId: Types.ObjectId;
  isTemplate: boolean;
};

interface ICareerFitResult {
  careerId?: Types.ObjectId | null;
  developmentAreas?: string[];
}

interface ICareerInsight {
  _id?: Types.ObjectId;
  analysis?: {
    keySkills?: string[];
  };
}

export interface IQuizQuestionInput {
  questionText: string;
  isMultipleChoice: boolean;
  options: { value: number; label: string }[];
  correctValue: number;
}

export interface IEvaluationRubricInput {
  criteria: string;
  description: string;
  weight: number;
}

interface IAIOption {
  value?: number;
  label?: string;
  text?: string;
  title?: string;
}

interface IAIQuizQuestion {
  questionText?: string;
  question?: string;
  title?: string;
  isMultipleChoice?: boolean;
  options?: IAIOption[];
  correctValue?: number;
}

interface IAIGeneratedTask {
  title?: string;
  description?: string;
  formatType?: string;
  taskType?: string;
  difficulty?: string;
  estimatedMinutes?: number;
  quizQuestions?: IAIQuizQuestion[];
  evaluationRubric?: IEvaluationRubricInput[];
}

interface IAIGeneratedMilestone {
  title?: string;
  order?: number;
  tasks?: IAIGeneratedTask[];
}

interface IAIGeneratedPhase {
  title?: string;
  estimatedDuration?: string;
  order?: number;
  milestones?: IAIGeneratedMilestone[];
}

interface IAIGeneratedRoadmap {
  phases?: IAIGeneratedPhase[];
  roadmap?: { phases?: IAIGeneratedPhase[] };
  data?: { phases?: IAIGeneratedPhase[] };
}

interface ISafeSimulationTask {
  _id: Types.ObjectId;
  title: string;
  description: string;
  formatType: string;
  taskType: string;
  quizQuestions: IQuizQuestionInput[];
  estimatedMinutes: number;
}

interface ITaskProgress {
  taskId: Types.ObjectId;
  status: TaskProgressStatus;
  startedAt?: Date;
  completedAt?: Date;
}

interface IRoadmapRawDoc {
  phases?: Array<{
    milestones?: Array<{
      taskIds?: Types.ObjectId[];
      tasks?: Record<string, unknown>[];
    }>;
  }>;
}

@Injectable()
export class LearningRoadmapService {
  private readonly logger = new Logger(LearningRoadmapService.name);

  constructor(
    @InjectModel(LearningRoadmap.name)
    private readonly roadmapModel: Model<LearningRoadmapDocument>,
    @InjectModel(SimulationTask.name)
    private readonly taskModel: Model<SimulationTask>,
    @InjectModel(TaskSubmission.name)
    private readonly submissionModel: Model<TaskSubmissionDocument>,
    @InjectModel('CareerFitResult')
    private readonly careerFitResultModel: Model<unknown>,
    @InjectModel('CareerInsight')
    private readonly careerInsightModel: Model<unknown>,
    private readonly aiService: AIService,
  ) {}

  private async hydrateRoadmapTasks(
    roadmapDoc: LearningRoadmapDocument | null,
  ): Promise<LearningRoadmapDocument | null> {
    if (!roadmapDoc) return null;

    const taskIds: Types.ObjectId[] = [];
    const phases = roadmapDoc.phases;

    if (Array.isArray(phases)) {
      for (const phase of phases) {
        if (Array.isArray(phase.milestones)) {
          for (const milestone of phase.milestones) {
            if (Array.isArray(milestone.taskIds)) {
              taskIds.push(...milestone.taskIds);
            }
          }
        }
      }
    }

    const dbTasks = await this.taskModel
      .find({ _id: { $in: taskIds } })
      .lean()
      .exec();
    const safeDbTasks = dbTasks as unknown as ISafeSimulationTask[];
    const taskMap = new Map<string, ISafeSimulationTask>(
      safeDbTasks.map((t) => [t._id.toString(), t]),
    );

    const userSubmissions = await this.submissionModel
      .find({ userId: roadmapDoc.userId, roadmapId: roadmapDoc._id })
      .lean()
      .exec();
    const submissionMap = new Map<string, unknown>(
      userSubmissions.map((s) => [s.taskId.toString(), s]),
    );

    const docContainer = roadmapDoc as unknown as { _doc: IRoadmapRawDoc };
    const docRaw = docContainer._doc;

    if (docRaw && Array.isArray(docRaw.phases)) {
      const phaseArray = docRaw.phases;
      for (const phase of phaseArray) {
        if (phase && Array.isArray(phase.milestones)) {
          const milestoneArray = phase.milestones;
          for (const milestone of milestoneArray) {
            const enrichedTasks: Record<string, unknown>[] = [];
            if (milestone && Array.isArray(milestone.taskIds)) {
              const taskIdsArray = milestone.taskIds;
              for (const tId of taskIdsArray) {
                const targetTask = taskMap.get(tId.toString());
                if (targetTask) {
                  const historySub = submissionMap.get(targetTask._id.toString());
                  const safeSub = historySub as {
                    evaluationResult?: {
                      overallScore?: number;
                      passed?: boolean;
                      areasForImprovement?: string[];
                    };
                    submissionContent?: Record<string, unknown>;
                  } | null;

                  enrichedTasks.push({
                    taskId: targetTask._id.toString(),
                    taskTitle: targetTask.title || 'Nhiệm vụ thực hành mới',
                    description: targetTask.description || 'Nội dung bài học đang được cập nhật.',
                    formatType: targetTask.formatType || 'READ',
                    taskType: targetTask.taskType || 'ANALYSIS_TASK',
                    quizQuestions: targetTask.quizQuestions || [],
                    isRequired: true,
                    estimatedHours: Math.ceil((targetTask.estimatedMinutes || 60) / 60),
                    order: enrichedTasks.length + 1,
                    lastSubmission: safeSub
                      ? {
                          overallScore: safeSub.evaluationResult?.overallScore ?? 0,
                          passed: safeSub.evaluationResult?.passed ?? false,
                          areasForImprovement: safeSub.evaluationResult?.areasForImprovement ?? [],
                          submissionContent: safeSub.submissionContent ?? {},
                        }
                      : null,
                  });
                }
              }
            }
            if (milestone) milestone.tasks = enrichedTasks;
          }
        }
      }
    }

    return roadmapDoc;
  }

  async generateDynamicRoadmap(
    userId: string,
    careerTitle: string,
  ): Promise<LearningRoadmapDocument> {
    const userObjId = new Types.ObjectId(userId);

    const existingRoadmap = await this.roadmapModel
      .findOne({ userId: userObjId, careerTitle, status: RoadmapStatus.ACTIVE })
      .exec();
    if (existingRoadmap) {
      const hydrated = await this.hydrateRoadmapTasks(existingRoadmap);
      if (!hydrated) throw new NotFoundException('Không tìm thấy sơ đồ bọc lót dữ liệu');
      return hydrated;
    }

    const fitResult = await this.careerFitResultModel
      .findOne({ userId: userObjId, careerTitle })
      .lean<ICareerFitResult>()
      .exec();
    if (!fitResult) {
      throw new BadRequestException(
        'Không tìm thấy dữ liệu cá tính. Vui lòng thực hiện làm bài test nghề nghiệp trước!',
      );
    }

    const insight = await this.careerInsightModel
      .findOne({ careerTitle })
      .lean<ICareerInsight>()
      .exec();
    const keySkills: string[] = insight?.analysis?.keySkills ?? [];
    const devAreas: string[] = fitResult.developmentAreas ?? [];

    const prompt = `
      Bạn là Giám đốc Đào tạo cấp cao của Edumee. Hãy xây dựng chương trình học tập thực chiến tăng tiến cho nghề nghiệp: "${careerTitle}".
      - Lỗ hổng năng lực: ${JSON.stringify(devAreas)}.
      - Kỹ năng cốt lõi: ${JSON.stringify(keySkills)}.

      ⚠️ QUY MÔ VÀ ĐỊNH DẠNG JSON BẮT BUỘC:
      Sinh chính xác mảng "phases" gồm ĐÚNG 3 giai đoạn. Mỗi giai đoạn có ĐÚNG 1 "milestones". Mỗi "milestones" có ĐÚNG 3 "tasks".
      Trong từng đối tượng task, bạn bắt buộc phải điền đầy đủ cả 3 trường "title", "formatType" và "description" theo quy tắc phân bổ sau:

      * Trường "title": Bắt buộc phải là tên đề mục/tên bài học rõ ràng, phản ánh chính xác nội dung kiến thức chuyên môn bài đó học về gì (Ví dụ: "Tổng quan về phân tích hành vi khách hàng ngành ${careerTitle}", "Kỹ thuật tối ưu hóa phễu chuyển đổi...", "Thiết lập kịch bản vận hành..."). TUYỆT ĐỐI KHÔNG đặt tên chung chung như "Nhiệm vụ mới" hoặc "Bài học lý thuyết".

      1. GIAI ĐOẠN 1 (Nền tảng):
         - Task 1 & Task 2: "formatType": "READ". Trường "description" viết lý thuyết súc tích (100-110 từ), chia làm 3 mục (### 1. Bản chất, ### 2. Thực tế, ### 3. Case study).
         - Task 3: "formatType": "QUIZ". Mảng "quizQuestions" phải chứa CHÍNH XÁC ĐÚNG 10 câu hỏi trắc nghiệm chuyên sâu (mỗi câu và 4 lựa chọn đáp án label ngắn gọn dưới 12 từ).

      2. GIAI ĐOẠN 2 (Kỹ năng):
         - Task 1 & Task 2: "formatType": "READ". Trường "description" tương tự lý thuyết giai đoạn 1.
         - Task 3: "formatType": "TEXT". Trường "description" BẮT BUỘC chứa ĐỀ BÀI TỰ LUẬN theo định dạng: "### 1. TÌNH HUỐNG THỰC CHIẾN (CASE STUDY)\\n[Kịch bản lỗi vận hành]\\n\\n### 2. YÊU CẦU XỬ LÝ\\n- Yêu cầu học viên...".

      3. GIAI ĐOẠN 3 (Thực chiến nâng cao):
         - Task 1 & Task 2: "formatType": "READ". Trường "description" viết lý thuyết súc tích nâng cao.
         - Task 3: "formatType": "HYBRID".
           * Trường "description" BẮT BUỘC phải chứa ĐỀ BÀI VÀ KỊCH BẢN TỰ LUẬN theo định dạng:
             ### 1. TÌNH HUỐNG NGHIỆP VỤ THỰC CHIẾN (CASE STUDY)\\n[Biên soạn tình huống sự cố phức tạp ngành ${careerTitle} dài 40-50 từ]\\n\\n### 2. YÊU CẦU ĐẦU RA TỰ LUẬN (40% TRỌNG SỐ)\\n- Yêu cầu 1: Chỉ ra nguyên nhân.\\n- Yêu cầu 2: Đề xuất giải pháp.\\n\\n### 3. TIÊU CHÍ CHẤM ĐIỂM (RUBRIC)\\n- Tư duy hệ thống (20%)\\n- Tính khả thi giải pháp (20%)
           * Mảng "quizQuestions" phải chứa CHÍNH XÁC ĐÚNG 5 câu hỏi trắc nghiệm nâng cao.

      ⚠️ QUY TẮC AN TOÀN CHUỖI JSON:
      - TUYỆT ĐỐI KHÔNG dùng dấu ngoặc kép đôi (") ở bên trong nội dung văn bản. KHÔNG dùng phím Enter xuống dòng, dùng \\n.
      - Trả về DUY NHẤT chuỗi JSON phẳng, không bọc mảng học liệu bổ trợ hay giải thích ngoài.
    `;

    let aiData: IAIGeneratedRoadmap | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const aiResponseRaw = await this.aiService.generateText(prompt, true);
        const aiText = typeof aiResponseRaw === 'string' ? aiResponseRaw : String(aiResponseRaw);

        let cleanedJson = aiText.trim();
        if (cleanedJson.startsWith('```')) {
          const firstLineEnd = cleanedJson.indexOf('\n');
          if (firstLineEnd !== -1) cleanedJson = cleanedJson.substring(firstLineEnd + 1);
          if (cleanedJson.endsWith('```'))
            cleanedJson = cleanedJson.substring(0, cleanedJson.length - 3);
        }
        cleanedJson = cleanedJson.trim();

        const controlCodes: number[] = [];
        for (let i = 0; i <= 31; i++) controlCodes.push(i);
        for (let i = 127; i <= 159; i++) controlCodes.push(i);

        const controlChars = String.fromCharCode(...controlCodes);
        const safeSanitizerRegex = new RegExp(
          `[${controlChars.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}]`,
          'g',
        );
        cleanedJson = cleanedJson.replace(safeSanitizerRegex, '');

        aiData = JSON.parse(cleanedJson) as IAIGeneratedRoadmap;

        let safePhases: IAIGeneratedPhase[] = [];
        if (aiData && Array.isArray(aiData.phases)) safePhases = aiData.phases;
        else if (aiData && aiData.roadmap && Array.isArray(aiData.roadmap.phases))
          safePhases = aiData.roadmap.phases;
        else if (aiData && aiData.data && Array.isArray(aiData.data.phases))
          safePhases = aiData.data.phases;

        if (safePhases.length === 0) throw new Error('Thiếu cấu trúc phases');
        break;
      } catch {
        if (attempt === maxRetries)
          throw new BadRequestException('Hệ thống AI quá tải. Vui lòng bấm thử lại sau giây lát.');
      }
    }

    if (!aiData) throw new BadRequestException('Không thể khởi tạo dữ liệu.');

    let safePhases: IAIGeneratedPhase[] = [];
    if (aiData && Array.isArray(aiData.phases)) safePhases = aiData.phases;
    else if (aiData && aiData.roadmap && Array.isArray(aiData.roadmap.phases))
      safePhases = aiData.roadmap.phases;
    else if (aiData && aiData.data && Array.isArray(aiData.data.phases))
      safePhases = aiData.data.phases;

    const tasksToCreate: Array<Record<string, unknown>> = [];
    const targetCareerId = fitResult.careerId ?? insight?._id ?? new Types.ObjectId();

    for (const aiPhase of safePhases) {
      const safeMilestones = Array.isArray(aiPhase?.milestones) ? aiPhase.milestones : [];
      for (const aiMilestone of safeMilestones) {
        const safeTasks = Array.isArray(aiMilestone?.tasks) ? aiMilestone.tasks : [];
        for (const aiTask of safeTasks) {
          let safeFormatType: TaskFormatType = TaskFormatType.READ;
          const rawFormat = String(aiTask?.formatType || 'READ').toUpperCase();

          if (Object.values(TaskFormatType).includes(rawFormat as TaskFormatType)) {
            safeFormatType = rawFormat as TaskFormatType;
          } else if (rawFormat.includes('CODE') || rawFormat.includes('TEXT')) {
            safeFormatType = TaskFormatType.TEXT;
          } else if (rawFormat.includes('QUIZ')) {
            safeFormatType = TaskFormatType.QUIZ;
          } else if (rawFormat.includes('HYBRID')) {
            safeFormatType = TaskFormatType.HYBRID;
          }

          const rawQuestions = Array.isArray(aiTask?.quizQuestions) ? aiTask.quizQuestions : [];
          const processedQuestions: IQuizQuestionInput[] = (rawQuestions as unknown[]).map(
            (rawQ, qIdx) => {
              const q = rawQ as IAIQuizQuestion; // Khử hoàn toàn "as any"
              const rawText = (q?.questionText || q?.question || q?.title || '').trim();
              const questionText =
                rawText.length > 0 ? rawText : `Câu hỏi phân tích nghiệp vụ số ${qIdx + 1}`;

              const rawOptions = Array.isArray(q?.options) ? q.options : [];
              const processedOptions = rawOptions.map((rawOpt: unknown, oIdx) => {
                let labelText = '';
                if (typeof rawOpt === 'string') {
                  labelText = rawOpt;
                } else if (rawOpt && typeof rawOpt === 'object') {
                  const optObj = rawOpt as IAIOption; // Khử unsafe member access nội bộ
                  labelText = optObj?.label || optObj?.text || optObj?.title || '';
                }
                labelText = labelText.trim() || `Lựa chọn số ${oIdx + 1}`;
                return { value: oIdx + 1, label: labelText };
              });

              return {
                questionText,
                isMultipleChoice:
                  typeof q?.isMultipleChoice === 'boolean' ? q.isMultipleChoice : false,
                options: processedOptions,
                correctValue: typeof q?.correctValue === 'number' ? q.correctValue : 1,
              };
            },
          );

          tasksToCreate.push({
            _id: new Types.ObjectId(),
            careerId: targetCareerId,
            title: aiTask?.title || 'Nhiệm vụ mới',
            description: aiTask?.description || 'Nội dung chi tiết cập nhật sau.',
            formatType: safeFormatType,
            taskType: 'ANALYSIS_TASK',
            difficulty: 'BEGINNER',
            estimatedMinutes: aiTask?.estimatedMinutes ?? 30,
            quizQuestions: processedQuestions,
            evaluationRubric: aiTask?.evaluationRubric ?? [],
          });
        }
      }
    }

    const createdTasks = await this.taskModel.insertMany(tasksToCreate);
    const taskIterator = createdTasks.values();

    const finalPhases: any[] = [];
    const flatTaskProgress: ITaskProgress[] = [];
    let isFirstTask = true;

    for (let pIdx = 0; pIdx < safePhases.length; pIdx++) {
      const aiPhase = safePhases[pIdx];
      const currentPhase = {
        phaseId: new Types.ObjectId().toHexString(),
        title: aiPhase?.title || `Giai đoạn ${pIdx + 1}`,
        estimatedDuration: aiPhase?.estimatedDuration || '2 tuần',
        order: aiPhase?.order || pIdx + 1,
        milestones: [] as any[],
      };

      const safeMilestones = Array.isArray(aiPhase?.milestones) ? aiPhase.milestones : [];
      for (let mIdx = 0; mIdx < safeMilestones.length; mIdx++) {
        const aiMilestone = safeMilestones[mIdx];
        const milestoneTaskIds: Types.ObjectId[] = [];
        const safeTasks = Array.isArray(aiMilestone?.tasks) ? aiMilestone.tasks : [];

        for (let tIdx = 0; tIdx < safeTasks.length; tIdx++) {
          const nextTaskDoc = taskIterator.next().value as SimulationTask | undefined;
          if (nextTaskDoc) {
            milestoneTaskIds.push(nextTaskDoc._id);
            flatTaskProgress.push({
              taskId: nextTaskDoc._id,
              status: isFirstTask ? TaskProgressStatus.IN_PROGRESS : TaskProgressStatus.LOCKED,
              startedAt: isFirstTask ? new Date() : undefined,
            });
            isFirstTask = false;
          }
        }

        if (aiMilestone) {
          currentPhase.milestones.push({
            milestoneId: new Types.ObjectId().toHexString(),
            title: aiMilestone.title || `Mục tiêu mốc ${mIdx + 1}`,
            order: aiMilestone.order || mIdx + 1,
            taskIds: milestoneTaskIds,
          });
        }
      }
      finalPhases.push(currentPhase);
    }

    const newRoadmap = new this.roadmapModel({
      userId: userObjId,
      careerId: targetCareerId,
      title: `Lộ trình học tập chuyên sâu ${careerTitle}`,
      careerTitle: careerTitle,
      status: RoadmapStatus.ACTIVE,
      phases: finalPhases,
      taskProgress: flatTaskProgress,
      overallProgress: 0,
      isTemplate: false,
    });

    const savedResult = await newRoadmap.save();
    return this.roadmapModel
      .findById(savedResult._id)
      .exec()
      .then(async (doc) => this.hydrateRoadmapTasks(doc)) as Promise<LearningRoadmapDocument>;
  }

  async updateTaskStatusAndUnlockNext(
    roadmapId: string,
    taskId: string,
    newStatus: TaskProgressStatus,
  ): Promise<LearningRoadmapDocument> {
    const roadmap = await this.roadmapModel.findById(roadmapId);
    if (!roadmap) throw new NotFoundException('Không tìm thấy lộ trình');

    const taskObjectId = new Types.ObjectId(taskId);
    let currentTaskIndex = -1;
    let completedOrSkippedCount = 0;
    const taskProgress = roadmap.taskProgress;

    for (let i = 0; i < taskProgress.length; i++) {
      const task = taskProgress[i];
      if (task.taskId.equals(taskObjectId)) {
        task.status = newStatus;
        if (newStatus === TaskProgressStatus.COMPLETED) task.completedAt = new Date();
        currentTaskIndex = i;
      }
      if (task.status === TaskProgressStatus.COMPLETED) completedOrSkippedCount++;
    }

    if (currentTaskIndex === -1) throw new BadRequestException('Nhiệm vụ không thuộc lộ trình');

    if (newStatus === TaskProgressStatus.COMPLETED) {
      for (let i = currentTaskIndex + 1; i < taskProgress.length; i++) {
        if (taskProgress[i].status === TaskProgressStatus.LOCKED) {
          taskProgress[i].status = TaskProgressStatus.IN_PROGRESS;
          taskProgress[i].startedAt = new Date();
          break;
        }
      }
    }

    roadmap.overallProgress = Math.round((completedOrSkippedCount / taskProgress.length) * 100);
    roadmap.markModified('taskProgress');
    const saved = await roadmap.save();
    return this.hydrateRoadmapTasks(saved) as Promise<LearningRoadmapDocument>;
  }

  async getLatestRoadmap(userId: string): Promise<LearningRoadmapDocument | null> {
    const latest = await this.roadmapModel
      .findOne({ userId: new Types.ObjectId(userId), isTemplate: false })
      .sort({ createdAt: -1 })
      .exec();
    return this.hydrateRoadmapTasks(latest);
  }

  async getRoadmapById(id: string): Promise<LearningRoadmapDocument | null> {
    const roadmap = await this.roadmapModel.findById(id).exec();
    return this.hydrateRoadmapTasks(roadmap);
  }

  async create(payload: CreateRoadmapPayload): Promise<LearningRoadmapDocument> {
    return new this.roadmapModel({
      ...payload,
      careerId: payload.careerId ? new Types.ObjectId(payload.careerId) : null,
    }).save();
  }

  async getDashboardWidget(userId: string): Promise<Record<string, unknown> | null> {
    const roadmap = await this.roadmapModel
      .findOne({ userId: new Types.ObjectId(userId), isTemplate: false })
      .exec();
    if (!roadmap) return null;
    return {
      roadmapId: roadmap._id.toString(),
      title: roadmap.title,
      overallProgress: roadmap.overallProgress,
      currentTasks: roadmap.taskProgress.filter((t) => t.status === TaskProgressStatus.IN_PROGRESS),
    };
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: FilterQuery<LearningRoadmapDocument> = {},
  ): Promise<{ data: LearningRoadmapDocument[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.roadmapModel.find(filters).skip(skip).limit(limit).exec(),
      this.roadmapModel.countDocuments(filters),
    ]);
    return { data, total, page, limit };
  }
  async findTemplates(): Promise<LearningRoadmapDocument[]> {
    // 🎯 TỐI ƯU: Thêm .lean() để tăng tốc độ đọc và đưa về mảng Object phẳng Type-safe
    const templates = await this.roadmapModel.find({ isTemplate: true }).lean().exec();
    return templates as unknown as LearningRoadmapDocument[];
  }
  async findOne(id: string): Promise<LearningRoadmapDocument> {
    const r = await this.roadmapModel.findById(id).exec();
    if (!r) throw new NotFoundException('Không tìm thấy lộ trình học');

    // 🎯 FIX TRIỆT ĐỂ UNSAFE: Await luồng chạy xuống để lấy Object thực tế thay vì cast Promise
    const hydrated = await this.hydrateRoadmapTasks(r);
    if (!hydrated) {
      throw new NotFoundException('Không thể liên kết dữ liệu bài học');
    }

    return hydrated; // TypeScript tự hiểu đây là LearningRoadmapDocument sạch 100%
  }
  async update(id: string, dto: UpdateLearningRoadmapDto): Promise<LearningRoadmapDocument> {
    const r = await this.roadmapModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!r) throw new NotFoundException();
    return r;
  }
  async remove(id: string): Promise<void> {
    if (!(await this.roadmapModel.findByIdAndDelete(id).exec())) throw new NotFoundException();
  }
}
