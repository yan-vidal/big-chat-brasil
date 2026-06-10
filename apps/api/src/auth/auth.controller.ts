import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  AuthSessionRequestSchema,
  type AuthMeResponse,
  type AuthSessionRequest,
  type AuthSessionResponse,
} from '@bcb/shared';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthenticatedRequest } from './auth.types.js';

function parseAuthSessionRequest(body: unknown): AuthSessionRequest {
  const result = AuthSessionRequestSchema.safeParse(body);

  if (!result.success) {
    throw new BadRequestException({
      message: 'Payload de autenticacao invalido',
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  return result.data;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('session')
  createSession(@Body() body: unknown): Promise<AuthSessionResponse> {
    return this.authService.createSession(parseAuthSessionRequest(body));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() request: AuthenticatedRequest): Promise<AuthMeResponse> {
    if (!request.auth) {
      throw new UnauthorizedException('Sessao invalida');
    }

    return this.authService.getCurrentClient(request.auth);
  }
}
