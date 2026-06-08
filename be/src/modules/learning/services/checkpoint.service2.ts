import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCheckpointDto, UpdateCheckpointAiFeedbackDto } from '../dto/checkpoint.dto2';
import { Checkpoint, CheckpointDocument } from '../schemas/checkpoint.schema2';

@Injectable()
export class CheckpointService {
  constructor(
    @InjectModel(Checkpoint.name)
    private readonly checkpointModel: Model<CheckpointDocument>,
  ) {}

  // User nộp form tự đánh giá (Reflection)
  async create(createDto: CreateCheckpointDto, userId: string): Promise<Checkpoint> {
    const checkpoint = new this.checkpointModel({
      ...createDto,
      userId: new Types.ObjectId(userId),
      roadmapId: new Types.ObjectId(createDto.roadmapId),
    });
    return checkpoint.save();
  }

  // AI Agent gọi hàm này để cập nhật lời khuyên cho User (API bảo mật)
  async updateAiFeedback(id: string, aiDto: UpdateCheckpointAiFeedbackDto): Promise<Checkpoint> {
    const cp = await this.checkpointModel.findByIdAndUpdate(id, aiDto, { new: true }).exec();
    if (!cp) throw new NotFoundException('Checkpoint không tồn tại');
    return cp;
  }

  // Lấy toàn bộ lịch sử khám sức khỏe của một lộ trình
  async findByRoadmap(roadmapId: string): Promise<Checkpoint[]> {
    return this.checkpointModel.find({ roadmapId: new Types.ObjectId(roadmapId) }).exec();
  }
}
