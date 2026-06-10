import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateWeeklyPlanDto, UpdateWeeklyPlanDto } from '../dto/weekly-plan.dto2';
import { WeeklyPlan, WeeklyPlanDocument, WeeklyPlanStatus } from '../schemas/weekly-plan.schema2';

@Injectable()
export class WeeklyPlanService {
  constructor(
    @InjectModel(WeeklyPlan.name)
    private readonly planModel: Model<WeeklyPlanDocument>,
  ) {}

  // AI hoặc Hệ thống tạo kế hoạch tuần mới cho User
  async create(createDto: CreateWeeklyPlanDto, userId: string): Promise<WeeklyPlan> {
    const plan = new this.planModel({
      ...createDto,
      userId: new Types.ObjectId(userId),
      roadmapId: new Types.ObjectId(createDto.roadmapId),
      startDate: new Date(createDto.startDate),
      endDate: new Date(createDto.endDate),
    });
    return plan.save();
  }

  // Lấy Kế hoạch của tuần hiện tại để hiển thị ra Dashboard Widget
  async getDashboardPlan(userId: string): Promise<WeeklyPlan | null> {
    const now = new Date();
    return this.planModel
      .findOne({
        userId: new Types.ObjectId(userId),
        startDate: { $lte: now },
        endDate: { $gte: now },
        status: WeeklyPlanStatus.IN_PROGRESS,
      })
      .exec();
  }

  // Cập nhật trạng thái tuần
  async update(id: string, updateDto: UpdateWeeklyPlanDto): Promise<WeeklyPlan> {
    const plan = await this.planModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!plan) throw new NotFoundException('Không tìm thấy Kế hoạch tuần');
    return plan;
  }
}
