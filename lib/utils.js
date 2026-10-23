import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { TYPE_ROLES } from "./ui/type-scale.cjs";

/* tailwind-merge only knows Tailwind's own sizes; told nothing, it reads
   `text-label` as a colour and drops it next to `text-[var(--…)]`. */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: TYPE_ROLES }] } },
});

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
