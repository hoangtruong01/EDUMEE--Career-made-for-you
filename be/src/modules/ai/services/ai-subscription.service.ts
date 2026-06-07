import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { SignOptions } from 'jsonwebtoken';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { LoginType, UserRole, UserVerifyStatus } from '../../../common/enums';
import { MailService } from '../../../common/mail/mail.service';
import {
  BillingCycle,
  SubscriptionStatus,
  UserSubscription,
  UserSubscriptionDocument,
} from '../../users/schemas/user-subscriptions';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { AiPlan, AiPlanDocument } from '../schema/ai-plan.schema';

type SubscriptionQuotaPeriod = {
  quotaPeriodStart: Date;
  quotaPeriodEnd: Date;
  nextQuotaResetAt: Date;
};

const IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const IMPORT_MAX_ROWS = 1000;
const IMPORT_ALLOWED_EXTENSIONS = new Set(['xlsx', 'xls']);
const IMPORT_ALLOWED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

type ImportedUserRowStatus = 'created_assigned' | 'existing_assigned' | 'failed';

export type ImportedUserToPlanResultRow = {
  rowNumber: number;
  email?: string;
  name?: string;
  userId?: string;
  subscriptionId?: string;
  status: ImportedUserRowStatus;
  message: string;
  warnings?: string[];
};

export type ImportUsersToPlanResult = {
  totalRows: number;
  createdUsers: number;
  assignedExistingUsers: number;
  failedRows: number;
  emailWarningRows: number;
  rows: ImportedUserToPlanResultRow[];
};

type ParsedImportRow = {
  rowNumber: number;
  data: Record<string, unknown>;
};

type NormalizedImportedUser = {
  name: string;
  email: string;
  gender: string;
  dateOfBirth: Date;
  phoneNumber: string;
  address: {
    street?: string;
    ward?: string;
    district?: string;
    city?: string;
    country?: string;
    zipcode?: string;
  };
};

@Injectable()
export class AiSubscriptionService {
  constructor(
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(AiPlan.name)
    private readonly aiPlanModel: Model<AiPlanDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async upsertActiveSubscription(params: {
    userId: string;
    planId: string;
    billingCycle?: BillingCycle;
    startDate?: Date;
    endDate?: Date;
    paymentId?: string;
  }): Promise<UserSubscriptionDocument> {
    const { userId, planId, paymentId } = params;
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    if (!Types.ObjectId.isValid(planId)) throw new BadRequestException('Invalid planId');
    if (paymentId && !Types.ObjectId.isValid(paymentId)) throw new BadRequestException('Invalid paymentId');

    const plan = await this.aiPlanModel.findById(planId).exec();
    if (!plan) throw new NotFoundException('AI plan not found');
    const billingCycle = params.billingCycle ?? BillingCycle.MONTHLY;
    this.ensurePlanSupportsBillingCycle(plan, billingCycle);

    // Cancel existing active subs
    await this.userSubscriptionModel.updateMany(
      { userId: new Types.ObjectId(userId), status: SubscriptionStatus.ACTIVE },
      { $set: { status: SubscriptionStatus.CANCELLED, endDate: new Date() } },
    );

    const startDate = params.startDate ?? new Date();
    const endDate = params.endDate ?? this.computeEndDate(startDate, billingCycle);
    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('endDate must be after startDate');
    }
    const quotaPeriod = this.computeInitialQuotaPeriod(startDate, endDate);

    const sub = new this.userSubscriptionModel({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(planId),
      ...(paymentId
        ? {
            paymentId: new Types.ObjectId(paymentId),
            paymentIds: [new Types.ObjectId(paymentId)],
          }
        : {}),
      billingCycle,
      startDate,
      endDate,
      ...quotaPeriod,
      status: SubscriptionStatus.ACTIVE,
    });
    return sub.save();
  }

  async assignUserToPlan(params: {
    userId?: string;
    identifier?: string;
    planId: string;
    billingCycle?: BillingCycle;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UserSubscriptionDocument> {
    const user = await this.resolveUserForAssignment(params.userId, params.identifier);

    return this.upsertActiveSubscription({
      userId: String(user._id),
      planId: params.planId,
      billingCycle: params.billingCycle,
      startDate: params.startDate,
      endDate: params.endDate,
    });
  }

  async importUsersToPlan(
    file: Express.Multer.File | undefined,
    params: {
      planId: string;
      billingCycle?: BillingCycle;
    },
  ): Promise<ImportUsersToPlanResult> {
    this.validateImportFile(file);
    if (!Types.ObjectId.isValid(params.planId)) throw new BadRequestException('Invalid planId');

    const billingCycle = params.billingCycle ?? BillingCycle.MONTHLY;
    const plan = await this.aiPlanModel.findById(params.planId).exec();
    if (!plan) throw new NotFoundException('AI plan not found');
    this.ensurePlanSupportsBillingCycle(plan, billingCycle);

    const importRows = this.parseImportWorkbook(file);
    const seenEmails = new Set<string>();
    const result: ImportUsersToPlanResult = {
      totalRows: importRows.length,
      createdUsers: 0,
      assignedExistingUsers: 0,
      failedRows: 0,
      emailWarningRows: 0,
      rows: [],
    };

    for (const importRow of importRows) {
      let normalizedUser: NormalizedImportedUser | null = null;

      try {
        normalizedUser = this.normalizeImportedUserRow(importRow.data);
        if (seenEmails.has(normalizedUser.email)) {
          throw new BadRequestException('Email is duplicated in this import file');
        }
        seenEmails.add(normalizedUser.email);

        const existingUser = await this.findUserByEmail(normalizedUser.email);
        const warnings: string[] = [];
        let user = existingUser;
        let created = false;

        if (!user) {
          const createdUser = await this.createImportedUser(normalizedUser);
          user = createdUser.user;
          warnings.push(...createdUser.warnings);
          created = true;
        }

        const subscription = await this.upsertActiveSubscription({
          userId: String(user._id),
          planId: params.planId,
          billingCycle,
        });

        if (created) {
          result.createdUsers += 1;
        } else {
          result.assignedExistingUsers += 1;
        }
        if (warnings.length > 0) {
          result.emailWarningRows += 1;
        }

        result.rows.push({
          rowNumber: importRow.rowNumber,
          email: normalizedUser.email,
          name: normalizedUser.name,
          userId: String(user._id),
          subscriptionId: String(subscription._id),
          status: created ? 'created_assigned' : 'existing_assigned',
          message: created ? 'Created user and assigned plan' : 'Assigned existing user to plan',
          ...(warnings.length ? { warnings } : {}),
        });
      } catch (error) {
        result.failedRows += 1;
        result.rows.push({
          rowNumber: importRow.rowNumber,
          email: normalizedUser?.email || this.stringifyImportCell(this.getImportCell(importRow.data, ['email'])),
          name: normalizedUser?.name || this.stringifyImportCell(this.getImportCell(importRow.data, ['name'])),
          status: 'failed',
          message: this.getImportErrorMessage(error),
        });
      }
    }

    return result;
  }

  async activateSubscriptionFromPayment(params: {
    userId: string;
    planId: string;
    paymentId: string;
    billingCycle: BillingCycle;
    startDate?: Date;
  }): Promise<UserSubscriptionDocument> {
    const { paymentId } = params;
    if (!Types.ObjectId.isValid(params.userId)) throw new BadRequestException('Invalid userId');
    if (!Types.ObjectId.isValid(params.planId)) throw new BadRequestException('Invalid planId');
    if (!Types.ObjectId.isValid(paymentId)) throw new BadRequestException('Invalid paymentId');

    const paymentObjectId = new Types.ObjectId(paymentId);
    const existing = await this.findSubscriptionByPaymentId(paymentObjectId);
    if (existing) {
      if (existing.status === SubscriptionStatus.ACTIVE) return existing;
      throw new ConflictException('Payment has already been linked to a subscription');
    }

    const plan = await this.aiPlanModel.findById(params.planId).exec();
    if (!plan) throw new NotFoundException('AI plan not found');
    this.ensurePlanSupportsBillingCycle(plan, params.billingCycle);

    const startDate = params.startDate ?? new Date();
    const currentActive = await this.getActiveSubscriptionForUser(params.userId);
    if (currentActive && currentActive.planId.toString() === params.planId) {
      this.ensureQuotaPeriodForDate(currentActive, startDate);
      const renewalBase =
        currentActive.endDate && currentActive.endDate.getTime() > startDate.getTime()
          ? currentActive.endDate
          : startDate;
      currentActive.billingCycle = params.billingCycle;
      currentActive.endDate = this.computeEndDate(renewalBase, params.billingCycle);
      this.linkPaymentToSubscription(currentActive, paymentObjectId);
      return currentActive.save();
    }

    let quotaPeriodOverride: SubscriptionQuotaPeriod | undefined;
    if (currentActive) {
      this.ensureQuotaPeriodForDate(currentActive, startDate);
      quotaPeriodOverride = this.getReusableQuotaPeriod(currentActive, startDate);
      currentActive.status = SubscriptionStatus.CANCELLED;
      currentActive.endDate = startDate;
      await currentActive.save();
    }

    return this.createActiveSubscription({
      userId: params.userId,
      planId: params.planId,
      paymentId,
      billingCycle: params.billingCycle,
      startDate,
      quotaPeriod: quotaPeriodOverride,
    });
  }

  async cancelSubscription(id: string): Promise<UserSubscriptionDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid subscription id');
    const sub = await this.userSubscriptionModel
      .findByIdAndUpdate(
        id,
        { $set: { status: SubscriptionStatus.CANCELLED, endDate: new Date() } },
        { new: true, runValidators: true },
      )
      .exec();
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async getActiveSubscriptionForUser(userId: string): Promise<UserSubscriptionDocument | null> {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    await this.expireStaleSubscriptions(userId);
    return this.userSubscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), status: SubscriptionStatus.ACTIVE })
      .sort({ startDate: -1, createdAt: -1 })
      .exec();
  }

  async revokeSubscriptionForPayment(paymentId: string): Promise<UserSubscriptionDocument | null> {
    if (!Types.ObjectId.isValid(paymentId)) throw new BadRequestException('Invalid paymentId');
    return this.userSubscriptionModel
      .findOneAndUpdate(
        {
          $or: [
            { paymentId: new Types.ObjectId(paymentId) },
            { paymentIds: new Types.ObjectId(paymentId) },
          ],
          status: SubscriptionStatus.ACTIVE,
        },
        { $set: { status: SubscriptionStatus.CANCELLED, endDate: new Date() } },
        { new: true, runValidators: true },
      )
      .exec();
  }

  private async findSubscriptionByPaymentId(
    paymentId: Types.ObjectId,
  ): Promise<UserSubscriptionDocument | null> {
    return this.userSubscriptionModel
      .findOne({
        $or: [{ paymentId }, { paymentIds: paymentId }],
      })
      .exec();
  }

  private validateImportFile(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Excel file is required');
    }
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Excel file is empty');
    }
    if (file.size > IMPORT_MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('Excel file must not exceed 5MB');
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase() || '';
    const isAllowedExtension = IMPORT_ALLOWED_EXTENSIONS.has(extension);
    const isAllowedMimeType = IMPORT_ALLOWED_MIME_TYPES.has(file.mimetype);
    if (!isAllowedExtension && !isAllowedMimeType) {
      throw new BadRequestException('Only .xlsx and .xls files are supported');
    }
  }

  private parseImportWorkbook(file: Express.Multer.File): ParsedImportRow[] {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException('Excel file cannot be read');
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new BadRequestException('Excel file does not contain any sheets');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils
      .sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: true })
      .map((data, index) => ({ rowNumber: index + 2, data }))
      .filter((row) => this.hasAnyImportValue(row.data));

    if (rows.length === 0) {
      throw new BadRequestException('Excel file does not contain user rows');
    }
    if (rows.length > IMPORT_MAX_ROWS) {
      throw new BadRequestException(`Excel file must not exceed ${IMPORT_MAX_ROWS} user rows`);
    }

    return rows;
  }

  private normalizeImportedUserRow(row: Record<string, unknown>): NormalizedImportedUser {
    const name = this.stringifyImportCell(this.getImportCell(row, ['name', 'full_name', 'ho_ten']));
    const email = this.stringifyImportCell(this.getImportCell(row, ['email'])).toLowerCase();
    const gender = this.stringifyImportCell(this.getImportCell(row, ['gender', 'gioi_tinh']));
    const dateOfBirthValue = this.getImportCell(row, ['date_of_birth', 'dob', 'birth_date', 'ngay_sinh']);
    const phoneNumber = this.stringifyImportCell(this.getImportCell(row, ['phone_number', 'phone', 'sdt']));
    const dateOfBirth = this.parseImportDate(dateOfBirthValue);
    const errors: string[] = [];

    if (!name) errors.push('name is required');
    if (!email) errors.push('email is required');
    if (email && !this.isValidImportEmail(email)) errors.push('email is invalid');
    if (!gender) errors.push('gender is required');
    if (!dateOfBirth) errors.push('date_of_birth is invalid or missing');

    if (errors.length > 0 || !dateOfBirth) {
      throw new BadRequestException(errors.join(', '));
    }

    return {
      name,
      email,
      gender,
      dateOfBirth,
      phoneNumber,
      address: {
        street: this.stringifyImportCell(this.getImportCell(row, ['street'])),
        ward: this.stringifyImportCell(this.getImportCell(row, ['ward'])),
        district: this.stringifyImportCell(this.getImportCell(row, ['district'])),
        city: this.stringifyImportCell(this.getImportCell(row, ['city'])),
        country: this.stringifyImportCell(this.getImportCell(row, ['country'])),
        zipcode: this.stringifyImportCell(this.getImportCell(row, ['zipcode', 'zip_code'])),
      },
    };
  }

  private async createImportedUser(
    userInput: NormalizedImportedUser,
  ): Promise<{ user: UserDocument; warnings: string[] }> {
    const userId = new Types.ObjectId();
    const password = this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(password, 12);
    const forgotPasswordToken = await this.signPasswordSetupToken(userId.toString());
    const user = await this.userModel.create({
      _id: userId,
      name: userInput.name,
      email: userInput.email,
      gender: userInput.gender,
      date_of_birth: userInput.dateOfBirth,
      password: hashedPassword,
      phone_number: userInput.phoneNumber,
      Address: userInput.address,
      email_verify_token: '',
      forgot_password_token: forgotPasswordToken,
      verify: UserVerifyStatus.Verified,
      role: UserRole.USER,
      login_type: LoginType.PASSWORD,
      username: `user${userId.toString()}`,
    });

    const warnings: string[] = [];
    try {
      await this.mailService.sendForgotPasswordEmail(
        userInput.email,
        userInput.name,
        forgotPasswordToken,
      );
    } catch {
      warnings.push('User was created, but password setup email could not be sent');
    }

    return { user, warnings };
  }

  private async findUserByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: new RegExp(`^${this.escapeRegex(email)}$`, 'i') })
      .exec();
  }

  private signPasswordSetupToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { user_id: userId, verify: UserVerifyStatus.Verified },
      {
        secret: this.configService.get<string>('jwt.forgotPasswordSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.forgotPasswordExpiresIn',
        ) as SignOptions['expiresIn'],
      },
    );
  }

  private generateTemporaryPassword(): string {
    return `${randomBytes(24).toString('base64url')}A1@`;
  }

  private hasAnyImportValue(row: Record<string, unknown>): boolean {
    return Object.values(row).some((value) => this.stringifyImportCell(value).length > 0);
  }

  private getImportCell(row: Record<string, unknown>, aliases: string[]): unknown {
    const aliasKeys = new Set(aliases.map((alias) => this.normalizeImportHeader(alias)));
    const entry = Object.entries(row).find(([key]) => aliasKeys.has(this.normalizeImportHeader(key)));
    return entry?.[1];
  }

  private normalizeImportHeader(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  private stringifyImportCell(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    return String(value).trim();
  }

  private parseImportDate(value: unknown): Date | null {
    if (value instanceof Date && this.isValidDate(value)) {
      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return null;
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }

    const text = this.stringifyImportCell(value);
    if (!text) return null;

    const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
    if (isoMatch) {
      return this.createDateFromParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    }

    const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (slashMatch) {
      return this.createDateFromParts(Number(slashMatch[3]), Number(slashMatch[2]), Number(slashMatch[1]));
    }

    const parsed = new Date(text);
    return this.isValidDate(parsed) ? parsed : null;
  }

  private createDateFromParts(year: number, month: number, day: number): Date | null {
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      !this.isValidDate(date)
    ) {
      return null;
    }
    return date;
  }

  private isValidImportEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private getImportErrorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'object' && response !== null) {
        const message = (response as { message?: unknown }).message;
        if (Array.isArray(message)) return message.join(', ');
        if (typeof message === 'string') return message;
      }
      return error.message;
    }
    if (error instanceof Error) return error.message;
    return 'Import row failed';
  }

  private ensurePlanSupportsBillingCycle(plan: AiPlanDocument, billingCycle: BillingCycle): void {
    const allowedCycles = plan.allowedBillingCycles || [];
    if (allowedCycles.length > 0 && !allowedCycles.includes(billingCycle)) {
      throw new BadRequestException('Billing cycle is not supported by this plan');
    }
  }

  private async resolveUserForAssignment(userId?: string, identifier?: string): Promise<UserDocument> {
    const normalizedUserId = userId?.trim();
    const normalizedIdentifier = identifier?.trim();

    if (!normalizedUserId && !normalizedIdentifier) {
      throw new BadRequestException('Select a user before assigning a plan');
    }

    if (normalizedUserId) {
      return this.resolveUserById(normalizedUserId);
    }

    return this.resolveUserByIdentifier(normalizedIdentifier || '');
  }

  private async resolveUserById(userId: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async resolveUserByIdentifier(identifier: string): Promise<UserDocument> {
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) {
      throw new BadRequestException('Email or phone is required');
    }

    if (normalizedIdentifier.includes('@')) {
      const user = await this.userModel
        .findOne({ email: new RegExp(`^${this.escapeRegex(normalizedIdentifier)}$`, 'i') })
        .exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    }

    const compactPhone = normalizedIdentifier.replace(/\s+/g, '');
    const phoneCandidates = Array.from(new Set([normalizedIdentifier, compactPhone])).filter(Boolean);
    const users = await this.userModel
      .find({ phone_number: { $in: phoneCandidates } })
      .limit(2)
      .exec();

    if (users.length === 0) {
      throw new NotFoundException('User not found');
    }
    if (users.length > 1) {
      throw new BadRequestException('Multiple users match this phone number. Use email instead');
    }

    return users[0];
  }

  private createActiveSubscription(params: {
    userId: string;
    planId: string;
    paymentId: string;
    billingCycle: BillingCycle;
    startDate: Date;
    quotaPeriod?: SubscriptionQuotaPeriod;
  }): Promise<UserSubscriptionDocument> {
    const paymentObjectId = new Types.ObjectId(params.paymentId);
    const endDate = this.computeEndDate(params.startDate, params.billingCycle);
    const quotaPeriod = params.quotaPeriod
      ? this.capQuotaPeriod(params.quotaPeriod, endDate)
      : this.computeInitialQuotaPeriod(params.startDate, endDate);
    const sub = new this.userSubscriptionModel({
      userId: new Types.ObjectId(params.userId),
      planId: new Types.ObjectId(params.planId),
      paymentId: paymentObjectId,
      paymentIds: [paymentObjectId],
      billingCycle: params.billingCycle,
      startDate: params.startDate,
      endDate,
      ...quotaPeriod,
      status: SubscriptionStatus.ACTIVE,
    });
    return sub.save();
  }

  private linkPaymentToSubscription(
    subscription: UserSubscriptionDocument,
    paymentId: Types.ObjectId,
  ): void {
    if (!subscription.paymentId) {
      subscription.paymentId = paymentId;
    }

    const ids = [
      subscription.paymentId,
      ...(subscription.paymentIds || []),
      paymentId,
    ].filter((id): id is Types.ObjectId => Boolean(id));
    const uniqueIds = Array.from(new Set(ids.map((id) => id.toString()))).map(
      (id) => new Types.ObjectId(id),
    );
    subscription.paymentIds = uniqueIds;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async expireStaleSubscriptions(userId: string): Promise<void> {
    const now = new Date();
    await this.userSubscriptionModel
      .updateMany(
        {
          userId: new Types.ObjectId(userId),
          status: SubscriptionStatus.ACTIVE,
          endDate: { $lte: now },
        },
        { $set: { status: SubscriptionStatus.EXPIRED } },
      )
      .exec();
  }

  private computeEndDate(startDate: Date, billingCycle: BillingCycle): Date {
    const endDate = new Date(startDate);
    switch (billingCycle) {
      case BillingCycle.THREE_MONTHS:
        endDate.setMonth(endDate.getMonth() + 3);
        return endDate;
      case BillingCycle.SIX_MONTHS:
        endDate.setMonth(endDate.getMonth() + 6);
        return endDate;
      case BillingCycle.FIVE_MONTHS:
        endDate.setMonth(endDate.getMonth() + 5);
        return endDate;
      case BillingCycle.NINE_MONTHS:
        endDate.setMonth(endDate.getMonth() + 9);
        return endDate;
      case BillingCycle.YEARLY:
        endDate.setFullYear(endDate.getFullYear() + 1);
        return endDate;
      case BillingCycle.MONTHLY:
      default:
        endDate.setMonth(endDate.getMonth() + 1);
        return endDate;
    }
  }

  private computeInitialQuotaPeriod(startDate: Date, endDate: Date): SubscriptionQuotaPeriod {
    const quotaPeriodStart = new Date(startDate);
    const quotaPeriodEnd = this.minDate(this.addMonths(quotaPeriodStart, 1), endDate);
    return {
      quotaPeriodStart,
      quotaPeriodEnd,
      nextQuotaResetAt: new Date(quotaPeriodEnd),
    };
  }

  private ensureQuotaPeriodForDate(
    subscription: UserSubscriptionDocument,
    now: Date,
  ): SubscriptionQuotaPeriod {
    const period = this.resolveQuotaPeriodForDate(
      subscription.startDate,
      subscription.endDate || this.computeEndDate(subscription.startDate, subscription.billingCycle),
      now,
      subscription.quotaPeriodStart,
      subscription.quotaPeriodEnd,
    );
    subscription.quotaPeriodStart = period.quotaPeriodStart;
    subscription.quotaPeriodEnd = period.quotaPeriodEnd;
    subscription.nextQuotaResetAt = period.nextQuotaResetAt;
    return period;
  }

  private getReusableQuotaPeriod(
    subscription: UserSubscriptionDocument,
    now: Date,
  ): SubscriptionQuotaPeriod | undefined {
    if (
      !subscription.quotaPeriodStart ||
      !subscription.quotaPeriodEnd ||
      subscription.quotaPeriodEnd.getTime() <= now.getTime()
    ) {
      return undefined;
    }

    return {
      quotaPeriodStart: new Date(subscription.quotaPeriodStart),
      quotaPeriodEnd: new Date(subscription.quotaPeriodEnd),
      nextQuotaResetAt: new Date(subscription.quotaPeriodEnd),
    };
  }

  private resolveQuotaPeriodForDate(
    subscriptionStart: Date,
    subscriptionEnd: Date,
    now: Date,
    currentPeriodStart?: Date,
    currentPeriodEnd?: Date,
  ): SubscriptionQuotaPeriod {
    let quotaPeriodStart = this.isValidDate(currentPeriodStart)
      ? new Date(currentPeriodStart)
      : new Date(subscriptionStart);
    let quotaPeriodEnd = this.isValidDate(currentPeriodEnd)
      ? new Date(currentPeriodEnd)
      : this.minDate(this.addMonths(quotaPeriodStart, 1), subscriptionEnd);

    if (quotaPeriodEnd.getTime() <= quotaPeriodStart.getTime()) {
      quotaPeriodStart = new Date(subscriptionStart);
      quotaPeriodEnd = this.minDate(this.addMonths(quotaPeriodStart, 1), subscriptionEnd);
    }

    while (
      quotaPeriodEnd.getTime() <= now.getTime() &&
      quotaPeriodEnd.getTime() < subscriptionEnd.getTime()
    ) {
      quotaPeriodStart = new Date(quotaPeriodEnd);
      quotaPeriodEnd = this.minDate(this.addMonths(quotaPeriodStart, 1), subscriptionEnd);
    }

    return {
      quotaPeriodStart,
      quotaPeriodEnd,
      nextQuotaResetAt: new Date(quotaPeriodEnd),
    };
  }

  private capQuotaPeriod(period: SubscriptionQuotaPeriod, endDate: Date): SubscriptionQuotaPeriod {
    const quotaPeriodEnd = this.minDate(period.quotaPeriodEnd, endDate);
    return {
      quotaPeriodStart: new Date(period.quotaPeriodStart),
      quotaPeriodEnd,
      nextQuotaResetAt: new Date(quotaPeriodEnd),
    };
  }

  private addMonths(date: Date, months: number): Date {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private minDate(a: Date, b: Date): Date {
    return new Date(Math.min(a.getTime(), b.getTime()));
  }

  private isValidDate(value?: Date): value is Date {
    return value instanceof Date && !Number.isNaN(value.getTime());
  }
}
