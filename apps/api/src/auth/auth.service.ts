import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export type OAuthProfile = {
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  providerId: string;
};

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  provider: string | null;
  providerId: string | null;
};

export type AccessTokenPayload = {
  sub: string;
  email?: string | null;
  provider?: string | null;
  type: 'access';
  exp?: number;
};

export type RefreshTokenPayload = {
  sub: string;
  provider?: string | null;
  type: 'refresh';
  exp?: number;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async loginWithProvider(provider: string, profile: OAuthProfile) {
    const normalizedProvider = provider.toLowerCase();

    if (!['github', 'google'].includes(normalizedProvider)) {
      throw new BadRequestException(`Unsupported provider: ${provider}`);
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { provider: normalizedProvider, providerId: profile.providerId },
          ...(profile.email ? [{ email: profile.email }] : []),
        ],
      },
    });

    const user = existingUser
      ? await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email: profile.email ?? existingUser.email,
            name: profile.name ?? existingUser.name,
            avatarUrl: profile.avatarUrl ?? existingUser.avatarUrl,
            provider: normalizedProvider,
            providerId: profile.providerId,
          },
        })
      : await this.prisma.user.create({
          data: {
            email: profile.email ?? null,
            name: profile.name ?? 'Usuário',
            avatarUrl: profile.avatarUrl ?? null,
            provider: normalizedProvider,
            providerId: profile.providerId,
          },
        });

    const accessToken = this.signJwt<AccessTokenPayload>(
      {
        sub: user.id,
        email: user.email,
        provider: user.provider,
        type: 'access',
      },
      this.getAccessTtlSeconds(),
    );

    const refreshToken = this.signJwt<RefreshTokenPayload>(
      {
        sub: user.id,
        provider: user.provider,
        type: 'refresh',
      },
      this.getRefreshTtlSeconds(),
    );

    const refreshTokenHash = this.hashToken(refreshToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      user: this.serializeUser(user),
      accessToken,
      refreshToken,
      expiresIn: this.getAccessTtlSeconds(),
    };
  }

  async getCurrentUserFromToken(token: string): Promise<AuthUser> {
    const payload = this.verifyJwt(token);

    if (!payload || payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    const userId = typeof payload.sub === 'string' ? payload.sub : undefined;

    if (!userId) {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.serializeUser(user);
  }

  extractAccessToken(request: {
    headers?: Record<string, string | string[] | undefined>;
  }): string | null {
    const authHeader = request.headers?.authorization;

    if (!authHeader) {
      return null;
    }

    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const match = /^Bearer\s+(.+)$/i.exec(headerValue ?? '');
    return match ? (match[1] ?? null) : null;
  }

  extractRefreshToken(request: {
    headers?: Record<string, string | string[] | undefined>;
  }): string | null {
    const cookieHeader = request.headers?.cookie;

    if (!cookieHeader) {
      return null;
    }

    const cookies = Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader;
    const match = /(?:^|;\s*)refresh_token=([^;]+)/.exec(cookies);
    return match ? decodeURIComponent(match[1] ?? '') : null;
  }

  createRefreshCookie(token: string): string {
    return `refresh_token=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${this.getRefreshTtlSeconds()}; Secure=false`;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const hash = this.hashToken(token);
    await this.prisma.user.updateMany({
      where: { refreshTokenHash: hash },
      data: { refreshTokenHash: null },
    });
  }

  private getAccessTtlSeconds(): number {
    return Number(process.env.JWT_ACCESS_TTL ?? '900');
  }

  private getRefreshTtlSeconds(): number {
    return Number(process.env.JWT_REFRESH_TTL ?? '604800');
  }

  private serializeUser(user: {
    id: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
    provider: string | null;
    providerId: string | null;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      providerId: user.providerId,
    };
  }

  private signJwt<T extends Record<string, unknown>>(payload: T, ttlSeconds: number): string {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + ttlSeconds,
    };

    const header = this.base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = this.base64UrlEncode(JSON.stringify(tokenPayload));
    const signature = this.base64UrlEncode(
      createHmac('sha256', process.env.JWT_SECRET ?? 'dev-secret-change-me')
        .update(`${header}.${body}`)
        .digest(),
    );

    return `${header}.${body}.${signature}`;
  }

  private verifyJwt(token: string): Record<string, unknown> | null {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const [header, payload, signature] = parts;

    if (!header || !payload || !signature) {
      return null;
    }

    const expectedSignature = this.base64UrlEncode(
      createHmac('sha256', process.env.JWT_SECRET ?? 'dev-secret-change-me')
        .update(`${header}.${payload}`)
        .digest(),
    );

    if (!this.timingSafeEqual(signature, expectedSignature)) {
      return null;
    }

    try {
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
        string,
        unknown
      >;
      const expiry = Number(decoded.exp ?? 0);
      if (expiry > 0 && expiry < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException('Token expired');
      }
      return decoded;
    } catch {
      return null;
    }
  }

  private hashToken(token: string): string {
    return createHmac('sha256', process.env.JWT_SECRET ?? 'dev-secret-change-me')
      .update(token)
      .digest('hex');
  }

  private base64UrlEncode(value: string | Buffer): string {
    const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private timingSafeEqual(valueA: string, valueB: string): boolean {
    const a = Buffer.from(valueA);
    const b = Buffer.from(valueB);
    const length = Math.max(a.length, b.length);

    let diff = 0;
    for (let index = 0; index < length; index += 1) {
      diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
    }

    return diff === 0;
  }
}
