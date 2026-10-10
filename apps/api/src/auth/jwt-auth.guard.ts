import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const accessToken = this.authService.extractAccessToken(
      request.headers as Record<string, string | string[] | undefined>,
    );

    if (!accessToken) {
      throw new UnauthorizedException('Access token missing');
    }

    const user = await this.authService.getCurrentUserFromToken(accessToken);
    request.user = user;
    return true;
  }
}
