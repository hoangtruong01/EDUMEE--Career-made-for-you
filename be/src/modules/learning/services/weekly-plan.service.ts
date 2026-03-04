import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WeeklyPlan,
  WeeklyPlanDocument,
  PlanStatus,
} from '../schemas/weekly-plan.schema';
import { CreateWeeklyPlanDto, UpdateWeeklyPlanDto } from '../dto';

@Injectable()
export class WeeklyPlanService {
  constructor(
    @InjectModel(WeeklyPlan.name)
    private readonly weeklyPlanModel: Model<WeeklyPlanDocument>,
  ) {}

  async create(createDto: CreateWeeklyPlanDto): Promise<WeeklyPlan> {
    const plan = new this.weeklyPlanModel({
      ...createDto,
      userId: new Types.ObjectId(createDto.userId),
      roadmapId: new Types.ObjectId(createDto.roadmapId),
      weeklyCheckpoint: createDto.weeklyCheckpoint ? 
        new Types.ObjectId(createDto.weeklyCheckpoint) : undefined,
    });
    
    return plan.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<WeeklyPlan> = {},
  ): Promise<{
    data: WeeklyPlan[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    
    const query = this.buildQuery(filters);
    
    const [data, total] = await Promise.all([
      this.weeklyPlanModel
        .find(query)
        .populate('userId', 'email firstName lastName')
        .populate('roadmapId', 'title targetCareer')
        .populate('weeklyCheckpoint', 'title status scheduledDate')
        .sort({ 'weekPeriod.startDate': -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.weeklyPlanModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<WeeklyPlan> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid weekly plan ID');
    }

    const plan = await this.weeklyPlanModel
      .findById(id)
      .populate('userId', 'email firstName lastName')
      .populate('roadmapId', 'title targetCareer progress')
      .populate('weeklyCheckpoint', 'title status scheduledDate progressEvaluation')
      .exec();

    if (!plan) {
      throw new NotFoundException('Weekly plan not found');
    }

    return plan;
  }

  async findByUser(userId: string): Promise<WeeklyPlan[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.weeklyPlanModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('roadmapId', 'title targetCareer')
      .sort({ weekNumber: -1 })
      .exec();
  }

  async findByRoadmap(roadmapId: string): Promise<WeeklyPlan[]> {
    if (!Types.ObjectId.isValid(roadmapId)) {
      throw new BadRequestException('Invalid roadmap ID');
    }

    return this.weeklyPlanModel
      .find({ roadmapId: new Types.ObjectId(roadmapId) })
      .sort({ weekNumber: 1 })
      .exec();
  }

  async findCurrentWeek(userId: string): Promise<WeeklyPlan | null> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const now = new Date();
    
    return this.weeklyPlanModel
      .findOne({
        userId: new Types.ObjectId(userId),
        'weekPeriod.startDate': { $lte: now },
        'weekPeriod.endDate': { $gte: now },
      })
      .populate('roadmapId', 'title')
      .exec();
  }

  async findByWeekRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WeeklyPlan[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.weeklyPlanModel
      .find({
        userId: new Types.ObjectId(userId),
        $or: [
          {
            'weekPeriod.startDate': { $gte: startDate, $lte: endDate }
          },
          {
            'weekPeriod.endDate': { $gte: startDate, $lte: endDate }
          }
        ]
      })
      .populate('roadmapId', 'title')
      .sort({ weekNumber: 1 })
      .exec();
  }

  async updateActivity(
    planId: string,
    activityId: string,
    activityUpdate: any,
  ): Promise<WeeklyPlan> {
    if (!Types.ObjectId.isValid(planId)) {
      throw new BadRequestException('Invalid plan ID');
    }

    const plan = await this.weeklyPlanModel
      .findOneAndUpdate(
        { _id: planId, 'plannedActivities.activityId': activityId },
        { $set: { 'plannedActivities.$': activityUpdate } },
        { new: true }
      )
      .exec();

    if (!plan) {
      throw new NotFoundException('Weekly plan or activity not found');
    }

    return plan;
  }

  async completeActivity(
    planId: string,
    activityId: string,
    actualHours?: number,
    notes?: string,
  ): Promise<WeeklyPlan> {
    const updateData: any = {
      'plannedActivities.$.status': 'completed',
      'plannedActivities.$.completedAt': new Date(),
    };

    if (actualHours !== undefined) {
      updateData['plannedActivities.$.actualHours'] = actualHours;
    }

    if (notes) {
      updateData['plannedActivities.$.notes'] = notes;
    }

    const plan = await this.weeklyPlanModel
      .findOneAndUpdate(
        { _id: planId, 'plannedActivities.activityId': activityId },
        { $set: updateData },
        { new: true }
      )
      .exec();

    if (!plan) {
      throw new NotFoundException('Weekly plan or activity not found');
    }

    return plan;
  }

  async addActivity(
    planId: string,
    newActivity: any,
  ): Promise<WeeklyPlan> {
    if (!Types.ObjectId.isValid(planId)) {
      throw new BadRequestException('Invalid plan ID');
    }

    const plan = await this.weeklyPlanModel
      .findByIdAndUpdate(
        planId,
        { $push: { plannedActivities: newActivity } },
        { new: true }
      )
      .exec();

    if (!plan) {
      throw new NotFoundException('Weekly plan not found');
    }

    // Log adaptation
    const adaptation = {
      adaptationDate: new Date(),
      reason: 'Activity added during week',
      changes: [{
        activityId: newActivity.activityId,
        changeType: 'added' as const,
        newValue: newActivity,
      }],
      triggeredBy: 'user' as const,
    };

    return this.weeklyPlanModel
      .findByIdAndUpdate(
        planId,
        { $push: { adaptations: adaptation } },
        { new: true }
      )
      .exec() as Promise<WeeklyPlan>;
  }

  async removeActivity(
    planId: string,
    activityId: string,
    reason?: string,
  ): Promise<WeeklyPlan> {
    if (!Types.ObjectId.isValid(planId)) {
      throw new BadRequestException('Invalid plan ID');
    }

    const plan = await this.weeklyPlanModel.findById(planId);
    if (!plan) {
      throw new NotFoundException('Weekly plan not found');
    }

    const activityIndex = plan.plannedActivities.findIndex(
      a => a.activityId === activityId
    );

    if (activityIndex === -1) {
      throw new NotFoundException('Activity not found');
    }

    const removedActivity = plan.plannedActivities[activityIndex];
    
    // Remove activity
    plan.plannedActivities.splice(activityIndex, 1);

    // Log adaptation
    const adaptation = {
      adaptationDate: new Date(),
      reason: reason || 'Activity removed during week',
      changes: [{
        activityId,
        changeType: 'removed' as const,
        oldValue: removedActivity,
      }],
      triggeredBy: 'user' as const,
    };

    plan.adaptations = plan.adaptations || [];
    plan.adaptations.push(adaptation);

    return plan.save();
  }

  async calculateWeeklyProgress(planId: string): Promise<WeeklyPlan> {
    const plan = await this.findOne(planId);
    
    const completedActivities = plan.plannedActivities.filter(
      a => a.status === 'completed'
    ).length;

    const totalActivities = plan.plannedActivities.length;
    const overallCompletion = totalActivities > 0 ? 
      Math.round((completedActivities / totalActivities) * 100) : 0;

    const plannedHours = plan.plannedActivities.reduce(
      (total, activity) => total + activity.estimatedHours,
      0
    );

    const actualHours = plan.plannedActivities.reduce(
      (total, activity) => total + (activity.actualHours || 0),
      0
    );

    const timeSpent = {
      planned: plannedHours,
      actual: actualHours,
      breakdown: this.calculateDailyBreakdown(plan),
    };

    const weeklyProgress = {
      overallCompletion,
      completedActivities,
      totalActivities,
      timeSpent,
      skillProgress: this.calculateSkillProgress(plan),
      achievements: this.extractAchievements(plan),
      challenges: this.extractChallenges(plan),
    };

    return this.weeklyPlanModel
      .findByIdAndUpdate(
        planId,
        { weeklyProgress },
        { new: true }
      )
      .exec() as Promise<WeeklyPlan>;
  }

  async completeWeek(
    planId: string,
    userFeedback: any,
  ): Promise<WeeklyPlan> {
    const plan = await this.calculateWeeklyProgress(planId);
    
    const updateData = {
      status: PlanStatus.COMPLETED,
      userFeedback: {
        ...userFeedback,
        feedbackDate: new Date(),
      },
    };

    return this.weeklyPlanModel
      .findByIdAndUpdate(planId, updateData, { new: true })
      .exec() as Promise<WeeklyPlan>;
  }

  async generateNextWeekRecommendations(planId: string): Promise<any> {
    const plan = await this.findOne(planId);
    
    const carryOverTasks = plan.plannedActivities
      .filter(a => a.status === 'deferred' || a.status === 'not_started')
      .map(a => a.activityId);

    const challengeAreas = plan.weeklyProgress?.challenges || [];
    const skillProgress = plan.weeklyProgress?.skillProgress || [];

    const recommendations = {
      carryOverTasks,
      newFocusAreas: this.identifyFocusAreas(challengeAreas, skillProgress),
      adjustmentRecommendations: this.generateAdjustments(plan),
      mentorInputNeeded: this.shouldInvolveMentor(plan),
    };

    return this.weeklyPlanModel
      .findByIdAndUpdate(
        planId,
        { nextWeekPreparation: recommendations },
        { new: true }
      )
      .exec();
  }

  async getPlanStatistics(userId?: string): Promise<any> {
    const matchStage: any = {};
    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }
      matchStage.userId = new Types.ObjectId(userId);
    }

    const stats = await this.weeklyPlanModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalPlans: { $sum: 1 },
          completedPlans: {
            $sum: { $cond: [{ $eq: ['$status', PlanStatus.COMPLETED] }, 1, 0] }
          },
          avgCompletion: { $avg: '$weeklyProgress.overallCompletion' },
          avgPlannedHours: { $avg: '$weeklyProgress.timeSpent.planned' },
          avgActualHours: { $avg: '$weeklyProgress.timeSpent.actual' },
          plansByStatus: {
            $push: {
              status: '$status',
              completion: '$weeklyProgress.overallCompletion',
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalPlans: 0,
      completedPlans: 0,
      avgCompletion: 0,
      avgPlannedHours: 0,
      avgActualHours: 0,
      plansByStatus: [],
    };
  }

  async update(id: string, updateDto: UpdateWeeklyPlanDto): Promise<WeeklyPlan> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid weekly plan ID');
    }

    if (updateDto.userId) {
      updateDto.userId = new Types.ObjectId(updateDto.userId) as any;
    }
    if (updateDto.roadmapId) {
      updateDto.roadmapId = new Types.ObjectId(updateDto.roadmapId) as any;
    }
    if (updateDto.weeklyCheckpoint) {
      updateDto.weeklyCheckpoint = new Types.ObjectId(updateDto.weeklyCheckpoint) as any;
    }

    const plan = await this.weeklyPlanModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .populate('userId', 'email firstName lastName')
      .populate('roadmapId', 'title targetCareer')
      .exec();

    if (!plan) {
      throw new NotFoundException('Weekly plan not found');
    }

    return plan;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid weekly plan ID');
    }

    const result = await this.weeklyPlanModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Weekly plan not found');
    }
  }

  private buildQuery(filters: Partial<WeeklyPlan>): any {
    const query: any = {};

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId as any);
    }

    if (filters.roadmapId) {
      query.roadmapId = new Types.ObjectId(filters.roadmapId as any);
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.weekNumber) {
      query.weekNumber = filters.weekNumber;
    }

    return query;
  }

  private calculateDailyBreakdown(plan: WeeklyPlan): any[] {
    const breakdown: any[] = [];
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    daysOfWeek.forEach(day => {
      const dayActivities = plan.plannedActivities.filter(
        activity => activity.scheduledDays?.some(scheduled => scheduled.day === day)
      );

      const dayHours = dayActivities.reduce((total, activity) => {
        const scheduledDay = activity.scheduledDays?.find(s => s.day === day);
        return total + (scheduledDay?.duration || 0);
      }, 0);

      breakdown.push({ day, hours: dayHours });
    });

    return breakdown;
  }

  private calculateSkillProgress(plan: WeeklyPlan): any[] {
    const skillMap = new Map();

    plan.plannedActivities.forEach(activity => {
      if (activity.status === 'completed') {
        // This would typically extract skills from the activity
        // For now, we'll use a placeholder
        const practiceHours = activity.actualHours || activity.estimatedHours;
        
        // Extract skills from activity (placeholder logic)
        plan.weeklyGoals.skillFocus.forEach(skill => {
          if (skillMap.has(skill)) {
            skillMap.set(skill, skillMap.get(skill) + practiceHours / plan.weeklyGoals.skillFocus.length);
          } else {
            skillMap.set(skill, practiceHours / plan.weeklyGoals.skillFocus.length);
          }
        });
      }
    });

    return Array.from(skillMap.entries()).map(([skillName, practiceHours]) => ({
      skillName,
      practiceHours: Math.round(practiceHours * 100) / 100,
      improvement: 0, // Would be calculated based on assessments
    }));
  }

  private extractAchievements(plan: WeeklyPlan): string[] {
    const achievements: string[] = [];
    
    const completedActivities = plan.plannedActivities.filter(a => a.status === 'completed');
    
    if (completedActivities.length > 0) {
      achievements.push(`Completed ${completedActivities.length} planned activities`);
    }

    const highPriorityCompleted = completedActivities.filter(a => a.priority === 'high');
    if (highPriorityCompleted.length > 0) {
      achievements.push(`Completed ${highPriorityCompleted.length} high-priority tasks`);
    }

    return achievements;
  }

  private extractChallenges(plan: WeeklyPlan): string[] {
    const challenges: string[] = [];
    
    const incompleteActivities = plan.plannedActivities.filter(
      a => a.status === 'not_started' || a.status === 'deferred'
    );
    
    if (incompleteActivities.length > 0) {
      challenges.push(`${incompleteActivities.length} activities not completed`);
    }

    const overdueActivities = plan.plannedActivities.filter(
      a => a.deadline && new Date(a.deadline) < new Date() && a.status !== 'completed'
    );
    
    if (overdueActivities.length > 0) {
      challenges.push(`${overdueActivities.length} activities overdue`);
    }

    return challenges;
  }

  private identifyFocusAreas(challenges: string[], skillProgress: any[]): string[] {
    const focusAreas: string[] = [];

    // Identify skills that need more attention
    skillProgress.forEach(skill => {
      if (skill.practiceHours < 2) { // Less than 2 hours practice
        focusAreas.push(`More focus needed on ${skill.skillName}`);
      }
    });

    return focusAreas;
  }

  private generateAdjustments(plan: WeeklyPlan): string[] {
    const adjustments: string[] = [];

    const plannedHours = plan.weeklyProgress?.timeSpent.planned || 0;
    const actualHours = plan.weeklyProgress?.timeSpent.actual || 0;

    if (actualHours > plannedHours * 1.2) {
      adjustments.push('Consider reducing weekly workload - you exceeded planned hours significantly');
    } else if (actualHours < plannedHours * 0.8) {
      adjustments.push('You might be able to handle more activities - consider increasing workload');
    }

    return adjustments;
  }

  private shouldInvolveMentor(plan: WeeklyPlan): boolean {
    const completionRate = plan.weeklyProgress?.overallCompletion || 0;
    const challengeCount = plan.weeklyProgress?.challenges?.length || 0;

    return completionRate < 60 || challengeCount > 2;
  }
}