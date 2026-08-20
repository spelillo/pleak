import type { ResourceName } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

// Shared secret the Apps Script router checks on every request (see
// isAuthorizedRequest_ in apps-script/Router.gs). This is a modest bar, not
// real per-user auth — it's baked into the built JS bundle like any
// client-embedded secret in a server-less static app, so treat it as a
// deterrent against casual/automated hits on the URL, not a guarantee.
// Exported so auth-api.ts (which makes its own request outside apiGet/
// apiPost) can attach it too.
export const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function requireBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new ApiError(
      "VITE_API_BASE_URL is not set. Add the deployed Apps Script Web App URL to .env.local.",
    );
  }
  return API_BASE_URL;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ApiError(`Non-JSON response from API: ${text.slice(0, 200)}`);
  }
  if (!res.ok || (json && typeof json === "object" && "error" in json)) {
    const message =
      json && typeof json === "object" && "error" in json
        ? String((json as { error: unknown }).error)
        : `Request failed with status ${res.status}`;
    throw new ApiError(message);
  }
  return json as T;
}

/**
 * GET requests carry resource/action/params as query params.
 */
export async function apiGet<T>(
  resource: ResourceName,
  params: Record<string, string | undefined> = {},
): Promise<T> {
  const url = new URL(requireBaseUrl());
  url.searchParams.set("resource", resource);
  if (API_KEY) url.searchParams.set("apiKey", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString());
  return parseResponse<T>(res);
}

/**
 * POST requests use action=create|update|delete via query params, with the
 * JSON payload in the body. Sent as text/plain (not application/json) so the
 * browser treats it as a CORS-simple request and skips the OPTIONS preflight
 * that Apps Script Web Apps don't handle.
 */
export async function apiPost<T>(
  resource: ResourceName,
  action: "create" | "update" | "delete",
  payload: Record<string, unknown>,
): Promise<T> {
  const url = new URL(requireBaseUrl());
  url.searchParams.set("resource", resource);
  url.searchParams.set("action", action);
  if (API_KEY) url.searchParams.set("apiKey", API_KEY);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return parseResponse<T>(res);
}
