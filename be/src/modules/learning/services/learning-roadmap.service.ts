import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LearningRoadmap,
  LearningRoadmapDocument,
  RoadmapStatus,
} from '../schemas/learning-roadmap.schema';
import { CreateLearningRoadmapDto, UpdateLearningRoadmapDto } from '../dto';

@Injectable()
export class LearningRoadmapService {
  constructor(
    @InjectModel(LearningRoadmap.name)
    private readonly learningRoadmapModel: Model<LearningRoadmapDocument>,
  ) {}

  async create(createDto: CreateLearningRoadmapDto): Promise<LearningRoadmap> {
    const roadmap = new this.learningRoadmapModel({
      ...createDto,
      userId: new Types.ObjectId(createDto.userId),
      targetCareer: new Types.ObjectId(createDto.targetCareer),
    });
    
    return roadmap.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<LearningRoadmap> = {},
  ): Promise<{
    data: LearningRoadmap[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    
    const query = this.buildQuery(filters);
    
    const [data, total] = await Promise.all([
      this.learningRoadmapModel
        .find(query)
        .populate('userId', 'email firstName lastName')
        .populate('targetCareer', 'title category industry')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.learningRoadmapModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<LearningRoadmap> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid roadmap ID');
    }

    const roadmap = await this.learningRoadmapModel
      .findById(id)
      .populate('userId', 'email firstName lastName')
      .populate('targetCareer', 'title category industry description requiredSkills')
      .populate('weeklyPlans')
      .exec();

    if (!roadmap) {
      throw new NotFoundException('Learning roadmap not found');
    }

    return roadmap;
  }

  async findByUser(userId: string): Promise<LearningRoadmap[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.learningRoadmapModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('targetCareer', 'title category')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByCareer(careerId: string): Promise<LearningRoadmap[]> {
    if (!Types.ObjectId.isValid(careerId)) {
      throw new BadRequestException('Invalid career ID');
    }

    return this.learningRoadmapModel
      .find({ targetCareer: new Types.ObjectId(careerId) })
      .populate('userId', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findTemplates(): Promise<LearningRoadmap[]> {
    return this.learningRoadmapModel
      .find({ isTemplate: true, isPublic: true })
      .populate('targetCareer', 'title category industry')
      .sort({ createdAt: -1 })
      .exec();
  }

  async cloneTemplate(
    templateId: string,
    userId: string,
    customizations?: Partial<CreateLearningRoadmapDto>,
  ): Promise<LearningRoadmap> {
    if (!Types.ObjectId.isValid(templateId)) {
      throw new BadRequestException('Invalid template ID');
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const template = await this.findOne(templateId);
    
    if (!template.isTemplate) {
      throw new BadRequestException('Specified roadmap is not a template');
    }

    const clonedRoadmap = new this.learningRoadmapModel({
      ...(template as any).toObject(),
      _id: undefined,
      userId: new Types.ObjectId(userId),
      title: `${template.title} (Copy)`,
      status: RoadmapStatus.DRAFT,
      isTemplate: false,
      isPublic: false,
      progress: undefined,
      adaptations: [],
      weeklyPlans: [],
      ...customizations,
    });

    return clonedRoadmap.save();
  }

  async updateProgress(
    roadmapId: string,
    progressUpdate: any,
  ): Promise<LearningRoadmap> {
    if (!Types.ObjectId.isValid(roadmapId)) {
      throw new BadRequestException('Invalid roadmap ID');
    }

    const roadmap = await this.learningRoadmapModel
      .findByIdAndUpdate(
        roadmapId,
        { $set: { progress: progressUpdate } },
        { new: true, runValidators: true }
      )
      .populate('targetCareer', 'title category')
      .exec();

    if (!roadmap) {
      throw new NotFoundException('Learning roadmap not found');
    }

    return roadmap;
  }

  async addAdaptation(
    roadmapId: string,
    adaptation: any,
  ): Promise<LearningRoadmap> {
    if (!Types.ObjectId.isValid(roadmapId)) {
      throw new BadRequestException('Invalid roadmap ID');
    }

    const roadmap = await this.learningRoadmapModel
      .findByIdAndUpdate(
        roadmapId,
        { $push: { adaptations: adaptation } },
        { new: true }
      )
      .exec();

    if (!roadmap) {
      throw new NotFoundException('Learning roadmap not found');
    }

    return roadmap;
  }

  async updatePhase(
    roadmapId: string,
    phaseId: string,
    phaseUpdate: any,
  ): Promise<LearningRoadmap> {
    if (!Types.ObjectId.isValid(roadmapId)) {
      throw new BadRequestException('Invalid roadmap ID');
    }

    const roadmap = await this.learningRoadmapModel
      .findOneAndUpdate(
        { _id: roadmapId, 'phases.phaseId': phaseId },
        { $set: { 'phases.$': phaseUpdate } },
        { new: true }
      )
      .exec();

    if (!roadmap) {
      throw new NotFoundException('Learning roadmap or phase not found');
    }

    return roadmap;
  }

  async completePhase(
    roadmapId: string,
    phaseId: string,
  ): Promise<LearningRoadmap> {
    const roadmap = await this.findOne(roadmapId);
    
    // Update phase progress to 100%
    const updatedProgress = { ...roadmap.progress };
    if (updatedProgress.phaseProgress) {
      const phaseProgressIndex = updatedProgress.phaseProgress.findIndex(
        p => p.phaseId === phaseId
      );
      
      if (phaseProgressIndex >= 0) {
        updatedProgress.phaseProgress[phaseProgressIndex] = {
          ...updatedProgress.phaseProgress[phaseProgressIndex],
          progress: 100,
          completedAt: new Date(),
        };
      }
    }

    // Calculate overall progress
    updatedProgress.overallProgress = this.calculateOverallProgress(updatedProgress);

    return this.updateProgress(roadmapId, updatedProgress);
  }

  async getSkillProgress(roadmapId: string): Promise<any> {
    const roadmap = await this.findOne(roadmapId);
    
    if (!roadmap.progress?.skillProgress) {
      return [];
    }

    return roadmap.progress.skillProgress.map(skill => ({
      ...skill,
      progressPercentage: ((skill.currentLevel - skill.startingLevel) / 
        (skill.targetLevel - skill.startingLevel)) * 100,
      remainingLevels: skill.targetLevel - skill.currentLevel,
    }));
  }

  async generateWeeklyPlan(
    roadmapId: string,
    weekNumber: number,
    availableHours: number,
  ): Promise<any> {
    const roadmap = await this.findOne(roadmapId);
    
    // Find current phase and milestones
    const currentPhase = this.getCurrentPhase(roadmap);
    if (!currentPhase) {
      throw new BadRequestException('No active phase found');
    }

    // Generate activities based on current phase and available time
    const plannedActivities = this.generateActivitiesForWeek(
      currentPhase,
      availableHours,
      roadmap.progress
    );

    return {
      weekNumber,
      phase: currentPhase,
      plannedActivities,
      estimatedHours: plannedActivities.reduce(
        (total, activity) => total + activity.estimatedHours,
        0
      ),
      skillFocus: this.getWeeklySkillFocus(currentPhase, roadmap.progress),
    };
  }

  async getRoadmapStatistics(): Promise<any> {
    const stats = await this.learningRoadmapModel.aggregate([
      {
        $group: {
          _id: null,
          totalRoadmaps: { $sum: 1 },
          activeRoadmaps: {
            $sum: { $cond: [{ $eq: ['$status', RoadmapStatus.ACTIVE] }, 1, 0] }
          },
          completedRoadmaps: {
            $sum: { $cond: [{ $eq: ['$status', RoadmapStatus.COMPLETED] }, 1, 0] }
          },
          avgProgress: {
            $avg: '$progress.overallProgress'
          },
          roadmapsByCareer: {
            $push: {
              career: '$targetCareer',
              status: '$status',
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalRoadmaps: 0,
      activeRoadmaps: 0,
      completedRoadmaps: 0,
      avgProgress: 0,
      roadmapsByCareer: [],
    };
  }

  async update(id: string, updateDto: UpdateLearningRoadmapDto): Promise<LearningRoadmap> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid roadmap ID');
    }

    if (updateDto.userId) {
      updateDto.userId = new Types.ObjectId(updateDto.userId) as any;
    }
    if (updateDto.targetCareer) {
      updateDto.targetCareer = new Types.ObjectId(updateDto.targetCareer) as any;
    }

    const roadmap = await this.learningRoadmapModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .populate('userId', 'email firstName lastName')
      .populate('targetCareer', 'title category industry')
      .exec();

    if (!roadmap) {
      throw new NotFoundException('Learning roadmap not found');
    }

    return roadmap;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid roadmap ID');
    }

    const result = await this.learningRoadmapModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Learning roadmap not found');
    }
  }

  private buildQuery(filters: Partial<LearningRoadmap>): any {
    const query: any = {};

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId as any);
    }

    if (filters.targetCareer) {
      query.targetCareer = new Types.ObjectId(filters.targetCareer as any);
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.targetLevel) {
      query.targetLevel = filters.targetLevel;
    }

    if (filters.isTemplate !== undefined) {
      query.isTemplate = filters.isTemplate;
    }

    if (filters.isPublic !== undefined) {
      query.isPublic = filters.isPublic;
    }

    return query;
  }

  private getCurrentPhase(roadmap: LearningRoadmap): any {
    if (!roadmap.progress?.currentPhase) {
      return roadmap.phases[0]; // First phase if no progress
    }

    return roadmap.phases.find(phase => 
      phase.phaseId === roadmap.progress?.currentPhase
    );
  }

  private generateActivitiesForWeek(
    phase: any,
    availableHours: number,
    progress?: any,
  ): any[] {
    const activities: Array<{
      date: string;
      type: string;
      title: string;
      description: string;
      completed: boolean;
      activityId?: string;
      taskId?: string;
      estimatedHours?: number;
      priority?: string;
      status?: string;
    }> = [];
    let remainingHours = availableHours;

    // Get current milestone
    const currentMilestone = phase.milestones.find((m: any) => {
      const milestoneProgress = progress?.phaseProgress?.find(
        (p: any) => p.phaseId === phase.phaseId
      );
      return !milestoneProgress?.completedAt;
    }) || phase.milestones[0];

    // Add tasks from current milestone
    currentMilestone.tasks.forEach((task: any, index: number) => {
      if (remainingHours > 0 && task.estimatedHours <= remainingHours) {
        activities.push({
          date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
          activityId: `task_${task.taskId}_${index}`,
          type: 'simulation_task',
          taskId: task.taskId,
          title: task.taskTitle,
          description: `Complete ${task.taskTitle} for milestone: ${currentMilestone.title}`,
          completed: false,
          estimatedHours: task.estimatedHours,
          priority: task.isRequired ? 'high' : 'medium',
          status: 'not_started',
        });
        remainingHours -= task.estimatedHours;
      }
    });

    return activities;
  }

  private getWeeklySkillFocus(phase: any, progress?: any): string[] {
    // Return skills that need attention based on current phase
    return phase.milestones
      .flatMap((milestone: any) => milestone.skills)
      .map((skill: any) => skill.skillName)
      .slice(0, 3); // Focus on top 3 skills
  }

  private calculateOverallProgress(progress: any): number {
    if (!progress.phaseProgress || progress.phaseProgress.length === 0) {
      return 0;
    }

    const totalProgress = progress.phaseProgress.reduce(
      (sum: number, phase: any) => sum + phase.progress,
      0
    );

    return Math.round(totalProgress / progress.phaseProgress.length);
  }
}