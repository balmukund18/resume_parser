export interface AppSettings {
  theme: "light" | "dark" | "system";
  defaultExportFormat: "json" | "pdf";
  defaultEmail: string;
  emailIncludeFullDetails: boolean;
  autoParseOnUpload: boolean;
}

const STORAGE_KEY = "resume-parser-settings";

const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  defaultExportFormat: "json",
  defaultEmail: "",
  emailIncludeFullDetails: true,
  autoParseOnUpload: true,
};

export function getSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  const savedTheme = localStorage.getItem("theme");
  return { ...DEFAULT_SETTINGS, theme: (savedTheme as AppSettings["theme"]) || "light" };
}

export function saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): AppSettings {
  const current = getSettings();
  const next = { ...current, [key]: value };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}
