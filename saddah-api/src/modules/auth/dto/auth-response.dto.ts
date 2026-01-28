// src/modules/auth/dto/auth-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  language: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty({ required: false, nullable: true })
  avatar?: string | null;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Access token for API requests' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token for getting new access tokens' })
  refreshToken: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expiresIn: number;

  @ApiProperty({ type: UserDto, description: 'User information' })
  user: UserDto;
}
