import { ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export async function loginWithGoogle(idToken: string): Promise<User> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "VITE_API_BASE_URL is not set. Add the deployed Apps Script Web App URL to .env.local.",
    );
  }
  const url = new URL(API_BASE_URL);
  url.searchParams.set("resource", "auth");
  url.searchParams.set("action", "login");
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ idToken }),
  });
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
  return json as User;
}
