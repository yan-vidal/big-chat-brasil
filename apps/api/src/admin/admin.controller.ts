import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AdminAddCreditRequestSchema,
  AdminConvertPlanRequestSchema,
  AdminCreateClientRequestSchema,
  AdminUpdateClientStatusRequestSchema,
  AdminUpdateLimitRequestSchema,
  IdSchema,
  type AdminAddCreditRequest,
  type AdminClientResponse,
  type AdminConvertPlanRequest,
  type AdminCreateClientRequest,
  type AdminUpdateClientStatusRequest,
  type AdminUpdateLimitRequest,
} from '@bcb/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AdminService } from './admin.service.js';

function badRequest(
  message: string,
  error: { issues: readonly { path: PropertyKey[]; message: string }[] },
) {
  return new BadRequestException({
    message,
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

function parseId(value: string): string {
  const result = IdSchema.safeParse(value);
  if (!result.success) {
    throw badRequest('Identificador invalido', result.error);
  }

  return result.data;
}

function parseCreateClient(body: unknown): AdminCreateClientRequest {
  const result = AdminCreateClientRequestSchema.safeParse(body);
  if (!result.success) {
    throw badRequest('Payload de cliente invalido', result.error);
  }

  return result.data;
}

function parseStatus(body: unknown): AdminUpdateClientStatusRequest {
  const result = AdminUpdateClientStatusRequestSchema.safeParse(body);
  if (!result.success) {
    throw badRequest('Payload de status invalido', result.error);
  }

  return result.data;
}

function parseCredit(body: unknown): AdminAddCreditRequest {
  const result = AdminAddCreditRequestSchema.safeParse(body);
  if (!result.success) {
    throw badRequest('Payload de credito invalido', result.error);
  }

  return result.data;
}

function parseLimit(body: unknown): AdminUpdateLimitRequest {
  const result = AdminUpdateLimitRequestSchema.safeParse(body);
  if (!result.success) {
    throw badRequest('Payload de limite invalido', result.error);
  }

  return result.data;
}

function parsePlan(body: unknown): AdminConvertPlanRequest {
  const result = AdminConvertPlanRequestSchema.safeParse(body);
  if (!result.success) {
    throw badRequest('Payload de plano invalido', result.error);
  }

  return result.data;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('clients')
  listClients(): Promise<readonly AdminClientResponse[]> {
    return this.adminService.listClients();
  }

  @Post('clients')
  createClient(@Body() body: unknown): Promise<AdminClientResponse> {
    return this.adminService.createClient(parseCreateClient(body));
  }

  @Patch('clients/:id/status')
  updateStatus(@Param('id') id: string, @Body() body: unknown): Promise<AdminClientResponse> {
    return this.adminService.updateStatus(parseId(id), parseStatus(body));
  }

  @Post('clients/:id/credits')
  addPrepaidCredit(@Param('id') id: string, @Body() body: unknown): Promise<AdminClientResponse> {
    return this.adminService.addPrepaidCredit(parseId(id), parseCredit(body));
  }

  @Patch('clients/:id/limit')
  updatePostpaidLimit(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AdminClientResponse> {
    return this.adminService.updatePostpaidLimit(parseId(id), parseLimit(body));
  }

  @Post('clients/:id/plan')
  convertPlan(@Param('id') id: string, @Body() body: unknown): Promise<AdminClientResponse> {
    return this.adminService.convertPlan(parseId(id), parsePlan(body));
  }
}
