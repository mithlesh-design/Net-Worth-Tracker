"use client";

import SegmentedControl from "./SegmentedControl";

/* An explicit Yes/No choice stored as a boolean. Deliberately not a bare
   toggle: the client's insurance questions need a recorded answer, and an
   unset switch reads as "No" when it actually means "not asked". */
export default function YesNoField({ label, value, onChange }) {
  return (
    <SegmentedControl
      label={label}
      options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
      value={value ? "yes" : "no"}
      onChange={(v) => onChange(v === "yes")}
    />
  );
}
