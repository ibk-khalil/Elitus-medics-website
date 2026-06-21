import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1.5",
        className,
      )}
    >
      <Sun
        className={cn("h-3.5 w-3.5 transition-colors", isLight ? "text-gold" : "text-muted-foreground")}
        aria-hidden="true"
      />
      <Switch
        checked={isLight}
        onCheckedChange={toggleTheme}
        aria-label={`Switch to ${isLight ? "dark" : "light"} theme`}
      />
      <Moon
        className={cn("h-3.5 w-3.5 transition-colors", !isLight ? "text-gold" : "text-muted-foreground")}
        aria-hidden="true"
      />
    </div>
  );
}
