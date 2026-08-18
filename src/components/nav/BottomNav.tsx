import { Link, useLocation } from "wouter";
import { cn } from "@/lib/cn";
import { navItems } from "./nav-items";

function isItemActive(path: string, location: string) {
  if (path === "/") return location === "/";
  return location === path || location.startsWith(`${path}/`);
}

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-canvas pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md">
        {navItems.map((item) => {
          const isActive = isItemActive(item.path, location);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
                isActive ? "text-brand-blue" : "text-muted",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={22} weight={isActive ? "fill" : "regular"} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
