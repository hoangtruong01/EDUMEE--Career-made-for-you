import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';
import {
  LearningRoadmap,
  LearningRoadmapDocument,
  RoadmapStatus,
  LearningPhase,
} from '../schemas/learning-roadmap.schema';
import { CreateLearningRoadmapDto, UpdateLearningRoadmapDto } from '../dto';
import { AIService } from '../../../common/services/ai.service';
import { ExperienceLevel } from '../../careers/schemas/career.schema';

interface Milestone {
  milestoneId: string;
  title: string;
  description: string;
  skills: Skill[];
  tasks: Task[];
  completionCriteria?: Record<string, unknown>;
}

interface Skill {
  skillName: string;
  targetLevel?: number;
  currentLevel?: number;
}

interface Task {
  taskId: string;
  taskTitle: string;
  title?: string;
  estimatedHours: number;
  isRequired: boolean;
  order?: number;
}

interface PhaseProgress {
  phaseId: string;
  progress: number;
  completedAt?: Date;
}

interface SkillProgress {
  skillName: string;
  currentLevel: number;
  startingLevel: number;
  targetLevel: number;
}

interface IPhase {
  phaseId: string;
  phase?: string;
  title: string;
  description?: string;
  estimatedDuration?: string;
  objectives?: string[];
  milestones: Milestone[];
  order?: number;
  prerequisites?: string[];
}

interface IWeeklyActivity {
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
}

interface IProgress {
  currentPhase?: string;
  phaseProgress?: PhaseProgress[];
  skillProgress?: SkillProgress[];
  overallProgress?: number;
}

@Injectable()
export class LearningRoadmapService {
  private readonly logger = new Logger(LearningRoadmapService.name);

  constructor(
    @InjectModel(LearningRoadmap.name)
    private readonly learningRoadmapModel: Model<LearningRoadmapDocument>,
    private readonly aiService: AIService,
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

  async findLatestByUser(userId: string): Promise<LearningRoadmap | null> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.learningRoadmapModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('targetCareer', 'title category industry description requiredSkills')
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

    const templateDoc = template as unknown as Document;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const templateObject: Record<string, any> = templateDoc.toObject ? templateDoc.toObject() : template;
    const clonedRoadmap = new this.learningRoadmapModel({
      ...templateObject,
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
    progressUpdate: IProgress,
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
    adaptation: Record<string, unknown>,
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
    phaseUpdate: IPhase,
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
  ): Promise<Record<string, unknown>> {
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
      roadmap.progress as IProgress,
    );

    return {
      weekNumber,
      phase: currentPhase,
      plannedActivities,
      estimatedHours: plannedActivities.reduce(
        (total, activity) => total + (activity.estimatedHours ?? 0),
        0
      ),
      skillFocus: this.getWeeklySkillFocus(currentPhase),
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

    const updateData: Record<string, unknown> = { ...updateDto };
    if (updateData.userId) {
      const userId = updateData.userId;
      if (typeof userId === 'string') {
        updateData.userId = new Types.ObjectId(userId);
      } else if (userId instanceof Types.ObjectId) {
        updateData.userId = userId;
      }
    }
    if (updateData.targetCareer) {
      const careerId = updateData.targetCareer;
      if (typeof careerId === 'string') {
        updateData.targetCareer = new Types.ObjectId(careerId);
      } else if (careerId instanceof Types.ObjectId) {
        updateData.targetCareer = careerId;
      }
    }

    const roadmap = await this.learningRoadmapModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate('userId', 'email firstName lastName')
      .populate('targetCareer', 'title category industry')
      .exec();

    if (!roadmap) {
      throw new NotFoundException('Learning roadmap not found');
    }

    return roadmap;
  }

  async generateAIRoadmap(userId: string, careerTitle: string): Promise<LearningRoadmap> {
    this.logger.log(`Generating AI roadmap for user ${userId}, career: ${careerTitle}`);

    const aiResult = await this.aiService.generateCareerRoadmap(careerTitle, []);

    // Map AI result phases to schema-compatible format
    const phases = aiResult.phases.map((p, idx) => ({
      phaseId: p.phaseId || `phase_${idx + 1}`,
      phase: (Object.values(LearningPhase).includes(p.phase as LearningPhase)
        ? p.phase
        : LearningPhase.FOUNDATION) as LearningPhase,
      title: p.title,
      description: p.description,
      estimatedDuration: p.estimatedDuration,
      objectives: p.objectives || [],
      order: p.order || idx + 1,
      prerequisites: idx === 0 ? [] : [`phase_${idx}`],
      milestones: p.milestones.map((m) => ({
        milestoneId: m.milestoneId,
        title: m.title,
        description: m.description,
        tasks: m.tasks.map((t) => ({
          taskId: t.taskId,
          taskTitle: t.taskTitle,
          isRequired: t.isRequired,
          estimatedHours: t.estimatedHours,
          order: t.order,
        })),
        skills: m.skills.map((s) => ({
          skillName: s.skillName,
          targetLevel: s.targetLevel,
        })),
        completionCriteria: {
          requiredTasks: m.completionCriteria?.requiredTasks || [],
        },
      })),
    }));

    const roadmapData = {
      userId: new Types.ObjectId(userId),
      // Use a placeholder ObjectId for targetCareer since we only have the title
      targetCareer: new Types.ObjectId('000000000000000000000001'),
      targetLevel: ExperienceLevel.JUNIOR,
      title: aiResult.title || `Lộ trình ${careerTitle}`,
      description: aiResult.description || `Lộ trình học tập cá nhân hóa cho nghề ${careerTitle}`,
      status: RoadmapStatus.ACTIVE,
      phases,
      tags: [careerTitle],
      isTemplate: false,
      isPublic: false,
    };

    const roadmap = new this.learningRoadmapModel(roadmapData);
    return roadmap.save();
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

  private buildQuery(filters: Partial<LearningRoadmap>): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (filters.userId) {
      query.userId = new Types.ObjectId(String(filters.userId));
    }

    if (filters.targetCareer) {
      query.targetCareer = new Types.ObjectId(String(filters.targetCareer));
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

  private getCurrentPhase(roadmap: LearningRoadmap): IPhase | undefined {
    if (!roadmap.progress?.currentPhase) {
      const firstPhase = roadmap.phases?.[0];
      return firstPhase ? this.normalizePhaseToDB(firstPhase) : undefined;
    }

    const phase = roadmap.phases?.find(phase => 
      phase.phaseId === roadmap.progress?.currentPhase
    );
    return phase ? this.normalizePhaseToDB(phase) : undefined;
  }

  private normalizePhaseToDB(phase: any): IPhase {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      phaseId: String(phase.phaseId || ''),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      phase: phase.phase,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      title: String(phase.title || ''),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      description: String(phase.description || ''),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      estimatedDuration: String(phase.estimatedDuration || ''),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      objectives: Array.isArray(phase.objectives) ? phase.objectives : [],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      order: Number(phase.order) || 0,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      prerequisites: Array.isArray(phase.prerequisites) ? phase.prerequisites : undefined,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      milestones: (phase.milestones || []).map((m: any) => ({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        milestoneId: String(m.milestoneId || ''),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        title: String(m.title || ''),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        description: String(m.description || ''),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        skills: Array.isArray(m.skills) ? m.skills.map((s: any) => ({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          skillName: String(s.skillName || ''),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          targetLevel: Number(s.targetLevel) || 0,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          currentLevel: s.currentLevel !== undefined ? Number(s.currentLevel) : undefined,
        })) : [],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        tasks: (m.tasks || []).map((t: any) => ({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          taskId: String(t.taskId || ''),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          taskTitle: String(t.taskTitle || ''),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          estimatedHours: Number(t.estimatedHours) || 0,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          isRequired: Boolean(t.isRequired),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          order: Number(t.order) || 0,
        })),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        completionCriteria: m.completionCriteria || undefined,
      })),
    };
  }

  private generateActivitiesForWeek(
    phase: IPhase,
    availableHours: number,
    progress?: IProgress,
  ): IWeeklyActivity[] {
    const activities: IWeeklyActivity[] = [];
    let remainingHours = availableHours;

    // Get current milestone
    const currentMilestone = phase.milestones.find(() => {
      const milestoneProgress = progress?.phaseProgress?.find(
        (p: PhaseProgress) => p.phaseId === phase.phaseId
      );
      return !milestoneProgress?.completedAt;
    }) || phase.milestones[0];

    // Add tasks from current milestone
    currentMilestone.tasks.forEach((task: Task, index: number) => {
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

  private getWeeklySkillFocus(phase: IPhase): string[] {
    // Return skills that need attention based on current phase
    return phase.milestones
      .flatMap((milestone: Milestone) => milestone.skills)
      .map((skill: Skill) => skill.skillName)
      .slice(0, 3); // Focus on top 3 skills
  }

  private calculateOverallProgress(progress: IProgress): number {
    if (!progress.phaseProgress || progress.phaseProgress.length === 0) {
      return 0;
    }

    const totalProgress = progress.phaseProgress.reduce(
      (sum: number, phase: PhaseProgress) => sum + phase.progress,
      0
    );

    return Math.round(totalProgress / progress.phaseProgress.length);
  }
}