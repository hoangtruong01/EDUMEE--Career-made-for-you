import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

class AddressDto {
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() ward?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() zipcode?: string;
}

export class RegisterDto {
  @ApiProperty({example:'string'})
  @IsNotEmpty({ message: 'Tên không được để trống' })
  @IsString()
  name!: string;

  @ApiProperty({example:'string'})
  @IsNotEmpty()
  gender!: string;

  @ApiProperty({ example: 'string' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email!: string;


  @ApiProperty({ example: 'string' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải từ 8 ký tự trở lên' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt',
  })
  password!: string;


  @ApiProperty({ example: 'string' })
  @IsNotEmpty()
  confirmPassword!: string; // Service sẽ check confirm_password trùng với password


  @ApiProperty({ example: 'string' })
  @IsOptional()
  @IsString()
  phone_number?: string;


  @ApiProperty({ example: 'string' })
  @IsNotEmpty({ message: 'Ngày sinh không được để trống' })
  @IsDateString({}, { message: 'Ngày sinh phải theo định dạng ISO8601' })
  date_of_birth!: string;


  @ApiProperty({ example: 'string' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  Address?: AddressDto;
}
