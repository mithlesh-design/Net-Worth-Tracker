"use client";

import { useId } from "react";
import { Switch } from "./switch";
import { Label } from "./label";

export default function ToggleSwitch({ value, onChange, label }) {
  /* The label needs htmlFor and the switch a matching id, or clicking the text
     does nothing — which is where people aim, and the hit target for the
     control itself is only 40x20px. */
  const id = useId();

  return (
    <div className="flex items-center gap-2.5">
      <Switch id={id} checked={value} onCheckedChange={onChange} />
      <Label htmlFor={id} className="cursor-pointer">{label}</Label>
    </div>
  );
}
