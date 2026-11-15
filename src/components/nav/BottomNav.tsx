import { Link, useLocation } from "wouter";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { springSnappy } from "@/lib/motion";
import { isItemActive, navItems } from "./nav-items";

/**
 * A floating tab bar in a translucent material: content scrolls underneath
 * it, and the selection highlight slides between tabs.
 */
export function BottomNav() {
  const [location] = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      aria-label="Primary"
    >
      <div className="material-bar pointer-events-auto mx-auto flex max-w-md rounded-pill p-1">
        {navItems.map((item) => {
          const isActive = isItemActive(item.path, location);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "relative flex h-14 flex-1 select-none flex-col items-center justify-center gap-0.5 rounded-pill text-[0.6875rem] font-semibold transition-[color,transform] duration-100 active:scale-95",
                isActive ? "text-brand-blue" : "text-ink/80",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-highlight"
                  className="absolute inset-0 rounded-pill bg-surface-card"
                  transition={reduceMotion ? { duration: 0 } : springSnappy}
                />
              )}
              <Icon size={24} weight={isActive ? "fill" : "regular"} className="relative" />
              <span className="label-tracked relative">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
