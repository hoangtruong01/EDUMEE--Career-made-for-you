import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ 
    example: 'CurrentPassword123!',
    description: 'Current password' 
  })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ 
    example: 'NewPassword123!',
    description: 'New password (min 8 chars, must contain uppercase, lowercase, number and special character)' 
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    }
  )
  newPassword!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ 
    example: 'user@example.com',
    description: 'Email address' 
  })
  @IsString()
  email!: string;

  @ApiProperty({ 
    example: 'NewPassword123!',
    description: 'New password (min 8 chars, must contain uppercase, lowercase, number and special character)' 
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    }
  )
  newPassword!: string;

  @ApiProperty({ 
    example: 'reset-token-uuid',
    description: 'Password reset token (optional for admin reset)' 
  })
  @IsString()
  resetToken?: string;
}