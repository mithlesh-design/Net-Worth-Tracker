"use client";

import { LucideProvider } from "lucide-react";
import { ICON_SIZE, ICON_STROKE } from "@/lib/ui/icons.mjs";

/* One stroke weight and one default size for every icon in the app.

   Icon sizes had drifted to nine different values (8, 10, 12, 13, 14, 17, 18,
   20, 24) at Lucide's default stroke of 2, which reads heavy and uneven at
   small sizes. Setting the defaults here rather than at each call site means a
   size or weight change is one edit, and a new icon is consistent by default
   instead of by remembering. Call sites still override size from the scale in
   lib/ui/icons.mjs; overriding strokeWidth should be rare and deliberate. */
export default function IconProvider({ children }) {
  return (
    <LucideProvider size={ICON_SIZE.md} strokeWidth={ICON_STROKE}>
      {children}
    </LucideProvider>
  );
}
