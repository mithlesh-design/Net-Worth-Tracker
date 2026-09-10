"use client";

import { Switch } from "./switch";
import { Label } from "./label";

export default function ToggleSwitch({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <Switch checked={value} onCheckedChange={onChange} />
      <Label>{label}</Label>
    </div>
  );
}
