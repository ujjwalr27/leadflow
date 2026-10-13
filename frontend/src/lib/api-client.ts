/**
 * Thin `fetch` wrapper for the LeadFlow API.
 *
 * Non-2xx responses are converted into `ApiError`s using the API's error envelope:
 * `{ "error": { "code", "message", "details" } }`.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
  /\/+$/,
  "",
);

export interface FieldError {
  field: string;
  message: string;
  type: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: FieldError[] | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Map of field name → human-readable message, for showing inline form errors. */
  get fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const detail of this.details ?? []) {
      errors[detail.field] ??= detail.message.replace(/^Value error, /, "");
    }
    return errors;
  }
}

type QueryValue = string | number | null | undefined;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_URL}/api/v1${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const { error } = await response.json();
    return new ApiError(response.status, error.code, error.message, error.details);
  } catch {
    return new ApiError(response.status, "unknown_error", response.statusText || "Request failed");
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "network_error", "Can't reach the LeadFlow server. Is the API running?");
  }

  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}
