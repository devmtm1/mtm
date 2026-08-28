import { PartialType } from '@nestjs/swagger';
import { CreateContentBlockDto } from './create-content-block.dto';

export class UpdateContentBlockDto extends PartialType(CreateContentBlockDto) {}
