"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const getThemeIcon = (currentTheme: string | undefined) => {
    if (currentTheme === "light") return <Sun className="h-4 w-4" />
    if (currentTheme === "dark") return <Moon className="h-4 w-4" />
    return <Monitor className="h-4 w-4" />
  }

  const getThemeLabel = (currentTheme: string | undefined) => {
    return currentTheme ? currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1) : "System"
  }

  if (!mounted) {
    return (
      <Select disabled>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Theme" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-[120px]">
        <div className="flex items-center gap-2">
          {getThemeIcon(theme)}
          <SelectValue>
            {getThemeLabel(theme)}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="system">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span>System</span>
          </div>
        </SelectItem>
        <SelectItem value="light">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <span>Light</span>
          </div>
        </SelectItem>
        <SelectItem value="dark">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            <span>Dark</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

