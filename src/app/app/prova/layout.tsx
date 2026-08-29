"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserCheck } from "@/lib/client-auth";
import { Toaster } from "@/components/ui/sonner";

/**
 * Layout minimalista para a tela de prova — sem sidebar, foco total.
 * Apenas verifica autenticação.
 */
export default function ExamLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    getCurrentUserCheck().then((u) => {
      if (!u) {
        router.replace("/");
      } else if (u.role === "ADMIN") {
        router.replace("/app/admin");
      } else {
        setChecked(true);
      }
    });
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">{children}</div>
      <Toaster richColors position="top-right" />
    </>
  );
}
