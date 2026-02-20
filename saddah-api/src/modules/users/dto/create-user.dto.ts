// src/modules/users/dto/create-user.dto.ts
import { IsEmail, IsString, IsOptional, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
