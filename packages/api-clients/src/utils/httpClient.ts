import { ApiError } from '../errors';

export interface JsonRequestOptions extends RequestInit {
  timeoutMs?: number;
  source?: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export async function requestJson<T>(
  url: string,
  options: JsonRequestOptions = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, source = 'unknown', ...requestInit } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...requestInit,
      signal: controller.signal,
    });

    const responseText = await response.text();
    const payload = responseText ? (JSON.parse(responseText) as unknown) : null;

    if (!response.ok) {
      throw new ApiError({
        source,
        statusCode: response.status,
        message: `Request failed with status ${response.status}`,
        retryable: response.status >= 500 || response.status === 429,
      });
    }

    return payload as T;
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError({
        source,
        statusCode: 408,
        message: `Request timed out after ${timeoutMs}ms`,
        retryable: true,
      });
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new ApiError({
      source,
      statusCode: 500,
      message,
      retryable: true,
    });
  } finally {
    clearTimeout(timeout);
  }
}
