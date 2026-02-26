"use client"

import { themes } from "@/lib/themes"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

interface ThemePreviewProps {
  themeKey: string
  theme: (typeof themes)[string]
  isActive: boolean
  onClick: () => void
}

function ThemePreviewCard({ themeKey, theme, isActive, onClick }: ThemePreviewProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-[1.02]",
        isActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      {/* Color Preview Squares */}
      <div className="flex gap-1">
        {/* Light mode preview */}
        <div
          className="w-12 h-12 rounded-md overflow-hidden border shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${theme.light["--background"]} 50%, ${theme.light["--primary"]} 50%)`,
          }}
        />
        {/* Dark mode preview */}
        <div
          className="w-12 h-12 rounded-md overflow-hidden border shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${theme.dark["--background"]} 50%, ${theme.dark["--primary"]} 50%)`,
          }}
        />
      </div>

      {/* Color dots */}
      <div className="flex items-center gap-1.5">
        <div
          className="w-3 h-3 rounded-full border"
          style={{ backgroundColor: theme.preview.primary }}
        />
        <div
          className="w-3 h-3 rounded-full border"
          style={{ backgroundColor: theme.preview.secondary }}
        />
        <div
          className="w-3 h-3 rounded-full border"
          style={{ backgroundColor: theme.preview.accent }}
        />
      </div>

      {/* Theme Name */}
      <span className={cn(
        "text-xs font-medium",
        isActive && "text-primary"
      )}>
        {theme.name}
      </span>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </button>
  )
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Choose how TaskForge looks to you. Select a theme below to customize.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {Object.entries(themes).map(([key, themeConfig]) => (
          <ThemePreviewCard
            key={key}
            themeKey={key}
            theme={themeConfig}
            isActive={theme === key}
            onClick={() => setTheme(key)}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        Theme changes apply instantly and are saved automatically.
      </p>
    </div>
  )
}
