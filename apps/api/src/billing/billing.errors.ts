import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

export type BillingErrorCode =
  | 'BILLING_PROFILE_NOT_FOUND'
  | 'INVALID_BILLING_STATE'
  | 'ONBOARDING_REQUIRED'
  | 'PAYMENT_INTENT_NOT_FOUND'
  | 'PAYMENT_INTENT_ALREADY_CONFIRMED'
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_LIMIT';

type BillingErrorBody = {
  readonly code: BillingErrorCode;
  readonly message: string;
  readonly details?: unknown;
};

function body(code: BillingErrorCode, message: string, details?: unknown): BillingErrorBody {
  return details === undefined ? { code, message } : { code, message, details };
}

export class BillingProfileNotFoundException extends NotFoundException {
  constructor() {
    super(body('BILLING_PROFILE_NOT_FOUND', 'Perfil de cobranca nao encontrado'));
  }
}

export class InvalidBillingStateException extends ConflictException {
  constructor(message: string, details?: unknown) {
    super(body('INVALID_BILLING_STATE', message, details));
  }
}

export class OnboardingRequiredException extends ForbiddenException {
  constructor() {
    super(body('ONBOARDING_REQUIRED', 'Conclua o onboarding antes de acessar este recurso'));
  }
}

export class PaymentIntentNotFoundException extends NotFoundException {
  constructor() {
    super(body('PAYMENT_INTENT_NOT_FOUND', 'Intencao de pagamento nao encontrada'));
  }
}

export class PaymentIntentAlreadyConfirmedException extends ConflictException {
  constructor() {
    super(body('PAYMENT_INTENT_ALREADY_CONFIRMED', 'Intencao de pagamento ja confirmada'));
  }
}

export class InsufficientBalanceException extends UnprocessableEntityException {
  constructor() {
    super(body('INSUFFICIENT_BALANCE', 'Saldo insuficiente para enviar a mensagem'));
  }
}

export class InsufficientLimitException extends UnprocessableEntityException {
  constructor() {
    super(body('INSUFFICIENT_LIMIT', 'Limite mensal insuficiente para enviar a mensagem'));
  }
}
