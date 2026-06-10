import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayloadSchema } from '@bcb/shared';
import type { AuthenticatedRequest } from './auth.types.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers?.authorization);

    if (!token) {
      throw new UnauthorizedException('Bearer token ausente');
    }

    try {
      const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(token);
      const parsedPayload = JwtPayloadSchema.parse(payload);

      request.auth = parsedPayload;

      return true;
    } catch {
      throw new UnauthorizedException('Bearer token invalido');
    }
  }

  private extractBearerToken(authorization: string | string[] | undefined): string | undefined {
    const header = Array.isArray(authorization) ? authorization[0] : authorization;

    if (!header) {
      return undefined;
    }

    const [scheme, token, extra] = header.split(' ');

    if (scheme !== 'Bearer' || !token || extra) {
      return undefined;
    }

    return token;
  }
}
