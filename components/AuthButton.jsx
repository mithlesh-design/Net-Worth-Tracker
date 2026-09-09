"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { LogIn, LogOut, User, Save, FolderOpen, Trash2, ChevronDown, X } from "lucide-react";

export default function AuthButton({ onSaveProfile, onLoadProfile, profiles = [], onDeleteProfile, onRefreshProfiles, saveState = { status: "idle", message: "" } }) {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setProfilesOpen(false);
        setShowSaveInput(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (status === "loading") {
    return (
      <div className="h-8 w-8 rounded-full animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors shadow-sm"
      >
        <LogIn size={13} />
        Sign In
      </button>
    );
  }

  const user = session.user;
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => { setMenuOpen(!menuOpen); if (!menuOpen) onRefreshProfiles?.(); }}
        className="flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 transition-colors shadow-sm"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
      >
        {user.image ? (
          <img src={user.image} alt="" className="h-7 w-7 rounded-full" />
        ) : (
          <div className="h-7 w-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold"
            style={{ background: 'var(--info-emerald-bg)', color: 'var(--badge-emerald-text)' }}>
            {initials}
          </div>
        )}
        <span className="text-xs font-medium max-w-[100px] truncate hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
          {user.name || user.email}
        </span>
        <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-xl z-50 overflow-hidden"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', boxShadow: '0 8px 24px var(--shadow-color)' }}>
          {/* User info */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-secondary)' }}>
            <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{user.name || "User"}</p>
            <p className="text-[0.6rem] truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
          </div>

          {/* Save Profile */}
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-secondary)' }}>
            {/* A failed save used to look exactly like a successful one: every
                handler swallowed its error and none checked res.ok's else. */}
            {saveState.status !== "idle" && saveState.message && (
              <div className="mb-2 rounded-lg border px-2.5 py-1.5 text-[0.6rem]"
                style={saveState.status === "error"
                  ? { background: 'var(--info-red-bg)', borderColor: 'var(--info-red-border)', color: 'var(--info-red-text)' }
                  : { background: 'var(--info-emerald-bg)', borderColor: 'var(--info-emerald-border)', color: 'var(--info-emerald-text)' }}>
                {saveState.message}
              </div>
            )}
            {showSaveInput ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Profile name..."
                  className="flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && saveName.trim()) {
                      onSaveProfile?.(saveName.trim());
                      setSaveName("");
                      setShowSaveInput(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (saveName.trim()) {
                      onSaveProfile?.(saveName.trim());
                      setSaveName("");
                      setShowSaveInput(false);
                    }
                  }}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[0.6rem] font-bold text-white hover:bg-emerald-600 transition"
                >
                  Save
                </button>
                <button onClick={() => setShowSaveInput(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveInput(true)}
                className="flex items-center gap-2 w-full rounded-lg px-2 py-2 text-xs transition"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Save size={13} className="text-emerald-500" />
                Save Current Settings
              </button>
            )}
          </div>

          {/* Saved Profiles */}
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-secondary)' }}>
            <button
              onClick={() => setProfilesOpen(!profilesOpen)}
              className="flex items-center justify-between w-full rounded-lg px-2 py-2 text-xs transition"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span className="flex items-center gap-2">
                <FolderOpen size={13} style={{ color: 'var(--info-blue-text)' }} />
                Saved Profiles
                <span className="rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                  {profiles.length}
                </span>
              </span>
              <ChevronDown size={12} className={`transition-transform ${profilesOpen ? "rotate-180" : ""}`} style={{ color: 'var(--text-muted)' }} />
            </button>

            {profilesOpen && (
              <div className="mt-1 max-h-48 overflow-y-auto space-y-1">
                {profiles.length === 0 ? (
                  <p className="text-[0.6rem] text-center py-3" style={{ color: 'var(--text-muted)' }}>No saved profiles yet</p>
                ) : (
                  profiles.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 group transition"
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      <button
                        onClick={() => {
                          onLoadProfile?.(p);
                          setMenuOpen(false);
                          setProfilesOpen(false);
                        }}
                        className="flex-1 text-left"
                      >
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                        <p className="text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(p.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProfile?.(p.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition p-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sign Out */}
          <div className="px-3 py-2">
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 w-full rounded-lg px-2 py-2 text-xs transition"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--info-red-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={13} className="text-rose-400" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
