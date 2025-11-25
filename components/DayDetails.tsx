"use client"

import { WorkoutLog } from "@/types/exercise"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface DayDetailsProps {
  date: Date | null
  workouts: WorkoutLog[]
  programs: Array<{ id: string; name: string }>
  exercises: Array<{ id: string; name: string }>
}

export function DayDetails({ date, workouts, programs, exercises }: DayDetailsProps) {
  if (!date) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full min-h-[400px]">
          <p className="text-muted-foreground text-center">
            Select a day to view details
          </p>
        </CardContent>
      </Card>
    )
  }

  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  if (workouts.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{dateStr}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center flex-1 min-h-[300px]">
          <p className="text-2xl font-semibold text-muted-foreground mb-2">
            Rest Day
          </p>
          <p className="text-sm text-muted-foreground text-center">
            No workouts recorded for this day
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{dateStr}</CardTitle>
        <div className="flex gap-2 flex-wrap mt-2">
          {workouts.map((workout, idx) => {
            const program = programs.find(p => p.id === workout.programId)
            return (
              <Badge key={idx} variant="secondary">
                {program?.name || `Program ${workout.programId.slice(-6)}`}
                {workout.week && ` - Week ${workout.week}`}
              </Badge>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto max-h-[calc(100vh-300px)]">
        {workouts.map((workout, workoutIdx) => {
          const program = programs.find(p => p.id === workout.programId)
          const programName = program?.name || `Program ${workout.programId.slice(-6)}`

          return (
            <div key={workoutIdx}>
              {workoutIdx > 0 && <Separator className="my-4" />}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{programName}</h3>
                  {workout.week && (
                    <Badge variant="outline">Week {workout.week}</Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {workout.exercises.map((exerciseLog, exerciseIdx) => {
                    const exercise = exercises.find(ex => ex.id === exerciseLog.exerciseId)
                    const exerciseName = exercise?.name || exerciseLog.exerciseId
                    const completedSets = exerciseLog.sets.filter(s => s.completed)

                    if (completedSets.length === 0) {
                      return null
                    }

                    return (
                      <div key={exerciseIdx} className="space-y-2">
                        <h4 className="font-semibold text-base">{exerciseName}</h4>
                        <div className="space-y-2">
                          {completedSets.map((set, setIdx) => {
                            const reps = set.reps ?? (set.repWeights?.length ?? 0)
                            const weight = set.weight ?? (
                              set.repWeights && set.repWeights.length > 0
                                ? (set.repWeights.reduce((a, b) => a + b, 0) / set.repWeights.length).toFixed(1)
                                : 0
                            )

                            return (
                              <div
                                key={setIdx}
                                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                              >
                                <Badge variant="outline" className="w-12 justify-center shrink-0">
                                  {setIdx + 1}
                                </Badge>
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-xs text-muted-foreground">Reps</div>
                                    <div className="font-semibold">{reps}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">Weight</div>
                                    <div className="font-semibold">{weight} lbs</div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

