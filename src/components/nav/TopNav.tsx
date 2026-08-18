import { Link, useLocation } from "wouter";
import { Sun, Moon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/contexts/theme-context";
import { navItems } from "./nav-items";

function isItemActive(path: string, location: string) {
  if (path === "/") return location === "/";
  return location === path || location.startsWith(`${path}/`);
}

export function TopNav() {
  const [location] = useLocation();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 hidden h-16 border-b border-hairline bg-canvas md:block">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <img
            src={`${import.meta.env.BASE_URL}pleak-glyph.png`}
            alt=""
            className="h-7 w-auto"
          />
          <span className="text-sm font-bold tracking-wide text-ink">PLEAK</span>
        </Link>

        <nav className="flex items-center gap-1 rounded-pill bg-surface-soft p-1.5" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = isItemActive(item.path, location);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-canvas text-ink shadow-sm"
                    : "text-muted hover:text-ink",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex size-9 items-center justify-center rounded-full border border-hairline text-ink transition-colors hover:bg-surface-soft"
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
