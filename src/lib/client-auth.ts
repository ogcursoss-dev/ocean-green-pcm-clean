"use client";

import { apiFetch } from "@/lib/api";

export interface CurrentUser {
  userId: string;
  cpf: string;
  name: string;
  role: "ADMIN" | "STUDENT";
  classIds?: string[];
}

export async function getCurrentUserCheck(): Promise<CurrentUser | null> {
  const res = await apiFetch<{ user: CurrentUser | null }>("/api/me");
  if (!res.ok) return null;
  return res.data?.user || null;
}

export async function logoutClient() {
  await apiFetch("/api/auth/logout", { method: "POST" });
}
