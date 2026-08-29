"use client";

import { Toaster } from "@/components/ui/sonner";

export default function EstudoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster richColors position="top-right" />
    </>
  );
}
