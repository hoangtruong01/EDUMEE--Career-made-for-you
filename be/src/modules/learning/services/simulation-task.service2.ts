import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSimulationTaskDto, UpdateSimulationTaskDto } from '../dto/simulation-task.dto2';
import { SimulationTask, SimulationTaskDocument } from '../schemas/simulation-task.schema2';

@Injectable()
export class SimulationTaskService {
  constructor(
    @InjectModel(SimulationTask.name)
    private readonly taskModel: Model<SimulationTaskDocument>,
  ) {}

  // Tạo đề bài mới (Thường do Admin hoặc AI tạo)
  async create(createDto: CreateSimulationTaskDto): Promise<SimulationTask> {
    const task = new this.taskModel({
      ...createDto,
      careerId: new Types.ObjectId(createDto.careerId),
    });
    return task.save();
  }

  // Lấy danh sách đề bài có phân trang
  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<SimulationTask> = {},
  ): Promise<{ data: SimulationTask[]; total: number }> {
    const skip = (page - 1) * limit;
    const query = { ...filters, isActive: true };

    const [data, total] = await Promise.all([
      this.taskModel.find(query).skip(skip).limit(limit).exec(),
      this.taskModel.countDocuments(query),
    ]);

    return { data, total };
  }

  // Lấy chi tiết 1 đề bài
  async findOne(id: string): Promise<SimulationTask> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) throw new NotFoundException('Không tìm thấy đề bài thực hành');
    return task;
  }

  // Cập nhật đề bài
  async update(id: string, updateDto: UpdateSimulationTaskDto): Promise<SimulationTask> {
    const task = await this.taskModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!task) throw new NotFoundException('Không tìm thấy đề bài thực hành');
    return task;
  }

  // Xóa mềm (Ẩn đề bài thay vì xóa hẳn để giữ dữ liệu lịch sử nộp bài của sinh viên)
  async remove(id: string): Promise<void> {
    const task = await this.taskModel.findByIdAndUpdate(id, { isActive: false }).exec();
    if (!task) throw new NotFoundException('Không tìm thấy đề bài thực hành');
  }
}
