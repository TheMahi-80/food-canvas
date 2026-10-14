"use client";

import { useEffect, useLayoutEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/i18n";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Sun/moon toggle. Icons and labels switch purely via CSS (the `dark:` variant),
 * so server and client markup are identical and there is no hydration mismatch.
 */
export function ThemeToggle() {
  // React's dev Strict Mode remount resets <html> attributes; re-apply before paint (no-op in production).
  useLayoutEffect(() => {
    applyTheme(readStoredTheme() ?? systemTheme());
  }, []);

  // Follow OS changes while the visitor has not made an explicit choice.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (!readStoredTheme()) applyTheme(systemTheme());
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next: Theme = current === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable: theme still applies for this page view.
    }
  }

  return (
    <Button type="button" variant="ghost" size="icon" onClick={toggle}>
      <Sun aria-hidden className="hidden size-5 dark:block" />
      <Moon aria-hidden className="block size-5 dark:hidden" />
      <span className="sr-only hidden dark:inline">{messages.a11y.themeToLight}</span>
      <span className="sr-only dark:hidden">{messages.a11y.themeToDark}</span>
    </Button>
  );
}
