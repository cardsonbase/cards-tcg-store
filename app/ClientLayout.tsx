"use client";

import { ReactNode } from "react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>; // No providers here—moved to Providers.tsx to avoid nesting/conflicts
}
