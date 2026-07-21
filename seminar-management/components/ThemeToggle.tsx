import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const OPTIONS = [
  { value: "light", label: "Light", icon: "☀" },
  { value: "system", label: "System", icon: "◐" },
  { value: "dark", label: "Dark", icon: "☾" },
] as const;

/**
 * Three-way theme switch. The resolved theme is only known on the client, so
 * we render a same-sized placeholder until mount to avoid a hydration mismatch
 * and a layout shift in the header.
 */
const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-[7.5rem] rounded-lg bg-white/10" aria-hidden />;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-lg bg-white/10 p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${option.label} theme`}
            title={`${option.label} theme`}
            onClick={() => setTheme(option.value)}
            className={`h-8 w-9 rounded-md text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
              active
                ? "bg-white/90 text-slate-900 shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span aria-hidden>{option.icon}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
