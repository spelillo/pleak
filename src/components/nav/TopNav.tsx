import { Link, useLocation } from "wouter";
import { Sun, Moon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/contexts/theme-context";
import { springSnappy } from "@/lib/motion";
import { isItemActive, navItems } from "./nav-items";

export function TopNav() {
  const [location] = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <header className="material-header sticky top-0 z-40 hidden h-14 md:block">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 transition-opacity active:opacity-60">
          <img src={`${import.meta.env.BASE_URL}pleak-glyph.png`} alt="" className="h-6 w-auto" />
          <span className="text-base font-semibold tracking-tight text-ink">Pleak</span>
        </Link>

        <nav className="flex items-center gap-0.5 rounded-pill bg-surface-card p-1" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = isItemActive(item.path, location);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "relative rounded-pill px-4 py-1.5 text-sm font-medium transition-colors",
                  isActive ? "text-ink" : "text-muted hover:text-ink",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="top-nav-thumb"
                    className="absolute inset-0 rounded-pill bg-canvas shadow-[0_2px_6px_rgb(0_0_0/0.1)] dark:bg-[#636366]"
                    transition={reduceMotion ? { duration: 0 } : springSnappy}
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <motion.button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          whileTap={reduceMotion ? undefined : { scale: 0.92 }}
          transition={springSnappy}
          className="flex size-9 items-center justify-center rounded-full bg-surface-card text-ink transition-colors hover:bg-surface-strong"
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>
      </div>
    </header>
  );
}
