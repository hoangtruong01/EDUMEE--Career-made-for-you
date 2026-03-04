import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SimulationTask,
  SimulationTaskDocument,
  TaskType,
  DifficultyLevel,
} from '../schemas/simulation-task.schema';
import { CreateSimulationTaskDto, UpdateSimulationTaskDto } from '../dto';

@Injectable()
export class SimulationTaskService {
  constructor(
    @InjectModel(SimulationTask.name)
    private readonly simulationTaskModel: Model<SimulationTaskDocument>,
  ) {}

  async create(createDto: CreateSimulationTaskDto): Promise<SimulationTask> {
    const task = new this.simulationTaskModel({
      ...createDto,
      careerId: new Types.ObjectId(createDto.careerId),
      recommendedBeforeTasks: createDto.recommendedBeforeTasks?.map(
        id => new Types.ObjectId(id)
      ),
      followUpTasks: createDto.followUpTasks?.map(id => new Types.ObjectId(id)),
    });
    
    return task.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<SimulationTask> = {},
  ): Promise<{
    data: SimulationTask[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    
    const query = this.buildQuery(filters);
    
    const [data, total] = await Promise.all([
      this.simulationTaskModel
        .find(query)
        .populate('careerId', 'title category industry')
        .populate('recommendedBeforeTasks', 'title difficulty')
        .populate('followUpTasks', 'title difficulty')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.simulationTaskModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<SimulationTask> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid task ID');
    }

    const task = await this.simulationTaskModel
      .findById(id)
      .populate('careerId', 'title category industry description')
      .populate('recommendedBeforeTasks', 'title difficulty taskType')
      .populate('followUpTasks', 'title difficulty taskType')
      .exec();

    if (!task) {
      throw new NotFoundException('Simulation task not found');
    }

    return task;
  }

  async findByCareer(careerId: string): Promise<SimulationTask[]> {
    if (!Types.ObjectId.isValid(careerId)) {
      throw new BadRequestException('Invalid career ID');
    }

    return this.simulationTaskModel
      .find({ careerId: new Types.ObjectId(careerId), isActive: true })
      .sort({ difficulty: 1, createdAt: 1 })
      .exec();
  }

  async findByType(taskType: TaskType): Promise<SimulationTask[]> {
    return this.simulationTaskModel
      .find({ taskType, isActive: true })
      .populate('careerId', 'title category')
      .sort({ difficulty: 1 })
      .exec();
  }

  async findByDifficulty(difficulty: DifficultyLevel): Promise<SimulationTask[]> {
    return this.simulationTaskModel
      .find({ difficulty, isActive: true })
      .populate('careerId', 'title category')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findBySkill(skillName: string): Promise<SimulationTask[]> {
    return this.simulationTaskModel
      .find({
        'skillsEvaluated.skillName': { $regex: skillName, $options: 'i' },
        isActive: true,
      })
      .populate('careerId', 'title category')
      .sort({ 'skillsEvaluated.weight': -1 })
      .exec();
  }

  async searchTasks(criteria: any): Promise<SimulationTask[]> {
    const query: any = { isActive: true };

    if (criteria.skills && criteria.skills.length > 0) {
      query['skillsEvaluated.skillName'] = { $in: criteria.skills };
    }

    if (criteria.keyword) {
      query.$text = { $search: criteria.keyword };
    }

    if (criteria.difficulty) {
      query.difficulty = criteria.difficulty;
    }

    if (criteria.taskType) {
      query.taskType = criteria.taskType;
    }

    if (criteria.careerId) {
      query.careerId = new Types.ObjectId(criteria.careerId);
    }

    if (criteria.timeRange) {
      query['timeEstimation.averageHours'] = {
        $gte: criteria.timeRange.min || 0,
        $lte: criteria.timeRange.max || 1000,
      };
    }

    return this.simulationTaskModel
      .find(query)
      .populate('careerId', 'title category')
      .sort({ 'stats.averageScore': -1 })
      .exec();
  }

  async getRecommendedTasks(
    userId: string,
    currentSkills: string[],
    targetLevel: string,
    limit = 5,
  ): Promise<SimulationTask[]> {
    // Find tasks that match user's current skill level and target progression
    const tasks = await this.simulationTaskModel
      .find({
        'skillsEvaluated.skillName': { $in: currentSkills },
        targetLevel,
        isActive: true,
      })
      .populate('careerId', 'title category')
      .sort({ 'stats.averageScore': -1, difficulty: 1 })
      .limit(limit)
      .exec();

    // If not enough tasks found, find related tasks
    if (tasks.length < limit) {
      const additionalTasks = await this.simulationTaskModel
        .find({
          _id: { $nin: tasks.map(t => t._id) },
          targetLevel,
          isActive: true,
        })
        .populate('careerId', 'title category')
        .sort({ 'stats.completionRate': -1 })
        .limit(limit - tasks.length)
        .exec();

      return [...tasks, ...additionalTasks];
    }

    return tasks;
  }

  async getTasksByLearningPath(
    careerId: string,
    targetLevel: string,
  ): Promise<SimulationTask[]> {
    if (!Types.ObjectId.isValid(careerId)) {
      throw new BadRequestException('Invalid career ID');
    }

    return this.simulationTaskModel
      .find({
        careerId: new Types.ObjectId(careerId),
        targetLevel,
        isActive: true,
      })
      .sort({ difficulty: 1, 'timeEstimation.averageHours': 1 })
      .exec();
  }

  async updateTaskStatistics(
    taskId: string,
    submissionResult: any,
  ): Promise<SimulationTask> {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }

    const task = await this.simulationTaskModel.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Update statistics based on submission
    const currentStats = task.stats || {
      totalAttempts: 0,
      averageScore: 0,
      completionRate: 0,
      averageTimeSpent: 0,
    };

    currentStats.totalAttempts = (currentStats.totalAttempts || 0) + 1;
    
    if (submissionResult.completed) {
      const newCompletionRate = 
        (((currentStats.completionRate || 0) * ((currentStats.totalAttempts || 1) - 1)) + 1) / 
        (currentStats.totalAttempts || 1);
      currentStats.completionRate = Math.round(newCompletionRate * 100) / 100;
    }

    if (submissionResult.score !== undefined) {
      const newAverageScore = 
        (((currentStats.averageScore || 0) * ((currentStats.totalAttempts || 1) - 1)) + submissionResult.score) / 
        (currentStats.totalAttempts || 1);
      currentStats.averageScore = Math.round(newAverageScore * 100) / 100;
    }

    if (submissionResult.timeSpent) {
      const newAverageTime = 
        (((currentStats.averageTimeSpent || 0) * ((currentStats.totalAttempts || 1) - 1)) + submissionResult.timeSpent) / 
        (currentStats.totalAttempts || 1);
      currentStats.averageTimeSpent = Math.round(newAverageTime);
    }

    currentStats.lastUpdated = new Date();

    return this.simulationTaskModel
      .findByIdAndUpdate(
        taskId,
        { stats: currentStats },
        { new: true }
      )
      .exec() as Promise<SimulationTask>;
  }

  async getTaskAnalytics(taskId?: string): Promise<any> {
    const matchStage: any = { isActive: true };
    if (taskId) {
      if (!Types.ObjectId.isValid(taskId)) {
        throw new BadRequestException('Invalid task ID');
      }
      matchStage._id = new Types.ObjectId(taskId);
    }

    const analytics = await this.simulationTaskModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: taskId ? '$_id' : null,
          totalTasks: { $sum: 1 },
          avgCompletionRate: { $avg: '$stats.completionRate' },
          avgScore: { $avg: '$stats.averageScore' },
          totalAttempts: { $sum: '$stats.totalAttempts' },
          tasksByDifficulty: {
            $push: {
              difficulty: '$difficulty',
              completionRate: '$stats.completionRate',
              averageScore: '$stats.averageScore',
            }
          },
          tasksByType: {
            $push: {
              type: '$taskType',
              count: 1,
            }
          }
        }
      }
    ]);

    return analytics[0] || {
      totalTasks: 0,
      avgCompletionRate: 0,
      avgScore: 0,
      totalAttempts: 0,
      tasksByDifficulty: [],
      tasksByType: [],
    };
  }

  async duplicateTask(taskId: string, modifications?: Partial<CreateSimulationTaskDto>): Promise<SimulationTask> {
    const originalTask = await this.findOne(taskId);
    
    const duplicatedTask = new this.simulationTaskModel({
      ...(originalTask as any).toObject(),
      _id: undefined,
      title: `${originalTask.title} (Copy)`,
      stats: undefined, // Reset statistics
      ...modifications,
    });

    return duplicatedTask.save();
  }

  async update(id: string, updateDto: UpdateSimulationTaskDto): Promise<SimulationTask> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid task ID');
    }

    if (updateDto.careerId) {
      updateDto.careerId = new Types.ObjectId(updateDto.careerId) as any;
    }
    if (updateDto.recommendedBeforeTasks) {
      updateDto.recommendedBeforeTasks = updateDto.recommendedBeforeTasks.map(
        id => new Types.ObjectId(id)
      ) as any;
    }
    if (updateDto.followUpTasks) {
      updateDto.followUpTasks = updateDto.followUpTasks.map(
        id => new Types.ObjectId(id)
      ) as any;
    }

    const task = await this.simulationTaskModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .populate('careerId', 'title category industry')
      .exec();

    if (!task) {
      throw new NotFoundException('Simulation task not found');
    }

    return task;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid task ID');
    }

    // Soft delete by setting isActive to false
    const result = await this.simulationTaskModel
      .findByIdAndUpdate(id, { isActive: false })
      .exec();
    
    if (!result) {
      throw new NotFoundException('Simulation task not found');
    }
  }

  async hardDelete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid task ID');
    }

    const result = await this.simulationTaskModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Simulation task not found');
    }
  }

  private buildQuery(filters: Partial<SimulationTask>): any {
    const query: any = { isActive: true };

    if (filters.careerId) {
      query.careerId = new Types.ObjectId(filters.careerId as any);
    }

    if (filters.taskType) {
      query.taskType = filters.taskType;
    }

    if (filters.difficulty) {
      query.difficulty = filters.difficulty;
    }

    if (filters.targetLevel) {
      query.targetLevel = filters.targetLevel;
    }

    if (filters.tags) {
      query.tags = { $in: filters.tags };
    }

    return query;
  }
}