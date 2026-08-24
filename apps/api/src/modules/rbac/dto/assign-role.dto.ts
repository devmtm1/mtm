import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ example: 'b3f1c2a4-...' })
  @IsUUID()
  roleId!: string;
}
