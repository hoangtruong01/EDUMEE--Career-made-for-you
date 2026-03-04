import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Checkpoint, CheckpointDocument, CheckpointType, CheckpointStatus } from '../schemas/checkpoint.schema';
import { CreateCheckpointDto, UpdateCheckpointDto } from '../dto';

@Injectable()
export class CheckpointService {
  constructor(
    @InjectModel(Checkpoint.name)
    private readonly checkpointModel: Model<CheckpointDocument>,
  ) {}

  async create(createDto: CreateCheckpointDto): Promise<Checkpoint> {
    const checkpoint = new this.checkpointModel({
      ...createDto,
      userId: new Types.ObjectId(createDto.userId),
      roadmapId: new Types.ObjectId(createDto.roadmapId),
      weeklyPlanId: createDto.weeklyPlanId ? new Types.ObjectId(createDto.weeklyPlanId) : undefined,
      scheduledDate: new Date(createDto.scheduledDate),
    });
    
    return checkpoint.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<Checkpoint> = {},
  ): Promise<{ data: Checkpoint[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    const query = this.buildQuery(filters);
    
    const [data, total] = await Promise.all([
      this.checkpointModel
        .find(query)
        .populate('userId', 'email firstName lastName')
        .populate('roadmapId', 'title targetCareer')
        .populate('weeklyPlanId', 'weekNumber weekPeriod')
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.checkpointModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Checkpoint> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid checkpoint ID');
    }

    const checkpoint = await this.checkpointModel
      .findById(id)
      .populate('userId', 'email firstName lastName')
      .populate('roadmapId', 'title targetCareer progress')
      .populate('weeklyPlanId', 'weekNumber weekPeriod status')
      .exec();

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    return checkpoint;
  }

  async findByUser(userId: string): Promise<Checkpoint[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.checkpointModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('roadmapId', 'title targetCareer')
      .sort({ scheduledDate: -1 })
      .exec();
  }

  async findByRoadmap(roadmapId: string): Promise<Checkpoint[]> {
    if (!Types.ObjectId.isValid(roadmapId)) {
      throw new BadRequestException('Invalid roadmap ID');
    }

    return this.checkpointModel
      .find({ roadmapId: new Types.ObjectId(roadmapId) })
      .sort({ scheduledDate: 1 })
      .exec();
  }

  async findByType(
    checkpointType: CheckpointType,
    userId?: string,
  ): Promise<Checkpoint[]> {
    const query: any = { checkpointType };
    
    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }
      query.userId = new Types.ObjectId(userId);
    }

    return this.checkpointModel
      .find(query)
      .populate('userId', 'email firstName lastName')
      .populate('roadmapId', 'title')
      .sort({ scheduledDate: -1 })
      .exec();
  }

  async findUpcoming(userId: string, days = 7): Promise<Checkpoint[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return this.checkpointModel
      .find({
        userId: new Types.ObjectId(userId),
        scheduledDate: { $gte: now, $lte: futureDate },
        status: { $in: [CheckpointStatus.SCHEDULED, CheckpointStatus.RESCHEDULED] },
      })
      .populate('roadmapId', 'title')
      .sort({ scheduledDate: 1 })
      .exec();
  }

  async findOverdue(userId?: string): Promise<Checkpoint[]> {
    const query: any = {
      scheduledDate: { $lt: new Date() },
      status: { $in: [CheckpointStatus.SCHEDULED, CheckpointStatus.IN_PROGRESS] },
    };

    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }
      query.userId = new Types.ObjectId(userId);
    }

    return this.checkpointModel
      .find(query)
      .populate('userId', 'email firstName lastName')
      .populate('roadmapId', 'title')
      .sort({ scheduledDate: 1 })
      .exec();
  }

  async completeCheckpoint(
    id: string,
    updateData: Partial<UpdateCheckpointDto>,
  ): Promise<Checkpoint> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid checkpoint ID');
    }

    const updateDto: Partial<UpdateCheckpointDto> = {
      ...updateData,
      status: CheckpointStatus.COMPLETED,
      completedDate: new Date().toISOString(),
    };

    const checkpoint = await this.checkpointModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .populate('userId', 'email firstName lastName')
      .populate('roadmapId', 'title targetCareer')
      .exec();

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    return checkpoint;
  }

  async rescheduleCheckpoint(
    id: string,
    newDate: Date,
    reason?: string,
  ): Promise<Checkpoint> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid checkpoint ID');
    }

    const checkpoint = await this.checkpointModel
      .findByIdAndUpdate(
        id,
        {
          scheduledDate: newDate,
          status: CheckpointStatus.RESCHEDULED,
          $push: {
            adaptations: {
              adaptationDate: new Date(),
              reason: reason || 'Manual reschedule',
              changes: [
                {
                  type: 'adjusted_timeline',
                  description: 'Checkpoint rescheduled',
                  newValue: newDate,
                },
              ],
              triggeredBy: 'user_request',
            },
          },
        },
        { new: true, runValidators: true }
      )
      .populate('roadmapId', 'title')
      .exec();

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    return checkpoint;
  }

  async generateActionItems(
    checkpointId: string,
    analysisResults: any,
  ): Promise<Checkpoint> {
    if (!Types.ObjectId.isValid(checkpointId)) {
      throw new BadRequestException('Invalid checkpoint ID');
    }

    // Generate action items based on checkpoint analysis
    const actionItems = this.createActionItemsFromAnalysis(analysisResults);

    const checkpoint = await this.checkpointModel
      .findByIdAndUpdate(
        checkpointId,
        { $push: { actionItems: { $each: actionItems } } },
        { new: true }
      )
      .exec();

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    return checkpoint;
  }

  async updateActionItem(
    checkpointId: string,
    actionItemId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
  ): Promise<Checkpoint> {
    if (!Types.ObjectId.isValid(checkpointId)) {
      throw new BadRequestException('Invalid checkpoint ID');
    }

    const updateData: any = {
      'actionItems.$.status': status,
    };

    if (status === 'completed') {
      updateData['actionItems.$.completedDate'] = new Date();
    }

    const checkpoint = await this.checkpointModel
      .findOneAndUpdate(
        { _id: checkpointId, 'actionItems.actionId': actionItemId },
        updateData,
        { new: true }
      )
      .exec();

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint or action item not found');
    }

    return checkpoint;
  }

  async getCheckpointAnalytics(userId?: string): Promise<any> {
    const matchStage: any = {};
    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }
      matchStage.userId = new Types.ObjectId(userId);
    }

    const analytics = await this.checkpointModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalCheckpoints: { $sum: 1 },
          completedCheckpoints: {
            $sum: { $cond: [{ $eq: ['$status', CheckpointStatus.COMPLETED] }, 1, 0] }
          },
          overdueCheckpoints: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$scheduledDate', new Date()] },
                    { $ne: ['$status', CheckpointStatus.COMPLETED] }
                  ]
                },
                1,
                0
              ]
            }
          },
          avgProgressScore: {
            $avg: '$progressEvaluation.overallProgress'
          },
          checkpointsByType: {
            $push: {
              type: '$checkpointType',
              status: '$status',
            }
          }
        }
      }
    ]);

    return analytics[0] || {
      totalCheckpoints: 0,
      completedCheckpoints: 0,
      overdueCheckpoints: 0,
      avgProgressScore: 0,
      checkpointsByType: [],
    };
  }

  async update(id: string, updateDto: UpdateCheckpointDto): Promise<Checkpoint> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid checkpoint ID');
    }

    if (updateDto.userId) {
      updateDto.userId = new Types.ObjectId(updateDto.userId) as any;
    }
    if (updateDto.roadmapId) {
      updateDto.roadmapId = new Types.ObjectId(updateDto.roadmapId) as any;
    }
    if (updateDto.weeklyPlanId) {
      updateDto.weeklyPlanId = new Types.ObjectId(updateDto.weeklyPlanId) as any;
    }

    const checkpoint = await this.checkpointModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .populate('userId', 'email firstName lastName')
      .populate('roadmapId', 'title targetCareer')
      .exec();

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    return checkpoint;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid checkpoint ID');
    }

    const result = await this.checkpointModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Checkpoint not found');
    }
  }

  private buildQuery(filters: Partial<Checkpoint>): any {
    const query: any = {};

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId as any);
    }

    if (filters.roadmapId) {
      query.roadmapId = new Types.ObjectId(filters.roadmapId as any);
    }

    if (filters.checkpointType) {
      query.checkpointType = filters.checkpointType;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    return query;
  }

  private createActionItemsFromAnalysis(analysisResults: any): any[] {
    const actionItems: any[] = [];

    // Generate action items based on analysis
    if (analysisResults.challengesIdentified) {
      analysisResults.challengesIdentified.forEach((challenge: any, index: number) => {
        challenge.proposedSolutions?.forEach((solution: any, solIndex: number) => {
          actionItems.push({
            actionId: `challenge_${index}_solution_${solIndex}`,
            description: solution.solution,
            priority: challenge.impact === 'high' ? 'high' : 'medium',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
            assignedTo: 'user',
            category: challenge.category,
            status: 'pending',
          });
        });
      });
    }

    if (analysisResults.roadmapAdjustments?.recommendations) {
      analysisResults.roadmapAdjustments.recommendations.forEach((rec: any, index: number) => {
        actionItems.push({
          actionId: `adjustment_${index}`,
          description: rec.description,
          priority: rec.priority,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
          assignedTo: 'system',
          category: 'roadmap_adjustment',
          status: 'pending',
        });
      });
    }

    return actionItems;
  }
}