"use client";

import { RotateCcw } from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* Asked when the Home control (the header logo) would throw work away: the
   user has entered something, or has moved past the first step. Stay Here is
   focused first and is what Esc means; a click outside does nothing, as in
   any alert dialog. Nothing is lost unless Go to Home is chosen on purpose.

   Saved profiles live in the account, not in the working plan, so a signed-in
   user is told they survive the reset.

   Opened from code rather than by a Radix Trigger, so Radix has nothing to
   hand focus back to on close; `returnFocusTo` (the logo) takes it instead. */
export default function ResetToHomeDialog({ open, onOpenChange, onConfirm, signedIn = false, returnFocusTo = null }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onCloseAutoFocus={(e) => {
        if (!returnFocusTo?.current) return;
        e.preventDefault();
        returnFocusTo.current.focus();
      }}>
        <AlertDialogHeader>
          <span aria-hidden className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
            <RotateCcw size={ICON_SIZE.lg} />
          </span>
          <AlertDialogTitle>Return to the Home page?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to return to the Home page? Your current progress and entered
            details will be reset.
            {signedIn && " Your saved profiles are not affected."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay Here</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>Go to Home</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
