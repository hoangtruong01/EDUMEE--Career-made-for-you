import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
    IsObject
} from 'class-validator';
import { BookingStatus, SessionType } from '../schemas/booking-session.schema';

export class CreateBookingSessionDto {
  @ApiProperty({ description: 'Tutor profile ID' })
  @IsString()
  tutorProfileId!: string;

  @ApiProperty({ enum: SessionType, description: 'Type of session' })
  @IsEnum(SessionType)
  sessionType!: SessionType;

  @ApiProperty({ description: 'Session scheduling details' })
  @IsObject()
  schedulingDetails!: {
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
