// src/modules/users/dto/create-user.dto.ts
import { IsEmail, IsString, IsOptional, MinLength, IsEnum, Matches, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Password must contain at least one uppercase, one lowercase, one number, and one special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES = 'sales',
  SUPPORT = 'support',
}

export class CreateUserDto {
  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail({}, { message: 'يجب أن يكون البريد الإلكتروني صالحاً' })
  email: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @MinLength(8, { message: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' })
  @Matches(PASSWORD_REGEX, {
    message: 'كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم ورمز خاص على الأقل',
  })
  password: string;

  @ApiProperty({ example: 'أحمد' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'العلي' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '+966501234567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.SALES })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ example: 'ar', default: 'ar' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ example: 'uuid-of-manager', required: false, description: 'ID of the manager (for team assignment)' })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}
