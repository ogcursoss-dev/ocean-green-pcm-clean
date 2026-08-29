/**
 * Pequeno helper para chamadas fetch do client.
 * Lê o cookie de sessão automaticamente (same-origin).
 */
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      credentials: "same-origin",
    });
    const isJson =
      (res.headers.get("content-type") || "").includes("application/json") ||
      url.includes("/api/");
    const data = isJson ? await res.json().catch(() => null) : null;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error:
          (data && (data.error || data.message)) ||
          res.statusText ||
          "Erro na requisição",
      };
    }
    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message || "Falha de conexão",
    };
  }
}

export function formatPct(value?: number | null, digits = 1): string {
  if (value === null || value === undefined || isNaN(value as number)) return "—";
  return `${Number(value).toFixed(digits)}%`;
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds && seconds !== 0) return "—";
  const s = Math.max(0, Math.floor(Number(seconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatDateTime(date?: string | Date | null): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
