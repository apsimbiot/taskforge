"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { themes, DEFAULT_THEME, type Theme } from "@/lib/themes"

type ThemeContextType = {
  theme: string
  setTheme: (theme: string) => void
  themeConfig: Theme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_KEY = "taskforge-theme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<string>(DEFAULT_THEME)
  const [mounted, setMounted] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored && themes[stored]) {
      setThemeState(stored)
    } else {
      setThemeState(DEFAULT_THEME)
    }
    setMounted(true)
  }, [])

  // Apply theme CSS variables to document
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const themeConfig = themes[theme]
    if (!themeConfig) return

    // Determine if we're in dark mode
    const isDark = root.classList.contains("dark")
    const colors = isDark ? themeConfig.dark : themeConfig.light

    // Apply each CSS variable
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // Save to localStorage
    localStorage.setItem(THEME_KEY, theme)
  }, [theme, mounted])

  const setTheme = (newTheme: string) => {
    if (themes[newTheme]) {
      setThemeState(newTheme)
    }
  }

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeConfig: themes[theme] }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
