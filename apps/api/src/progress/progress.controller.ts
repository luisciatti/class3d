import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProgressService, UpdateProgressStatus } from './progress.service';

@Controller()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('me/progress')
  @UseGuards(JwtAuthGuard)
  async getMeProgress(@CurrentUser() user: { id: string }) {
    return this.progressService.getMyProgress(user.id);
  }

  @Patch('me/progress/:lessonId')
  @UseGuards(JwtAuthGuard)
  async updateMeProgress(
    @CurrentUser() user: { id: string },
    @Param('lessonId') lessonId: string,
    @Body() body: { status?: UpdateProgressStatus },
  ) {
    return this.progressService.updateLessonProgress(user.id, lessonId, body.status ?? 'completed');
  }

  @Post('rooms/:slug/quiz/submit')
  @UseGuards(JwtAuthGuard)
  async submitQuiz(
    @CurrentUser() user: { id: string },
    @Param('slug') slug: string,
    @Body() body: { answers?: Record<string, string | number> | Array<number> },
  ) {
    return this.progressService.submitRoomQuiz(user.id, slug, body);
  }

  @Get('leaderboard')
  async getLeaderboard() {
    return this.progressService.getLeaderboard();
  }
}
