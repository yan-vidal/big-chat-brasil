import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

type InternalTokenRequest = {
  readonly headers?: Record<string, string | string[] | undefined>;
};

@Injectable()
export class InternalTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<InternalTokenRequest>();
    const expectedToken = process.env.INTERNAL_API_TOKEN;
    const tokenHeader = request.headers?.['x-internal-token'];
    const receivedToken = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;

    if (!expectedToken || receivedToken !== expectedToken) {
      throw new UnauthorizedException('Token interno invalido');
    }

    return true;
  }
}
