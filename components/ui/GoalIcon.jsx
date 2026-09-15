"use client";

import { House, GraduationCap, Car, Gem, Plane, TreePalm, Target } from "lucide-react";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* One icon per goal type, imported by name so the bundler keeps the other
   3,600 out of the build. Stroke weight comes from IconProvider — these are
   line icons in the surrounding text colour, not decoration, so they carry no
   colour of their own. Where a goal marker needs colour it is because the
   colour means something (gold for a target, red for one that is unfunded),
   and the call site sets it.

   Every key in GOAL_TYPES must appear here; goalTypes.test.mjs enforces it. */
const ICONS = {
  home: House,
  education: GraduationCap,
  car: Car,
  wedding: Gem,
  travel: Plane,
  retirement: TreePalm,
  other: Target,
};

export default function GoalIcon({ type, size = ICON_SIZE.md, className, style }) {
  const Icon = ICONS[type] ?? ICONS.other;
  return <Icon size={size} className={className} style={style} aria-hidden="true" />;
}
