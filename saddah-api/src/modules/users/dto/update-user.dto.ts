// src/modules/users/dto/update-user.dto.ts
import { IsString, IsOptional, IsEnum, IsBoolean, MinLength, Matches, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from './create-user.dto';

// Password must contain at least one uppercase, one lowercase, one number, and one special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;

export class UpdateUserDto {
  @ApiProperty({ example: 'أحمد', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'العلي', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: '+966501234567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ example: 'ar', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 'uuid-of-manager', required: false, description: 'ID of the manager (for team assignment)' })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}

export class UpdateProfileDto {
  @ApiProperty({ example: 'أحمد', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'العلي', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: '+966501234567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'ar', required: false })
  @IsOptional()
  @IsString()
  language?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword@123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewPassword@123' })
  @IsString()
  @MinLength(8, { message: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' })
  @Matches(PASSWORD_REGEX, {
    message: 'كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم ورمز خاص على الأقل',
  })
  newPassword: string;

  @ApiProperty({ example: 'NewPassword@123' })
  @IsString()
  confirmPassword: string;
}
