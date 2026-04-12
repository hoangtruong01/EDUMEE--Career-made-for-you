import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VoteType } from '../schemas/review-interactions.schema';

export class UpsertReviewVoteDto {
  @ApiProperty()
  @IsString()
  reviewId!: string;

  @ApiProperty({ enum: VoteType })
  @IsEnum(VoteType)
  voteType!: VoteType;

  @ApiProperty({ required: false })
  @IsOptional()
  voteContext?: Record<string, unknown>;
}

export class RemoveReviewVoteDto {
  @ApiProperty()
  @IsString()
  reviewId!: string;
}

