// src/modules/leads/dto/reassign-lead.dto.ts
import { IsUUID, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReassignLeadDto {
  @ApiProperty({ description: 'ID of the new owner (sales rep)' })
  @IsUUID()
  newOwnerId: string;
}

export class BulkReassignLeadsDto {
  @ApiProperty({ description: 'Array of lead IDs to reassign' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  leadIds: string[];

  @ApiProperty({ description: 'ID of the new owner (sales rep)' })
  @IsUUID()
  newOwnerId: string;
}
