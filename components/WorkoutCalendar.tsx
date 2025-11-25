"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { DayButton } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface WorkoutDayData {
  workouts: number
  exercises: number
  workoutDetails: Array<{ programName: string; dayName: string; week?: string }>
}

interface WorkoutCalendarProps {
  month?: Date
  onMonthChange?: (date: Date) => void
  workoutDays?: Map<string, WorkoutDayData>
  onDayClick?: (date: Date) => void
  selectedDate?: Date | null
  className?: string
}

function WorkoutDayButton({
  className,
  day,
  modifiers,
  workoutData,
  onDayClick,
  ...props
}: React.ComponentProps<typeof DayButton> & {
  workoutData?: WorkoutDayData
  onDayClick?: (date: Date) => void
}) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const hasWorkout = workoutData && workoutData.workouts > 0
  const isToday = modifiers.today
  const isOutside = modifiers.outside

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      onClick={() => onDayClick?.(day.date)}
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-has-workout={hasWorkout}
      className={cn(
        "relative flex aspect-square w-full min-h-[70px] md:min-h-[85px] lg:min-h-[100px] max-w-full flex-col items-start justify-start gap-1 p-1.5 md:p-2 text-left font-normal transition-all overflow-hidden",
        "hover:bg-accent hover:text-accent-foreground hover:scale-[1.02]",
        "focus:bg-accent focus:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isToday && "bg-accent/50 font-semibold ring-2 ring-primary/20",
        hasWorkout && "bg-primary/10 hover:bg-primary/20 border-2 border-primary/40 shadow-sm",
        isOutside && "text-muted-foreground/50 opacity-60",
        "data-[selected-single=true]:bg-primary/20 data-[selected-single=true]:text-foreground data-[selected-single=true]:border-2 data-[selected-single=true]:border-primary data-[selected-single=true]:ring-2 data-[selected-single=true]:ring-primary/30",
        "data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground",
        "data-[range-start=true]:bg-primary/20 data-[range-start=true]:text-foreground data-[range-start=true]:border-2 data-[range-start=true]:border-primary",
        "data-[range-end=true]:bg-primary/20 data-[range-end=true]:text-foreground data-[range-end=true]:border-2 data-[range-end=true]:border-primary",
        className
      )}
      {...props}
    >
      <span className={cn(
        "text-xs md:text-sm font-semibold leading-none",
        isToday && !modifiers.selected && "text-primary",
        modifiers.selected && "text-foreground"
      )}>
        {day.date.getDate()}
      </span>
      {hasWorkout && workoutData && (
        <div className="flex-1 flex flex-col justify-start w-full gap-0.5 overflow-hidden mt-1">
          <div className={cn(
            "text-[8px] md:text-[10px] font-semibold truncate leading-tight",
            modifiers.selected ? "text-foreground" : "text-primary"
          )}>
            {workoutData.workoutDetails[0]?.programName || `${workoutData.workouts} workout${workoutData.workouts > 1 ? 's' : ''}`}
          </div>
          {workoutData.workoutDetails[0]?.dayName && (
            <div className={cn(
              "text-[7px] md:text-[9px] truncate leading-tight font-medium",
              modifiers.selected ? "text-foreground/80" : "text-primary/80"
            )}>
              {workoutData.workoutDetails[0].dayName}
              {workoutData.workoutDetails[0].week && (
                <span className="ml-1 font-bold">W{workoutData.workoutDetails[0].week}</span>
              )}
            </div>
          )}
          {workoutData.workouts > 1 && (
            <div className={cn(
              "text-[7px] md:text-[9px] font-semibold mt-0.5",
              modifiers.selected ? "text-foreground/70" : "text-primary/70"
            )}>
              +{workoutData.workouts - 1} more
            </div>
          )}
        </div>
      )}
    </Button>
  )
}

export function WorkoutCalendar({
  month,
  onMonthChange,
  workoutDays = new Map(),
  onDayClick,
  selectedDate,
  className
}: WorkoutCalendarProps) {
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(month || new Date())

  React.useEffect(() => {
    if (month) {
      setSelectedMonth(month)
    }
  }, [month])

  const handleMonthChange = (date: Date) => {
    setSelectedMonth(date)
    onMonthChange?.(date)
  }

  const goToPreviousMonth = () => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    handleMonthChange(newDate)
  }

  const goToNextMonth = () => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    handleMonthChange(newDate)
  }

  const goToToday = () => {
    handleMonthChange(new Date())
  }

  const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  
  const today = new Date()
  const isCurrentMonth = selectedMonth.getMonth() === today.getMonth() && 
                        selectedMonth.getFullYear() === today.getFullYear()

  return (
    <div className={cn("w-full flex flex-col items-center", className)}>
      {/* Month Navigation */}
      <div className="flex items-center justify-between w-full max-w-3xl mb-3 px-2">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousMonth}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{monthName}</h2>
          {!isCurrentMonth && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-7 text-xs"
            >
              Today
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextMonth}
          className="h-8 w-8"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Calendar */}
      <div className="w-full max-w-3xl mx-auto">
        <Calendar
          month={selectedMonth}
          onMonthChange={handleMonthChange}
          mode="single"
          selected={selectedDate || undefined}
          onSelect={(date) => {
            if (date) {
              onDayClick?.(date);
            }
          }}
          captionLayout="buttons"
          className="w-full [--cell-size:clamp(2rem,3vw,3rem)]"
          classNames={{
            root: "w-full",
            months: "w-full",
            month: "w-full",
            nav: "hidden",
            month_caption: "hidden",
            caption_label: "hidden",
            button_previous: "hidden",
            button_next: "hidden",
            table: "w-full border-separate border-spacing-1 md:border-spacing-1.5 table-fixed",
            weekdays: "w-full",
            weekday: "text-center text-xs font-semibold text-muted-foreground py-2 md:py-3 px-1 flex-1 min-w-0",
            week: "w-full",
            day: "w-[14.28%] p-0 align-top",
          }}
          components={{
            DayButton: (props) => {
              const dateKey = props.day.date.toISOString().split('T')[0]
              const workoutData = workoutDays.get(dateKey)
              return (
                <WorkoutDayButton
                  {...props}
                  workoutData={workoutData}
                  onDayClick={onDayClick}
                />
              )
            },
          }}
          modifiersClassNames={{
            today: "bg-accent/50",
          }}
        />
      </div>
    </div>
  )
}

