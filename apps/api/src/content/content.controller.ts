import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('floors')
  async listFloors(@Query('userId') userId?: string) {
    return this.contentService.getFloors(userId);
  }

  @Get('floors/:slug')
  async getFloor(@Param('slug') slug: string, @Query('userId') userId?: string) {
    return this.contentService.getFloorBySlug(slug, userId);
  }

  @Get('rooms/:slug')
  async getRoom(@Param('slug') slug: string, @Query('userId') userId?: string) {
    return this.contentService.getRoomBySlug(slug, userId);
  }

  @Get('rooms/:slug/lessons')
  async getRoomLessons(@Param('slug') slug: string, @Query('userId') userId?: string) {
    return this.contentService.getRoomLessons(slug, userId);
  }

  @Get('lessons/:slug')
  async getLesson(@Param('slug') slug: string, @Query('userId') userId?: string) {
    return this.contentService.getLessonBySlug(slug, userId);
  }
}
