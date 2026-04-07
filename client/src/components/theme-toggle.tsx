import { useEffect, useState, useCallback } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "monolith-theme";

/** 获取系统主题偏好 */
function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** 应用到 DOM */
function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  const html = document.documentElement;
  if (resolved === "dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
  // 同步 theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#0a0a0f" : "#ffffff");
  }
}

/** 全局主题 Hook */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(STORAGE_KEY) as Theme) || "dark";
  });

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }, []);

  // 初始化加载
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 监听系统主题变化（system 模式下）
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return { theme, setTheme };
}

/** 主题切换按钮（三态：亮 / 暗 / 跟随系统） */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const order: Theme[] = ["dark", "light", "system"];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  };

  const icon = theme === "dark"
    ? <Moon className="h-[15px] w-[15px]" />
    : theme === "light"
    ? <Sun className="h-[15px] w-[15px]" />
    : <Monitor className="h-[15px] w-[15px]" />;

  const label = theme === "dark" ? "暗色" : theme === "light" ? "亮色" : "跟随系统";

  return (
    <button
      onClick={cycle}
      className="inline-flex items-center justify-center h-[34px] w-[34px] rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 transition-all duration-200"
      title={`当前：${label}（点击切换）`}
      aria-label={`切换主题，当前为${label}`}
    >
      {icon}
    </button>
  );
}
