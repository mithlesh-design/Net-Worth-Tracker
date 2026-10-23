import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { TYPE_ROLES } from "./ui/type-scale.cjs";

/* tailwind-merge only knows Tailwind's own sizes; told nothing, it reads
   `text-label` as a colour and drops it next to `text-[var(--…)]`. The same
   goes for the card/item spacing tokens: told, `p-card` and `p-4` merge. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: { spacing: ["card", "item"] },
    classGroups: { "font-size": [{ text: TYPE_ROLES }] },
  },
});

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
