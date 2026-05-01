import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommunityPostDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  content!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  category!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  hashtags?: string[];

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  authorName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  authorTitle?: string;
}

export class CreateCommunityCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(800)
  content!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  authorName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  authorTitle?: string;
}
