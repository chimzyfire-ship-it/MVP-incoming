"use client";

import { useState } from "react";
import {
  Moon,
  Sun,
  Monitor,
  Type,
  Accessibility,
  Bell,
  Globe,
  Shield,
  Eye,
  User,
} from "lucide-react";
import { useAuth, type SkillLevel } from "../context/AuthContext";

type Theme = "dark" | "light" | "system";
type FontSize = "small" | "medium" | "large";

interface Settings {
  theme: Theme;
  fontSize: FontSize;
  reducedMotion: boolean;
  highContrast: boolean;
  notifications: boolean;
  language: string;
  autoPlay: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "dark", // Using dark teal as default theme effectively
  fontSize: "medium",
  reducedMotion: false,
  highContrast: false,
  notifications: true,
  language: "en",
  autoPlay: true,
};

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem("os-layer-settings");
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings) {
  localStorage.setItem("os-layer-settings", JSON.stringify(settings));
}

/* ── Toggle Switch (App Store Style, customized for Teal) ── */
function Toggle({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
          role="switch"
          aria-checked={checked}
          aria-label={label}
        />
        <div
          className={`h-6 w-11 rounded-full transition-colors duration-200 ${
            checked ? "bg-blue-500" : "bg-black/30 shadow-inner block border border-white/5"
          }`}
        />
        <div
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </label>
  );
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const { user, updateUser, openAuthModal, signOut } = useAuth();

  function update(partial: Partial<Settings>) {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <header className="border-b border-white/10 pb-4">
        <h1 className="text-[28px] font-bold tracking-tight text-white sm:text-[34px]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configure your GITMURPH experience.
        </p>
      </header>

      {/* ── Account & Experience ── */}
      {user && (
        <section aria-labelledby="experience-heading" className="flex flex-col gap-4">
          <h3 id="experience-heading" className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-zinc-500">
            <User className="h-4 w-4" /> Account & Experience
          </h3>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
              <div>
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="mt-0.5 text-[13px] text-zinc-400">{user.email}</p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <button onClick={() => openAuthModal("manual")} className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">Edit Interests</button>
                <button onClick={() => signOut()} className="text-[11px] text-zinc-500 hover:text-zinc-400 transition-colors">Sign Out</button>
              </div>
            </div>
            
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-zinc-300">Experience Level</legend>
              <div className="flex flex-col gap-2">
                {[
                  { id: "beginner", label: "Beginner", desc: "Simple descriptions, plain English" },
                  { id: "intermediate", label: "Intermediate", desc: "Balanced technical terminology" },
                  { id: "expert", label: "Expert", desc: "Raw developer jargon & architecture" }
                ].map(level => (
                  <button
                    key={level.id}
                    onClick={() => updateUser({ skillLevel: level.id as SkillLevel })}
                    className={`flex flex-col items-start border rounded-xl px-4 py-3 text-left transition-all ${
                      user.skillLevel === level.id 
                        ? "bg-blue-500/15 border-blue-500/40 shadow-sm" 
                        : "border-white/5 bg-black/20 hover:border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${user.skillLevel === level.id ? 'text-white' : 'text-zinc-300'}`}>{level.label}</span>
                    <span className={`text-xs mt-0.5 ${user.skillLevel === level.id ? 'text-blue-200' : 'text-zinc-500'}`}>{level.desc}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </section>
      )}

      {/* ── Appearance ── */}
      <section aria-labelledby="appearance-heading" className="flex flex-col gap-4">
        <h3 id="appearance-heading" className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-zinc-500">
          <Monitor className="h-4 w-4" /> Appearance
        </h3>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-zinc-300">Theme</legend>
            <div className="flex gap-2">
              {([
                { value: "light" as Theme, icon: <Sun className="h-4 w-4" />, label: "Light" },
                { value: "dark" as Theme, icon: <Moon className="h-4 w-4" />, label: "Dark" },
                { value: "system" as Theme, icon: <Monitor className="h-4 w-4" />, label: "System" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ theme: opt.value })}
                  aria-pressed={settings.theme === opt.value}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    settings.theme === opt.value
                      ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                      : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-zinc-300">
              <span className="flex items-center gap-2">
                <Type className="h-4 w-4" /> Font Size
              </span>
            </legend>
            <div className="flex gap-2">
              {([
                { value: "small" as FontSize, label: "Small" },
                { value: "medium" as FontSize, label: "Medium" },
                { value: "large" as FontSize, label: "Large" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ fontSize: opt.value })}
                  aria-pressed={settings.fontSize === opt.value}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    settings.fontSize === opt.value
                      ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                      : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      {/* ── Accessibility ── */}
      <section aria-labelledby="a11y-heading" className="flex flex-col gap-4">
        <h3 id="a11y-heading" className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-zinc-500">
          <Accessibility className="h-4 w-4" /> Accessibility
        </h3>
        <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-black/20">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-white">Reduced Motion</p>
              <p className="mt-0.5 text-xs text-zinc-400">Minimize platform animations</p>
            </div>
            <Toggle
              id="reduced-motion"
              checked={settings.reducedMotion}
              onChange={(v) => update({ reducedMotion: v })}
              label="Reduced motion"
            />
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-white">High Contrast</p>
              <p className="mt-0.5 text-xs text-zinc-400">Increase structural contrast thresholds</p>
            </div>
            <Toggle
              id="high-contrast"
              checked={settings.highContrast}
              onChange={(v) => update({ highContrast: v })}
              label="High contrast"
            />
          </div>
        </div>
      </section>

      {/* ── Notifications ── */}
      <section aria-labelledby="notif-heading" className="flex flex-col gap-4">
        <h3 id="notif-heading" className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-zinc-500">
          <Bell className="h-4 w-4" /> Notifications
        </h3>
        <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-black/20">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-white">Push Notifications</p>
              <p className="mt-0.5 text-xs text-zinc-400">Get notified about app updates</p>
            </div>
            <Toggle
              id="notifications"
              checked={settings.notifications}
              onChange={(v) => update({ notifications: v })}
              label="Push notifications"
            />
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-white">Auto-play News</p>
              <p className="mt-0.5 text-xs text-zinc-400">Automatically scroll Hero banners</p>
            </div>
            <Toggle
              id="autoplay"
              checked={settings.autoPlay}
              onChange={(v) => update({ autoPlay: v })}
              label="Auto-play news ticker"
            />
          </div>
        </div>
      </section>

      {/* ── Language ── */}
      <section aria-labelledby="lang-heading" className="flex flex-col gap-4">
        <h3 id="lang-heading" className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-zinc-500">
          <Globe className="h-4 w-4" /> Language & Region
        </h3>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <label htmlFor="language-select" className="mb-2 block text-sm font-semibold text-zinc-300">
            Display Language
          </label>
          <select
            id="language-select"
            value={settings.language}
            onChange={(e) => update({ language: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ja">日本語</option>
            <option value="zh">中文</option>
          </select>
        </div>
      </section>

      {/* ── Privacy ── */}
      <section aria-labelledby="privacy-heading" className="flex flex-col gap-4">
        <h3 id="privacy-heading" className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-zinc-500">
          <Shield className="h-4 w-4" /> Privacy
        </h3>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("os-layer-viewed");
              alert("Viewed apps history cleared.");
            }}
            className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-500 transition-all hover:bg-red-500/20"
          >
            Clear Viewed History
          </button>
          <p className="mt-2 text-[13px] text-zinc-500">
            This will permanently remove locally stored history on this device.
          </p>
        </div>
      </section>

      {/* ── About ── */}
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center gap-2 text-zinc-400">
          <Eye className="h-4 w-4" />
          <span className="text-[13px] font-medium">GITMURPH v1.0.0</span>
        </div>
        <p className="mt-1 text-[13px] text-zinc-500">
          Discover, understand and run open-source apps with one tap.
        </p>
      </section>
    </div>
  );
}
