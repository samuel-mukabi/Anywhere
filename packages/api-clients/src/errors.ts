export interface ApiErrorOptions {
  source: string;
  statusCode: number;
  message: string;
  retryable: boolean;
}

export class ApiError extends Error {
  public readonly source: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.source = options.source;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable;
  }
}
