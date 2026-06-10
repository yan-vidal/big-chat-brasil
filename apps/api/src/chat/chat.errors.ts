import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

type ChatErrorBody = {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
};

function body(code: string, message: string, details?: unknown): ChatErrorBody {
  return details === undefined ? { code, message } : { code, message, details };
}

export class ValidationErrorException extends BadRequestException {
  constructor(message: string, details?: unknown) {
    super(body('VALIDATION_ERROR', message, details));
  }
}

export class ForbiddenResourceException extends ForbiddenException {
  constructor() {
    super(body('FORBIDDEN_RESOURCE', 'Recurso nao pertence ao cliente autenticado'));
  }
}

export class ConversationNotFoundException extends NotFoundException {
  constructor() {
    super(body('CONVERSATION_NOT_FOUND', 'Conversa nao encontrada'));
  }
}

export class MessageNotFoundException extends NotFoundException {
  constructor() {
    super(body('MESSAGE_NOT_FOUND', 'Mensagem nao encontrada'));
  }
}

export class RecipientNotFoundException extends NotFoundException {
  constructor() {
    super(body('RECIPIENT_NOT_FOUND', 'Destinatario nao encontrado'));
  }
}
