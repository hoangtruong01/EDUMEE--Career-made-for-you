import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiPlan, AiPlanDocument } from '../schema/ai-plan.schema';
import { CreateAiPlanDto, UpdateAiPlanDto } from '../dto';
import { SubscriptionStatus, UserSubscription, UserSubscriptionDocument } from '../../users/schemas/user-subscriptions';

@Injectable()
export class AiPlanService {
  constructor(
    @InjectModel(AiPlan.name)
    private readonly aiPlanModel: Model<AiPlanDocument>,
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
  ) {}

  async create(dto: CreateAiPlanDto): Promise<AiPlanDocument> {
    const existing = await this.aiPlanModel.findOne({ name: dto.name }).exec();
    if (existing) throw new ConflictException('Plan name already exists');
    const plan = new this.aiPlanModel(dto);
    return plan.save();
  }

  async findAll(): Promise<AiPlanDocument[]> {
    return this.aiPlanModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<AiPlanDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid plan id');
    const plan = await this.aiPlanModel.findById(id).exec();
    if (!plan) throw new NotFoundException('AI plan not found');
    return plan;
  }

  async update(id: string, dto: UpdateAiPlanDto): Promise<AiPlanDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid plan id');
    const plan = await this.aiPlanModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .exec();
    if (!plan) throw new NotFoundException('AI plan not found');
    return plan;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid plan id');
    const activeSubs = await this.userSubscriptionModel
      .countDocuments({ planId: new Types.ObjectId(id), status: SubscriptionStatus.ACTIVE })
      .exec();
    if (activeSubs > 0) {
      throw new BadRequestException('Cannot delete plan with active subscriptions');
    }
    const res = await this.aiPlanModel.deleteOne({ _id: new Types.ObjectId(id) }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('AI plan not found');
  }
}

