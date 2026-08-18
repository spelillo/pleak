import { Sun, Moon, Desktop, SignIn } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/cn";

const themeOptions = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "system" as const, label: "System", icon: Desktop },
  { value: "dark" as const, label: "Dark", icon: Moon },
];

export function Profile() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <PageHeader title="Profile" />

      <Card variant="outline" className="mb-6 flex items-center gap-4">
        <Avatar name="Not signed in" size={48} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">Not signed in</p>
          <p className="text-sm text-muted">Sign in with Google to sync your data.</p>
        </div>
        <Button variant="secondary" size="sm" disabled>
          <SignIn size={16} />
          Sign in
        </Button>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-ink">Appearance</h2>
      <Card variant="outline" className="mb-6 flex items-center gap-1 p-1.5">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors",
                isActive ? "bg-surface-card text-ink" : "text-muted hover:text-ink",
              )}
              aria-pressed={isActive}
            >
              <Icon size={16} />
              {option.label}
            </button>
          );
        })}
      </Card>

    </div>
  );
}
