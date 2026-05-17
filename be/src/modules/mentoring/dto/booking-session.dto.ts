import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { BookingStatus, SessionType } from '../schemas/booking-session.schema';

export class BookingPaymentReturnUrlsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  success?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancel?: string;
}

export class CreateBookingSessionDto {
  @ApiProperty({ description: 'Tutor profile ID' })
  @IsString()
  tutorProfileId!: string;

  @ApiProperty({ description: 'Mentor availability slot ID' })
  @IsString()
  availabilitySlotId!: string;

  @ApiProperty({ enum: SessionType, description: 'Type of session' })
  @IsEnum(SessionType)
  sessionType!: SessionType;

  @ApiPropertyOptional({ description: 'Session scheduling details derived from selected availability slot' })
  @IsOptional()
  @IsObject()
  schedulingDetails?: {
    requestedDateTime: Date;
    duration: number;
    timeZone: string;
    meetingPlatform: string;
  };

  @ApiProperty({ description: 'Booking request details' })
  @IsObject()
  bookingRequest!: {
    topicsToDiscuss: string[];
    currentSituation: string;
    desiredOutcomes: string[];
    isFirstSession: boolean;
  };

  @ApiPropertyOptional({ enum: BookingStatus, description: 'Booking status' })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ type: BookingPaymentReturnUrlsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BookingPaymentReturnUrlsDto)
  paymentReturnUrls?: BookingPaymentReturnUrlsDto;

  @ApiPropertyOptional({ description: 'Apply available Edumee Credit before SePay checkout.' })
  @IsOptional()
  @IsBoolean()
  useEdumeeCredit?: boolean;
}

export class UpdateBookingSessionDto extends PartialType(CreateBookingSessionDto) {
  @ApiPropertyOptional({ description: 'Mentor response to booking' })
  @IsOptional()
  @IsObject()
  mentorResponse?: {
    responseDate: Date;
    accepted: boolean;
    confirmationNotes?: string;
  };

  @ApiPropertyOptional({ description: 'Payment information' })
  @IsOptional()
  @IsObject()
  paymentInfo?: {
    sessionPrice: number;
    currency: string;
    paymentStatus: string;
  };
}

export class BookingSessionResponseDto {
  @ApiProperty({ description: 'Booking ID' })
  id!: string;

  @ApiProperty({ description: 'Mentee ID' })
  menteeId!: string;

  @ApiProperty({ description: 'Tutor profile ID' })
  tutorProfileId!: string;

  @ApiProperty({ description: 'Mentor ID' })
  mentorId!: string;

  @ApiProperty({ enum: SessionType, description: 'Session type' })
  sessionType!: SessionType;

  @ApiProperty({ enum: BookingStatus, description: 'Booking status' })
  status!: BookingStatus;

  @ApiProperty({ description: 'Scheduling details' })
  schedulingDetails!: any;

  @ApiProperty({ description: 'Booking request' })
  bookingRequest!: any;

  @ApiPropertyOptional({ description: 'Mentor response' })
  mentorResponse?: any;

  @ApiPropertyOptional({ description: 'Payment info' })
  paymentInfo?: any;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;
}
