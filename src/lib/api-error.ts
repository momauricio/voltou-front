export class ApiHttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
  }
}

export type ApiErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

export function apiErrorFromBody(status: number, data: ApiErrorBody): ApiHttpError {
  const msg = Array.isArray(data.message)
    ? data.message.join(', ')
    : data.message || data.error || `Erro HTTP ${status}`;
  return new ApiHttpError(msg, status);
}

export function isStaffForbiddenError(err: unknown): boolean {
  return err instanceof ApiHttpError && err.status === 403;
}
