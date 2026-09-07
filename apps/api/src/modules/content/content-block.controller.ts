import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ContentBlockService } from './content-block.service';
import { CreateContentBlockDto } from './dto/create-content-block.dto';
import { UpdateContentBlockDto } from './dto/update-content-block.dto';
import { PublishContentBlockDto } from './dto/publish-content-block.dto';

@ApiTags('content')
@Controller('content')
export class ContentBlockController {
  constructor(private readonly content: ContentBlockService) {}

  @Public()
  @Get()
  findAll(@Query('type') type?: string) {
    if (type) return this.content.findByType(type);
    return this.content.findAll();
  }

  @Get('admin')
  @RequirePermissions('content:consulter')
  findAllAdmin() {
    return this.content.findAllAdmin();
  }

  @Public()
  @Get(':key')
  findByKey(@Param('key') key: string) {
    return this.content.findByKey(key);
  }

  @Post()
  @RequirePermissions('content:creer')
  create(
    @Body() dto: CreateContentBlockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.content.create(dto, user);
  }

  @Patch(':key')
  @RequirePermissions('content:modifier')
  update(
    @Param('key') key: string,
    @Body() dto: UpdateContentBlockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.content.update(key, dto, user.id);
  }

  @Patch(':key/publish')
  @RequirePermissions('content:publier')
  publish(
    @Param('key') key: string,
    @Body() dto: PublishContentBlockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.content.setActive(key, dto.isActive, user.id);
  }

  @Delete(':key')
  @RequirePermissions('content:supprimer')
  remove(@Param('key') key: string) {
    return this.content.remove(key);
  }
}
