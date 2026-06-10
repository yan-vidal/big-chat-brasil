import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ADMIN_DOCUMENT_ID,
  AuthMeResponseSchema,
  AuthSessionResponseSchema,
  JwtPayloadSchema,
  type AuthMeResponse,
  type AuthSessionRequest,
  type AuthSessionResponse,
  type AuthenticatedClient,
  type JwtPayload,
} from '@bcb/shared';
import { compare, hash } from 'bcryptjs';
import { AUTH_JWT_EXPIRES_IN, AUTH_PASSWORD_SALT_ROUNDS } from './auth.config.js';
import { AuthRepository } from './auth.repository.js';
import type { AuthIdentity } from './auth.types.js';

const INVALID_CREDENTIALS_MESSAGE = 'Documento ou senha invalidos';
const INVALID_TOKEN_MESSAGE = 'Sessao invalida';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async createSession(request: AuthSessionRequest): Promise<AuthSessionResponse> {
    const existingIdentity = await this.authRepository.findIdentityByDocument(request.documentId);
    if (!existingIdentity && request.documentId === ADMIN_DOCUMENT_ID) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const identity = existingIdentity
      ? await this.validateExistingIdentity(existingIdentity, request.password)
      : await this.createIdentity(request);

    return this.createSessionResponse(identity);
  }

  async getCurrentClient(payload: JwtPayload): Promise<AuthMeResponse> {
    const parsedPayload = JwtPayloadSchema.parse(payload);
    const identity = await this.authRepository.findIdentityByAccountId(parsedPayload.sub);

    if (!identity || !identity.active || identity.clientId !== parsedPayload.clientId) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    return AuthMeResponseSchema.parse(this.toAuthenticatedClient(identity));
  }

  private async validateExistingIdentity(
    identity: AuthIdentity,
    password: string,
  ): Promise<AuthIdentity> {
    const passwordMatches = await compare(password, identity.passwordHash);

    if (!identity.active || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return identity;
  }

  private async createIdentity(request: AuthSessionRequest): Promise<AuthIdentity> {
    const passwordHash = await hash(request.password, AUTH_PASSWORD_SALT_ROUNDS);

    return this.authRepository.createClientIdentity(request, passwordHash);
  }

  private async createSessionResponse(identity: AuthIdentity): Promise<AuthSessionResponse> {
    const client = this.toAuthenticatedClient(identity);
    const payload: JwtPayload = {
      sub: identity.accountId,
      clientId: identity.clientId,
      role: identity.role,
      documentId: identity.documentId,
      documentType: identity.documentType,
      requiresOnboarding: !identity.onboardingCompleted,
    };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: AUTH_JWT_EXPIRES_IN,
    });

    return AuthSessionResponseSchema.parse({
      token,
      requiresOnboarding: payload.requiresOnboarding,
      client,
    });
  }

  private toAuthenticatedClient(identity: AuthIdentity): AuthenticatedClient {
    return {
      id: identity.clientId,
      name: identity.name,
      documentId: identity.documentId,
      documentType: identity.documentType,
      role: identity.role,
      planType: identity.planType,
      active: identity.active,
      onboardingCompleted: identity.onboardingCompleted,
      balanceCents: identity.balanceCents,
      monthlyUsedCents: identity.monthlyUsedCents,
      ...(identity.monthlyLimitCents === null
        ? {}
        : { monthlyLimitCents: identity.monthlyLimitCents }),
    };
  }
}
