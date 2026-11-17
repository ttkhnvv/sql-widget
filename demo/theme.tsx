import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "sqlw-theme";

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* хранилище недоступно — берём системную тему */
  }
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  return dark ? "dark" : "light";
}

/**
 * Текущая тема демо: data-theme на <html> включает тёмные
 * переменные и у демо-страницы, и у самого виджета.
 */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* не критично */
    }
  }, [theme]);

  return [theme, setTheme];
}

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
];

interface ThemeSwitchProps {
  theme: Theme;
  onChange(theme: Theme): void;
}

/**
 * Переключатель светлой и тёмной темы.
 */
export function ThemeSwitch({ theme, onChange }: ThemeSwitchProps) {
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Тема">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={theme === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
