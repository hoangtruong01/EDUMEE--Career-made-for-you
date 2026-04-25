import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';


class AddressDto {
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() ward?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() zipcode?: string;
}

export class UpdateMeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() date_of_birth?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() avatar?: string;

  @IsOptional() @IsString() phone_number?: string;
  @IsOptional() @IsString() username?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
  
  @IsOptional()
  @IsBoolean()
  onboarding_completed?: boolean;

}

