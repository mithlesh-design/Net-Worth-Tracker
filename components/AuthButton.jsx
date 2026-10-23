"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { LogIn, LogOut, User, Save, FolderOpen, Trash2, ChevronDown, X } from "lucide-react";
import { useAppSession } from "@/components/DemoAuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

export default function AuthButton({ onSaveProfile, onLoadProfile, profiles = [], onDeleteProfile, onRefreshProfiles, saveState = { status: "idle", message: "" } }) {
  const { data: session, status, isDemo, persisted, signOut } = useAppSession();
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  if (status === "loading") {
    return (
      <div className="h-9 w-9 rounded-full animate-pulse bg-white/15" />
    );
  }

  if (!session) {
    return (
      /* Lives on the navy header bar in both themes, so it is styled for a
         dark ground rather than from the card tokens. */
      <button onClick={() => signIn()} aria-label="Sign in"
        className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        style={{ borderColor: "var(--brand-gold-500)", color: "var(--header-text)" }}>
        <LogIn size={ICON_SIZE.sm} />
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  }

  const user = session.user;
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) onRefreshProfiles?.(); }}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          style={{ borderColor: "rgba(255, 255, 255, 0.35)", background: "rgba(255, 255, 255, 0.06)" }}
        >
          {user.image ? (
            <img src={user.image} alt="" className="h-7 w-7 rounded-full" />
          ) : (
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "var(--brand-gold-500)", color: "#0A2342" }}>
              {initials}
            </div>
          )}
          <span className="text-sm font-medium max-w-[120px] truncate hidden sm:block" style={{ color: "var(--header-text)" }}>
            {user.name || user.email}
          </span>
          {isDemo && (
            <Badge className="hidden sm:block">Demo</Badge>
          )}
          <ChevronDown size={ICON_SIZE.xs} style={{ color: "var(--header-muted)" }} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        {/* User info */}
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <p className="text-subtitle text-[var(--text-primary)]">{user.name || "User"}</p>
            {isDemo && <Badge>Demo mode</Badge>}
          </div>
          <p className="truncate text-help text-[var(--text-muted)]">{user.email}</p>
          {isDemo && !persisted && (
            <p className="mt-1 text-help text-[var(--info-red-text)]">
              This browser blocked storage, so a refresh will sign you out.
            </p>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Save Profile */}
        <DropdownMenuGroup>
          <div className="px-2 py-1.5">
            {saveState.status !== "idle" && saveState.message && (
              <Alert
                variant={saveState.status === "error" ? "danger" : "success"}
                className="mb-2 px-3 py-2 text-help"
              >
                {saveState.message}
              </Alert>
            )}
            {showSaveInput ? (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Profile name..."
                  className="flex-1 h-9 text-help"
                  autoFocus
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter" && saveName.trim()) {
                      onSaveProfile?.(saveName.trim());
                      setSaveName("");
                      setShowSaveInput(false);
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-9 px-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (saveName.trim()) {
                      onSaveProfile?.(saveName.trim());
                      setSaveName("");
                      setShowSaveInput(false);
                    }
                  }}
                >
                  Save
                </Button>
                <button onClick={() => setShowSaveInput(false)} className="text-[var(--text-muted)]">
                  <X size={ICON_SIZE.sm} />
                </button>
              </div>
            ) : (
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowSaveInput(true); }}>
                <Save size={ICON_SIZE.sm} className="text-[var(--accent)]" />
                Save Current Settings
              </DropdownMenuItem>
            )}
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Saved Profiles */}
        <DropdownMenuGroup>
          <div className="px-2 py-1.5">
            <button
              onClick={() => setProfilesOpen(!profilesOpen)}
              className="flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-label transition text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              <span className="flex items-center gap-2">
                <FolderOpen size={ICON_SIZE.sm} className="text-[var(--info-blue-text)]" />
                Saved Profiles
                <Badge variant="outline">{profiles.length}</Badge>
              </span>
              <ChevronDown size={ICON_SIZE.xs} className={cn("transition-transform text-[var(--text-muted)]", profilesOpen && "rotate-180")} />
            </button>

            {profilesOpen && isDemo && (
              <p className="mt-1 px-2.5 text-help text-[var(--text-muted)]">
                Demo profiles are saved on this browser only.
              </p>
            )}

            {profilesOpen && (
              <div className="mt-1 max-h-48 overflow-y-auto space-y-1">
                {profiles.length === 0 ? (
                  <p className="py-3 text-center text-help text-[var(--text-muted)]">No saved profiles yet</p>
                ) : (
                  profiles.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 group transition bg-[var(--bg-tertiary)]"
                    >
                      <button
                        onClick={() => onLoadProfile?.(p)}
                        className="flex-1 text-left"
                      >
                        <p className="text-label font-semibold text-[var(--text-primary)]">{p.name}</p>
                        <p className="text-help text-[var(--text-muted)]">
                          {new Date(p.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteProfile?.(p.id); }}
                        className="opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] transition p-1 text-[var(--text-muted)]"
                      >
                        <Trash2 size={ICON_SIZE.xs} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem
          onSelect={() => signOut()}
          className="text-[var(--text-secondary)] focus:bg-[var(--info-red-bg)]"
        >
          <LogOut size={ICON_SIZE.sm} />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
