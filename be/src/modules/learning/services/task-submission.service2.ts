import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, HydratedDocument, Model, Types } from 'mongoose';
import { TaskFormatType, TaskProgressStatus } from '../../../common/enums/learning.enum';
import { AIService } from '../../../common/services/ai.service';
import { UpdateTaskSubmissionDto } from '../dto/index';
import {
  IEvaluationRubric,
  IQuizQuestion,
  SimulationTask,
} from '../schemas/simulation-task.schema2';
import {
  IQuizAnswerRecord,
  ISubmissionContent,
  TaskSubmission,
  TaskSubmissionDocument,
} from '../schemas/task-submission.schema2';
import { LearningRoadmapService } from './learning-roadmap.service2';
import { UserLearningProfileService } from './user-learning-profile.service';

interface IAIResponseGrading {
  score: number;
  comment?: string;
}

@Injectable()
export class TaskSubmissionService {
  private readonly logger = new Logger(TaskSubmissionService.name);

  constructor(
    @InjectModel(TaskSubmission.name)
    private readonly submissionModel: Model<TaskSubmissionDocument>,
    @InjectModel(SimulationTask.name)
    private readonly taskModel: Model<HydratedDocument<SimulationTask>>,
    private readonly roadmapService: LearningRoadmapService,
    private readonly userLearningProfileService: UserLearningProfileService,
    private readonly aiService: AIService,
  ) {}

  async submitAndEvaluate(
    userId: string,
    taskId: string,
    roadmapId: string,
    content: ISubmissionContent,
  ): Promise<TaskSubmissionDocument> {
    const taskObjId = new Types.ObjectId(taskId);
    const userObjId = new Types.ObjectId(userId);
    const roadmapObjId = new Types.ObjectId(roadmapId);

    const task = await this.taskModel.findById(taskObjId).exec();
    if (!task) throw new NotFoundException('Không tìm thấy bài tập hoặc bài kiểm tra này.');

    let submission = await this.submissionModel
      .findOne({ taskId: taskObjId, userId: userObjId, roadmapId: roadmapObjId })
      .exec();
    if (!submission) {
      submission = new this.submissionModel({
        taskId: taskObjId,
        userId: userObjId,
        roadmapId: roadmapObjId,
        attemptNumber: 1,
      });
    } else {
      submission.attemptNumber += 1;
    }

    submission.submissionContent = content;
    submission.submittedAt = new Date();

    let finalScore = 0;
    const aiComments: string[] = [];

    const formatType = task.formatType;
    const quizQuestions: IQuizQuestion[] = task.quizQuestions ?? [];
    const evaluationRubric: IEvaluationRubric[] = task.evaluationRubric ?? [];

    if (formatType === TaskFormatType.READ) {
      finalScore = 100;
    } else if (formatType === TaskFormatType.QUIZ) {
      finalScore = this.calculateQuizScore(quizQuestions, content.quizAnswers ?? [], aiComments);
    } else if (formatType === TaskFormatType.TEXT) {
      finalScore = await this.gradeTextWithAI(
        evaluationRubric,
        content.textContent ?? '',
        aiComments,
      );
    } else if (formatType === TaskFormatType.HYBRID) {
      const mcqComments: string[] = [];
      const essayComments: string[] = [];

      const mcqScore = this.calculateQuizScore(
        quizQuestions,
        content.quizAnswers ?? [],
        mcqComments,
      );
      const textScore = await this.gradeTextWithAI(
        evaluationRubric,
        content.textContent ?? '',
        essayComments,
      );

      finalScore = mcqScore * 0.6 + textScore * 0.4;

      aiComments.push('📊 [KẾT QUẢ PHẦN TRẮC NGHIỆM - CHIẾM 60% TRỌNG SỐ]');
      if (mcqComments.length > 0) {
        aiComments.push(...mcqComments);
      } else {
        aiComments.push('✓ Tuyệt vời! Bạn đã hoàn thành chính xác 100% các câu hỏi trắc nghiệm.');
      }

      aiComments.push('📝 [KẾT QUẢ PHẦN TỰ LUẬN - CHIẾM 40% TRỌNG SỐ]');
      if (essayComments.length > 0) {
        aiComments.push(...essayComments);
      } else {
        aiComments.push('✓ Hệ thống đã ghi nhận nội dung phân tích tự luận của bạn.');
      }
    }

    const roundedScore = Math.round(finalScore);
    const isPassed = roundedScore >= 65;

    submission.evaluationResult = {
      overallScore: roundedScore,
      passed: isPassed,
      strengths: isPassed
        ? ['Tuyệt vời! Bạn đã vượt qua cột mốc này với kết quả rất tốt.']
        : ['Chưa đạt. Bạn cần cố gắng ôn tập và làm lại.'],
      areasForImprovement: aiComments,
    };

    if (isPassed) {
      submission.status = TaskProgressStatus.COMPLETED;
      await this.roadmapService.updateTaskStatusAndUnlockNext(
        roadmapId,
        taskId,
        TaskProgressStatus.COMPLETED,
      );
      await this.userLearningProfileService.updateLearningActivity(userId);
    } else {
      submission.status = TaskProgressStatus.IN_PROGRESS;
    }

    return submission.save();
  }

  async findAll(
    page: number,
    limit: number,
    filters: FilterQuery<TaskSubmissionDocument>,
  ): Promise<{ data: TaskSubmissionDocument[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.submissionModel.find(filters).skip(skip).limit(limit).exec(),
      this.submissionModel.countDocuments(filters),
    ]);
    return { data, total, page, limit };
  }

  async findByUser(userId: string): Promise<TaskSubmissionDocument[]> {
    return await this.submissionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<TaskSubmissionDocument> {
    const submission = await this.submissionModel.findById(id).exec();
    if (!submission) throw new NotFoundException('Không tìm thấy bản ghi bài nộp');
    return submission;
  }

  async update(id: string, updateDto: UpdateTaskSubmissionDto): Promise<TaskSubmissionDocument> {
    const submission = await this.submissionModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    if (!submission) throw new NotFoundException('Không tìm thấy bản ghi bài nộp để cập nhật');
    return submission;
  }

  async remove(id: string): Promise<void> {
    await this.submissionModel.findByIdAndDelete(id).exec();
  }

  private calculateQuizScore(
    questions: IQuizQuestion[],
    userAnswers: IQuizAnswerRecord[],
    commentsRef: string[],
  ): number {
    if (questions.length === 0) return 0;
    let correctCount = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const uA = userAnswers.find((a) => a.questionIndex === i);
      if (uA && uA.selectedValue === q.correctValue) {
        correctCount++;
      } else {
        const correctOpt = q.options.find((o) => o.value === q.correctValue);
        if (correctOpt) {
          commentsRef.push(
            `Câu số ${i + 1}: Bạn chọn chưa chính xác. Đáp án đúng phải là: "${correctOpt.label}".`,
          );
        }
      }
    }
    return (correctCount / questions.length) * 100;
  }

  private async gradeTextWithAI(
    rubric: IEvaluationRubric[],
    textContent: string,
    commentsRef: string[],
  ): Promise<number> {
    if (!textContent || textContent.trim() === '') {
      commentsRef.push('Học viên chưa cung cấp nội dung tự luận.');
      return 0;
    }

    const prompt = `
      Bạn là chuyên gia chấm bài. Đánh giá bài làm thực hành sau trên thang 100.
      Barem: ${JSON.stringify(rubric)}.
      Bài nộp: "${textContent}"
      Trả về DUY NHẤT chuỗi JSON: {"score": 80, "comment": "Chỉ ra điểm sai và khuyên..."}
    `;

    try {
      const aiResponseRaw = (await this.aiService.generateText(prompt)) as unknown;
      const aiText = typeof aiResponseRaw === 'string' ? aiResponseRaw : String(aiResponseRaw);
      const jsonString = aiText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const aiData = JSON.parse(jsonString) as IAIResponseGrading;

      if (aiData.comment) commentsRef.push(aiData.comment);
      return typeof aiData.score === 'number' ? aiData.score : 0;
    } catch (error) {
      this.logger.error('Lỗi khi AI chấm điểm', error);
      commentsRef.push('Hệ thống AI không thể phân tích bài tự luận. Cho điểm pass mặc định.');
      return 65;
    }
  }
}
