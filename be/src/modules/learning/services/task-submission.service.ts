import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TaskSubmission,
  TaskSubmissionDocument,
  SubmissionStatus,
  EvaluationType,
} from '../schemas/task-submission.schema';
import { CreateTaskSubmissionDto, UpdateTaskSubmissionDto } from '../dto';

@Injectable()
export class TaskSubmissionService {
  constructor(
    @InjectModel(TaskSubmission.name)
    private readonly taskSubmissionModel: Model<TaskSubmissionDocument>,
  ) {}

  async create(createDto: CreateTaskSubmissionDto): Promise<TaskSubmission> {
    const submission = new this.taskSubmissionModel({
      ...createDto,
      userId: new Types.ObjectId(createDto.userId),
      taskId: new Types.ObjectId(createDto.taskId),
      roadmapId: createDto.roadmapId ? new Types.ObjectId(createDto.roadmapId) : undefined,
      previousAttemptId: createDto.previousAttemptId ? 
        new Types.ObjectId(createDto.previousAttemptId) : undefined,
    });
    
    return submission.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<TaskSubmission> = {},
  ): Promise<{
    data: TaskSubmission[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    
    const query = this.buildQuery(filters);
    
    const [data, total] = await Promise.all([
      this.taskSubmissionModel
        .find(query)
        .populate('userId', 'email firstName lastName')
        .populate('taskId', 'title taskType difficulty')
        .populate('roadmapId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.taskSubmissionModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<TaskSubmission> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid submission ID');
    }

    const submission = await this.taskSubmissionModel
      .findById(id)
      .populate('userId', 'email firstName lastName')
      .populate('taskId', 'title taskType difficulty evaluationRubric')
      .populate('roadmapId', 'title')
      .populate('previousAttemptId', 'attemptNumber evaluation.overallScore')
      .populate('subsequentAttempts', 'attemptNumber evaluation.overallScore')
      .exec();

    if (!submission) {
      throw new NotFoundException('Task submission not found');
    }

    return submission;
  }

  async findByUser(userId: string): Promise<TaskSubmission[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.taskSubmissionModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('taskId', 'title taskType difficulty')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByTask(taskId: string): Promise<TaskSubmission[]> {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }

    return this.taskSubmissionModel
      .find({ taskId: new Types.ObjectId(taskId) })
      .populate('userId', 'email firstName lastName')
      .sort({ 'evaluation.overallScore': -1, createdAt: -1 })
      .exec();
  }

  async findByUserAndTask(userId: string, taskId: string): Promise<TaskSubmission[]> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('Invalid user ID or task ID');
    }

    return this.taskSubmissionModel
      .find({
        userId: new Types.ObjectId(userId),
        taskId: new Types.ObjectId(taskId),
      })
      .sort({ attemptNumber: 1 })
      .exec();
  }

  async findPendingEvaluations(): Promise<TaskSubmission[]> {
    return this.taskSubmissionModel
      .find({
        status: { $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW] },
      })
      .populate('userId', 'email firstName lastName')
      .populate('taskId', 'title taskType difficulty')
      .sort({ createdAt: 1 }) // Oldest first
      .exec();
  }

  async submitForEvaluation(submissionId: string): Promise<TaskSubmission> {
    if (!Types.ObjectId.isValid(submissionId)) {
      throw new BadRequestException('Invalid submission ID');
    }

    const submission = await this.taskSubmissionModel
      .findByIdAndUpdate(
        submissionId,
        {
          status: SubmissionStatus.SUBMITTED,
          'timeTracking.submittedAt': new Date(),
        },
        { new: true }
      )
      .exec();

    if (!submission) {
      throw new NotFoundException('Task submission not found');
    }

    return submission;
  }

  async evaluateSubmission(
    submissionId: string,
    evaluation: any,
    evaluatorId?: string,
  ): Promise<TaskSubmission> {
    if (!Types.ObjectId.isValid(submissionId)) {
      throw new BadRequestException('Invalid submission ID');
    }

    const submission = await this.taskSubmissionModel
      .findByIdAndUpdate(
        submissionId,
        {
          evaluation,
          status: SubmissionStatus.EVALUATED,
        },
        { new: true }
      )
      .exec();

    if (!submission) {
      throw new NotFoundException('Task submission not found');
    }

    // Update task statistics
    // Note: This would typically call SimulationTaskService.updateTaskStatistics

    return submission;
  }

  async requestRevision(
    submissionId: string,
    feedback: string,
    requiredChanges: string[],
  ): Promise<TaskSubmission> {
    if (!Types.ObjectId.isValid(submissionId)) {
      throw new BadRequestException('Invalid submission ID');
    }

    const submission = await this.taskSubmissionModel
      .findByIdAndUpdate(
        submissionId,
        {
          status: SubmissionStatus.NEEDS_REVISION,
          $push: {
            'evaluation.areasForImprovement': { $each: requiredChanges }
          },
          'evaluation.specificFeedback': feedback,
        },
        { new: true }
      )
      .exec();

    if (!submission) {
      throw new NotFoundException('Task submission not found');
    }

    return submission;
  }

  async approveSubmission(submissionId: string): Promise<TaskSubmission> {
    if (!Types.ObjectId.isValid(submissionId)) {
      throw new BadRequestException('Invalid submission ID');
    }

    const submission = await this.taskSubmissionModel
      .findByIdAndUpdate(
        submissionId,
        { status: SubmissionStatus.APPROVED },
        { new: true }
      )
      .exec();

    if (!submission) {
      throw new NotFoundException('Task submission not found');
    }

    return submission;
  }

  async createRetryAttempt(
    originalSubmissionId: string,
    newSubmissionData: CreateTaskSubmissionDto,
  ): Promise<TaskSubmission> {
    const originalSubmission = await this.findOne(originalSubmissionId);
    
    const retrySubmission = await this.create({
      ...newSubmissionData,
      attemptNumber: (originalSubmission.attemptNumber || 1) + 1,
      previousAttemptId: originalSubmissionId,
    });

    // Update original submission with reference to retry
    await this.taskSubmissionModel
      .findByIdAndUpdate(
        originalSubmissionId,
        { $push: { subsequentAttempts: retrySubmission._id } }
      )
      .exec();

    return retrySubmission;
  }

  async getSubmissionStatistics(filters?: any): Promise<any> {
    const matchStage: any = {};
    
    if (filters?.userId) {
      matchStage.userId = new Types.ObjectId(filters.userId);
    }
    if (filters?.taskId) {
      matchStage.taskId = new Types.ObjectId(filters.taskId);
    }
    if (filters?.status) {
      matchStage.status = filters.status;
    }

    const stats = await this.taskSubmissionModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          completedSubmissions: {
            $sum: { $cond: [{ $eq: ['$status', SubmissionStatus.APPROVED] }, 1, 0] }
          },
          pendingEvaluations: {
            $sum: {
              $cond: [
                { $in: ['$status', [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW]] },
                1,
                0
              ]
            }
          },
          averageScore: { $avg: '$evaluation.overallScore' },
          averageAttempts: { $avg: '$attemptNumber' },
          submissionsByStatus: {
            $push: {
              status: '$status',
              score: '$evaluation.overallScore',
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalSubmissions: 0,
      completedSubmissions: 0,
      pendingEvaluations: 0,
      averageScore: 0,
      averageAttempts: 0,
      submissionsByStatus: [],
    };
  }

  async getUserProgress(userId: string): Promise<any> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const progress = await this.taskSubmissionModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$taskId',
          submissions: { $push: '$$ROOT' },
          bestScore: { $max: '$evaluation.overallScore' },
          totalAttempts: { $sum: 1 },
          lastAttempt: { $max: '$createdAt' },
          passed: {
            $max: {
              $cond: [{ $eq: ['$evaluation.passed', true] }, 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'simulation_tasks',
          localField: '_id',
          foreignField: '_id',
          as: 'task'
        }
      },
      { $unwind: '$task' },
      {
        $project: {
          taskTitle: '$task.title',
          taskType: '$task.taskType',
          difficulty: '$task.difficulty',
          bestScore: 1,
          totalAttempts: 1,
          lastAttempt: 1,
          passed: 1,
        }
      },
      { $sort: { lastAttempt: -1 } }
    ]);

    return progress;
  }

  async getLeaderboard(taskId?: string, limit = 10): Promise<any> {
    const matchStage: any = {
      status: SubmissionStatus.APPROVED,
      'evaluation.overallScore': { $exists: true },
    };

    if (taskId) {
      if (!Types.ObjectId.isValid(taskId)) {
        throw new BadRequestException('Invalid task ID');
      }
      matchStage.taskId = new Types.ObjectId(taskId);
    }

    return this.taskSubmissionModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { userId: '$userId', taskId: '$taskId' },
          bestScore: { $max: '$evaluation.overallScore' },
          bestSubmission: { $first: '$$ROOT' },
          totalAttempts: { $sum: 1 },
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id.userId',
          taskId: '$_id.taskId',
          userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          bestScore: 1,
          totalAttempts: 1,
          submissionDate: '$bestSubmission.createdAt',
        }
      },
      { $sort: { bestScore: -1, submissionDate: 1 } },
      { $limit: limit }
    ]);
  }

  async update(id: string, updateDto: UpdateTaskSubmissionDto): Promise<TaskSubmission> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid submission ID');
    }

    if (updateDto.userId) {
      updateDto.userId = new Types.ObjectId(updateDto.userId) as any;
    }
    if (updateDto.taskId) {
      updateDto.taskId = new Types.ObjectId(updateDto.taskId) as any;
    }
    if (updateDto.roadmapId) {
      updateDto.roadmapId = new Types.ObjectId(updateDto.roadmapId) as any;
    }

    const submission = await this.taskSubmissionModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .populate('userId', 'email firstName lastName')
      .populate('taskId', 'title taskType difficulty')
      .exec();

    if (!submission) {
      throw new NotFoundException('Task submission not found');
    }

    return submission;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid submission ID');
    }

    const result = await this.taskSubmissionModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Task submission not found');
    }
  }

  private buildQuery(filters: Partial<TaskSubmission>): any {
    const query: any = {};

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId as any);
    }

    if (filters.taskId) {
      query.taskId = new Types.ObjectId(filters.taskId as any);
    }

    if (filters.roadmapId) {
      query.roadmapId = new Types.ObjectId(filters.roadmapId as any);
    }

    if (filters.status) {
      query.status = filters.status;
    }

    return query;
  }
}