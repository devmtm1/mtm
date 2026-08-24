import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AssignPermissionsDto {
  @ApiProperty({
    type: [String],
    example: ['users:consulter', 'users:creer'],
    description: 'Liste des noms de permissions au format "resource:action"',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissionNames!: string[];
}
