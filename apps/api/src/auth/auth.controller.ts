import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/:provider')
  async loginWithProvider(
    @Param('provider') provider: string,
    @Body()
    payload: {
      email?: string | null;
      name?: string | null;
      avatarUrl?: string | null;
      providerId: string;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.loginWithProvider(provider, payload);
    res.setHeader('Set-Cookie', this.authService.createRefreshCookie(session.refreshToken));
    return {
      user: session.user,
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(
    @CurrentUser()
    user: ReturnType<AuthService['getCurrentUserFromToken']> extends Promise<infer T> ? T : never,
  ) {
    return user;
  }

  @Post('auth/logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.authService.extractRefreshToken(
      req.headers as Record<string, string | string[] | undefined>,
    );

    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken);
    }

    res.setHeader(
      'Set-Cookie',
      'refresh_token=; Max-Age=0; HttpOnly; Path=/; SameSite=Lax; Secure=false',
    );

    return { success: true };
  }
}
