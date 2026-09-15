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
      <div className="h-8 w-8 rounded-full animate-pulse bg-[var(--bg-tertiary)]" />
    );
  }

  if (!session) {
    return (
      <Button onClick={() => signIn()} size="sm" className="rounded-full gap-1.5 px-3.5 text-xs font-bold shadow-sm">
        <LogIn size={ICON_SIZE.sm} />
        Sign In
      </Button>
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
          className="flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 transition-colors shadow-sm bg-[var(--bg-secondary)] border-[var(--border-primary)]"
        >
          {user.image ? (
            <img src={user.image} alt="" className="h-7 w-7 rounded-full" />
          ) : (
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold bg-[var(--accent-soft)] text-[var(--accent)]">
              {initials}
            </div>
          )}
          <span className="text-xs font-medium max-w-[100px] truncate hidden sm:block text-[var(--text-secondary)]">
            {user.name || user.email}
          </span>
          {isDemo && (
            <Badge className="hidden sm:block text-[0.5rem] uppercase tracking-wide">Demo</Badge>
          )}
          <ChevronDown size={ICON_SIZE.xs} className="text-[var(--text-muted)]" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        {/* User info */}
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-[var(--text-primary)]">{user.name || "User"}</p>
            {isDemo && <Badge className="text-[0.5rem] uppercase tracking-wide">Demo mode</Badge>}
          </div>
          <p className="text-[0.6rem] truncate text-[var(--text-muted)]">{user.email}</p>
          {isDemo && !persisted && (
            <p className="text-[0.55rem] mt-1 text-[var(--info-red-text)]">
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
                className="mb-2 px-2.5 py-1.5 text-[0.6rem]"
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
                  className="flex-1 h-8 text-xs"
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
                  className="h-8 px-3 text-[0.6rem]"
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
              className="flex items-center justify-between w-full rounded-lg px-2 py-2 text-xs transition text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              <span className="flex items-center gap-2">
                <FolderOpen size={ICON_SIZE.sm} className="text-[var(--info-blue-text)]" />
                Saved Profiles
                <Badge variant="outline" className="text-[0.55rem]">{profiles.length}</Badge>
              </span>
              <ChevronDown size={ICON_SIZE.xs} className={cn("transition-transform text-[var(--text-muted)]", profilesOpen && "rotate-180")} />
            </button>

            {profilesOpen && isDemo && (
              <p className="mt-1 px-2 text-[0.55rem] text-[var(--text-muted)]">
                Demo profiles are saved on this browser only.
              </p>
            )}

            {profilesOpen && (
              <div className="mt-1 max-h-48 overflow-y-auto space-y-1">
                {profiles.length === 0 ? (
                  <p className="text-[0.6rem] text-center py-3 text-[var(--text-muted)]">No saved profiles yet</p>
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
                        <p className="text-xs font-semibold text-[var(--text-primary)]">{p.name}</p>
                        <p className="text-[0.55rem] text-[var(--text-muted)]">
                          {new Date(p.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteProfile?.(p.id); }}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition p-1 text-[var(--text-muted)]"
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
          <LogOut size={ICON_SIZE.sm} className="text-rose-400" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
