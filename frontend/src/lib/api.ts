const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

type ApiEnvelope<T> = {
  item?: T;
  items?: T[];
  message?: string;
  error?: {
    message?: string;
    details?: unknown;
  }
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.', 0);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (!response.ok) throw new ApiError('Сервер вернул ошибку. Попробуйте позже.', response.status);
    return undefined as T;
  }

  const data = (await response.json()) as ApiEnvelope<T> & T;
  if (!response.ok) {
    throw new ApiError(data.error?.message ?? data.message ?? 'Не удалось выполнить запрос.', response.status, data.error?.details);
  }
  if (data && typeof data === 'object' && 'item' in data) return data.item as T;
  return data as T;
}

export async function downloadCsv(query: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/records/export.csv${query}`, { credentials: 'include' });
  if (!response.ok) {
    let message = 'Не удалось выгрузить данные.';
    try {
      const body = await response.json();
      message = body?.error?.message ?? message;
    } catch { /* CSV error response may not be JSON. */ }
    throw new ApiError(message, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'pressure-records.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadPdf(query: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/records/export.pdf${query}`,
    {
      credentials: 'include',
      headers: {
        Accept: 'application/pdf',
      },
    }
  );

  if (!response.ok) {
    let message = 'Не удалось выгрузить PDF.';

    try {
      const body = await response.json();
      message = body?.error?.message ?? message;
    } catch {
      // PDF error response may not be JSON.
    }

    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'pressure-records.pdf';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Произошла непредвиденная ошибка.';
}
