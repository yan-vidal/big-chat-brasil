import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorMessageSchema, ApiErrorSchema } from '@bcb/shared';

export function apiErrorMessage(error: unknown, fallbackKey: string): string {
  if (error instanceof HttpErrorResponse) {
    const apiError = ApiErrorSchema.safeParse(error.error);

    if (apiError.success) {
      return apiError.data.message;
    }

    const messageError = ApiErrorMessageSchema.safeParse(error.error);

    if (messageError.success) {
      return messageError.data.message;
    }
  }

  return fallbackKey;
}
