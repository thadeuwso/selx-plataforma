export const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function api<T = unknown>(
  rota: string,
  opcoes: { metodo?: string; corpo?: unknown; token?: string | null } = {},
): Promise<{ status: number; json: T | null }> {
  const token = opcoes.token ?? (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null);
  const res = await fetch(`${BASE}${rota}`, {
    method: opcoes.metodo ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
  });
  let json: T | null = null;
  try {
    json = (await res.json()) as T;
  } catch {}
  return { status: res.status, json };
}
