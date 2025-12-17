"use client";

import { TrainingPlan, Week, Run, Day } from "@/lib/planGenerator";
import { useState, useEffect, useMemo } from "react";
import React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TrainingTableProps {
  plan: TrainingPlan;
  onUpdatePlan: (plan: TrainingPlan) => void;
  summary?: {
    weeks: number;
    raceDate: string | null;
    raceDistance: string | null;
  } | null;
}

const runTypeColors: Record<Run["type"], string> = {
  Easy: "bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-200",
  Long: "bg-green-500/20 border-green-500/30 text-green-700 dark:text-green-200",
  Tempo:
    "bg-yellow-500/20 border-yellow-500/30 text-yellow-700 dark:text-yellow-200",
  Interval:
    "bg-purple-500/20 border-purple-500/30 text-purple-700 dark:text-purple-200",
  Strength:
    "bg-orange-500/20 border-orange-500/30 text-orange-700 dark:text-orange-200",
  Race: "bg-red-500/20 border-red-500/30 text-red-700 dark:text-red-200",
  Rest: "bg-muted/50 border-border text-muted-foreground",
};

const days: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Centralized helper to recalculate weekly total
const recalculateWeeklyTotal = (week: Week): Week => {
  const total = Math.round(
    Object.values(week.days).reduce((total, dayRuns) => {
      if (!Array.isArray(dayRuns)) return total;
      const safeRuns = dayRuns.filter(Boolean) as Run[];
      return (
        total +
        safeRuns.reduce(
          (dayTotal, run) =>
            dayTotal + (typeof run.distance === "number" ? run.distance : 0),
          0
        )
      );
    }, 0)
  );
  return { ...week, weeklyTotal: total };
};

interface DraggableWorkoutProps {
  run: Run;
  runIndex: number;
  weekIndex: number;
  day: Day;
  canRemove: boolean;
  onUpdateRun: (
    weekIndex: number,
    day: Day,
    runIndex: number,
    newDistance: number
  ) => void;
  onUpdateNickname: (
    weekIndex: number,
    day: Day,
    runIndex: number,
    nickname: string
  ) => void;
  onRemoveRun: (weekIndex: number, day: Day, runIndex: number) => void;
}

const DraggableWorkout = ({
  run,
  runIndex,
  weekIndex,
  day,
  canRemove,
  onUpdateRun,
  onUpdateNickname,
  onRemoveRun,
}: DraggableWorkoutProps) => {
  const [isEditingNickname, setIsEditingNickname] = React.useState(false);
  const [nicknameValue, setNicknameValue] = React.useState(run.nickname || "");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: run.id || `${weekIndex}-${day}-${runIndex}`,
    data: {
      type: "workout",
      run,
      weekIndex,
      day,
      runIndex,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colorClass = runTypeColors[run.type] || runTypeColors.Rest;

  const handleNicknameSave = () => {
    onUpdateNickname(weekIndex, day, runIndex, nicknameValue);
    setIsEditingNickname(false);
  };

  const handleNicknameCancel = () => {
    setNicknameValue(run.nickname || "");
    setIsEditingNickname(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`w-full p-1.5 sm:p-2 rounded-lg text-center border ${colorClass} min-h-[60px] flex flex-col justify-center relative transition ${
        isDragging ? "z-50 scale-105 shadow-xl" : "hover:scale-[1.02]"
      }`}
    >
      {/* Drag Handle */}
      <div
        {...listeners}
        className="absolute top-1 left-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition"
        aria-label="Drag to reorder"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
          className="opacity-60"
        >
          <circle cx="2" cy="2" r="1" />
          <circle cx="6" cy="2" r="1" />
          <circle cx="10" cy="2" r="1" />
          <circle cx="2" cy="6" r="1" />
          <circle cx="6" cy="6" r="1" />
          <circle cx="10" cy="6" r="1" />
          <circle cx="2" cy="10" r="1" />
          <circle cx="6" cy="10" r="1" />
          <circle cx="10" cy="10" r="1" />
        </svg>
      </div>

      {canRemove && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveRun(weekIndex, day, runIndex);
          }}
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
          aria-label="Remove workout"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path
              d="M9 3L3 9M3 3l6 6"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </Button>
      )}
      <div className="text-[10px] sm:text-xs font-semibold mb-1">
        <div>{run.type}</div>
        {isEditingNickname ? (
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={nicknameValue}
              onChange={(e) => setNicknameValue(e.target.value)}
              className="w-full text-xs text-center border border-input rounded bg-background px-1 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Nickname"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleNicknameSave();
                } else if (e.key === "Escape") {
                  handleNicknameCancel();
                }
              }}
            />
            <div className="flex gap-1 mt-1 justify-center">
              <Button
                onClick={handleNicknameSave}
                size="sm"
                className="h-6 px-2 text-xs bg-green-600 text-white hover:bg-green-500"
                aria-label="Save nickname"
              >
                ✓
              </Button>
              <Button
                onClick={handleNicknameCancel}
                variant="secondary"
                size="sm"
                className="h-6 px-2 text-xs"
                aria-label="Cancel"
              >
                ✕
              </Button>
            </div>
          </div>
        ) : (
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition cursor-pointer mt-0.5"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingNickname(true);
            }}
            aria-label={run.nickname ? "Edit nickname" : "Add nickname"}
          >
            {run.nickname ? `(${run.nickname})` : "✎"}
          </button>
        )}
      </div>
      <input
        type="number"
        value={run.distance && run.distance > 0 ? run.distance : ""}
        onChange={(e) => {
          const newDistance = Number(e.target.value);
          onUpdateRun(
            weekIndex,
            day,
            runIndex,
            isNaN(newDistance) || e.target.value === "" ? 0 : newDistance
          );
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-transparent text-center font-bold text-xs sm:text-sm text-foreground p-0 border-none focus:outline-none focus:ring-1 focus:ring-ring rounded"
        min="0"
        step="1"
        placeholder="0"
        aria-label="Distance in kilometers"
      />
      <span className="text-[10px] sm:text-xs text-muted-foreground">km</span>
    </div>
  );
};

interface RunCellProps {
  week: Week;
  day: Day;
  weekIndex: number;
  onUpdateRun: (
    weekIndex: number,
    day: Day,
    runIndex: number,
    newDistance: number
  ) => void;
  onUpdateNickname: (
    weekIndex: number,
    day: Day,
    runIndex: number,
    nickname: string
  ) => void;
  onAddRun: (
    weekIndex: number,
    day: Day,
    workoutType?: Run["type"],
    nickname?: string
  ) => void;
  onRemoveRun: (weekIndex: number, day: Day, runIndex: number) => void;
}

const RunCell = ({
  week,
  day,
  weekIndex,
  onUpdateRun,
  onUpdateNickname,
  onAddRun,
  onRemoveRun,
}: RunCellProps) => {
  const runs = Array.isArray(week.days[day])
    ? (week.days[day].filter(Boolean) as Run[])
    : [];
  const [showWorkoutSelector, setShowWorkoutSelector] = React.useState(false);
  const [newWorkoutType, setNewWorkoutType] =
    React.useState<Run["type"]>("Easy");
  const [newWorkoutNickname, setNewWorkoutNickname] = React.useState("");

  const workoutTypes: Run["type"][] = [
    "Easy",
    "Long",
    "Tempo",
    "Interval",
    "Strength",
    "Race",
  ];

  // Always call useDroppable, regardless of runs
  const emptyDroppable = useDroppable({
    id: `${weekIndex}-${day}-empty`,
    data: {
      type: "empty-day",
      weekIndex,
      day,
    },
  });
  const dayDroppable = useDroppable({
    id: `${weekIndex}-${day}-day`,
    data: {
      type: "day",
      weekIndex,
      day,
    },
  });

  const handleAddWorkout = () => {
    onAddRun(weekIndex, day, newWorkoutType, newWorkoutNickname || undefined);
    setShowWorkoutSelector(false);
    setNewWorkoutType("Easy");
    setNewWorkoutNickname("");
  };

  // Rest day - no runs scheduled
  if (!runs || runs.length === 0) {
    const { isOver, setNodeRef } = emptyDroppable;
    return (
      <div
        ref={setNodeRef}
        className={`w-full p-2 rounded-lg text-center border transition ${
          isOver
            ? "bg-blue-500/20 border-blue-500/50 border-2"
            : "bg-muted/50 border-border"
        } min-h-[70px] flex flex-col items-center justify-center relative`}
      >
        <span className="text-sm text-muted-foreground mb-2">
          {isOver ? "Drop workout here" : "Rest"}
        </span>
        {!showWorkoutSelector ? (
          <Button
            onClick={() => setShowWorkoutSelector(true)}
            size="sm"
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-500"
          >
            + Add Workout
          </Button>
        ) : (
          <div className="absolute z-10 bg-card border border-border rounded-lg shadow-xl p-3 min-w-[180px]">
            <div className="text-xs font-semibold mb-2 text-foreground">
              Add Workout:
            </div>
            <select
              value={newWorkoutType}
              onChange={(e) => setNewWorkoutType(e.target.value as Run["type"])}
              className="w-full mb-2 text-xs border border-input rounded bg-background text-foreground px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {workoutTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Nickname (optional)"
              value={newWorkoutNickname}
              onChange={(e) => setNewWorkoutNickname(e.target.value)}
              className="w-full mb-2 text-xs border border-input rounded bg-background text-foreground px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex gap-1">
              <Button
                onClick={handleAddWorkout}
                size="sm"
                className="flex-1 text-xs bg-green-600 text-white hover:bg-green-500"
              >
                Add
              </Button>
              <Button
                onClick={() => setShowWorkoutSelector(false)}
                variant="secondary"
                size="sm"
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const runIds = runs.map((run, idx) => run.id || `${weekIndex}-${day}-${idx}`);

  const { isOver, setNodeRef: setDroppableRef } = dayDroppable;

  return (
    <SortableContext items={runIds} strategy={verticalListSortingStrategy}>
      <div
        ref={setDroppableRef}
        className={`w-full p-2 space-y-2 relative min-h-[70px] rounded-lg transition ${
          isOver
            ? "bg-blue-500/10 border-2 border-blue-500/50 border-dashed"
            : ""
        }`}
      >
        {runs.map((run, runIndex) => (
          <DraggableWorkout
            key={run.id || `${weekIndex}-${day}-${runIndex}`}
            run={run}
            runIndex={runIndex}
            weekIndex={weekIndex}
            day={day}
            canRemove={true}
            onUpdateRun={onUpdateRun}
            onUpdateNickname={onUpdateNickname}
            onRemoveRun={onRemoveRun}
          />
        ))}
        {!showWorkoutSelector ? (
          <Button
            onClick={() => setShowWorkoutSelector(true)}
            size="sm"
            className="w-full text-xs bg-green-600 text-white hover:bg-green-500"
          >
            + Add Workout
          </Button>
        ) : (
          <div className="absolute z-10 bg-card border border-border rounded-lg shadow-xl p-3 min-w-[180px] top-full left-0 mt-1">
            <div className="text-xs font-semibold mb-2 text-foreground">
              Add Workout:
            </div>
            <select
              value={newWorkoutType}
              onChange={(e) => setNewWorkoutType(e.target.value as Run["type"])}
              className="w-full mb-2 text-xs border border-input rounded bg-background text-foreground px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {workoutTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Nickname (optional)"
              value={newWorkoutNickname}
              onChange={(e) => setNewWorkoutNickname(e.target.value)}
              className="w-full mb-2 text-xs border border-input rounded bg-background text-foreground px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex gap-1">
              <Button
                onClick={handleAddWorkout}
                size="sm"
                className="flex-1 text-xs bg-green-600 text-white hover:bg-green-500"
              >
                Add
              </Button>
              <Button
                onClick={() => setShowWorkoutSelector(false)}
                variant="secondary"
                size="sm"
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </SortableContext>
  );
};

export default function TrainingTable({
  plan,
  onUpdatePlan,
  summary,
}: TrainingTableProps) {
  const [weeks, setWeeks] = useState<Week[]>(plan.weeks);
  const [activeRun, setActiveRun] = useState<Run | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setWeeks(plan.weeks);
  }, [plan]);

  // Calculate peak week
  const peakWeek = useMemo(() => {
    if (weeks.length === 0) return null;
    return weeks.reduce((max, week) =>
      week.weeklyTotal > max.weeklyTotal ? week : max
    );
  }, [weeks]);

  const handleUpdateRun = (
    weekIndex: number,
    day: Day,
    runIndex: number,
    newDistance: number
  ) => {
    const updatedWeeks = weeks.map((week, index) => {
      if (index === weekIndex) {
        const updatedWeek = { ...week };
        const runs = [...updatedWeek.days[day]];

        if (runs[runIndex]) {
          runs[runIndex] = { ...runs[runIndex], distance: newDistance };
          updatedWeek.days[day] = runs;
          return recalculateWeeklyTotal(updatedWeek);
        }

        return updatedWeek;
      }
      return week;
    });

    setWeeks(updatedWeeks);
    onUpdatePlan({ ...plan, weeks: updatedWeeks });
  };

  const handleUpdateNickname = (
    weekIndex: number,
    day: Day,
    runIndex: number,
    nickname: string
  ) => {
    const updatedWeeks = weeks.map((week, index) => {
      if (index === weekIndex) {
        const updatedWeek = { ...week };
        const runs = [...updatedWeek.days[day]];

        if (runs[runIndex]) {
          runs[runIndex] = {
            ...runs[runIndex],
            nickname: nickname || undefined,
          };
          updatedWeek.days[day] = runs;
        }

        return updatedWeek;
      }
      return week;
    });

    setWeeks(updatedWeeks);
    onUpdatePlan({ ...plan, weeks: updatedWeeks });
  };

  const handleAddRun = (
    weekIndex: number,
    day: Day,
    workoutType: Run["type"] = "Easy",
    nickname?: string
  ) => {
    const updatedWeeks = weeks.map((week, index) => {
      if (index === weekIndex) {
        const updatedWeek = { ...week };
        const runs = [...updatedWeek.days[day]];

        const defaultDistance = workoutType === "Strength" ? 0 : 5;
        runs.push({
          id: `${weekIndex}-${day}-${workoutType}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          type: workoutType,
          distance: defaultDistance,
          nickname: nickname,
        });
        updatedWeek.days[day] = runs;

        return recalculateWeeklyTotal(updatedWeek);
      }
      return week;
    });

    setWeeks(updatedWeeks);
    onUpdatePlan({ ...plan, weeks: updatedWeeks });
  };

  const handleRemoveRun = (weekIndex: number, day: Day, runIndex: number) => {
    const updatedWeeks = weeks.map((week, index) => {
      if (index === weekIndex) {
        const updatedWeek = { ...week };
        const runs = [...updatedWeek.days[day]];

        runs.splice(runIndex, 1);
        updatedWeek.days[day] = runs;

        return recalculateWeeklyTotal(updatedWeek);
      }
      return week;
    });

    setWeeks(updatedWeeks);
    onUpdatePlan({ ...plan, weeks: updatedWeeks });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    if (activeData?.type === "workout") {
      setActiveRun(activeData.run);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveRun(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || activeData.type !== "workout") return;

    const activeWeekIndex = activeData.weekIndex as number;
    const activeDay = activeData.day as Day;
    const activeRunIndex = activeData.runIndex as number;

    // Handle dropping on another workout (reordering within a day)
    if (overData?.type === "workout") {
      const overWeekIndex = overData.weekIndex as number;
      const overDay = overData.day as Day;
      const overRunIndex = overData.runIndex as number;

      if (
        activeWeekIndex === overWeekIndex &&
        activeDay === overDay &&
        activeRunIndex !== overRunIndex
      ) {
        // Reorder within the same day
        const updatedWeeks = weeks.map((week, weekIndex) => {
          if (weekIndex === activeWeekIndex) {
            const updatedWeek = { ...week };
            const runs = [...updatedWeek.days[activeDay]];
            const [movedRun] = runs.splice(activeRunIndex, 1);
            runs.splice(overRunIndex, 0, movedRun);
            updatedWeek.days[activeDay] = runs;
            return updatedWeek;
          }
          return week;
        });

        setWeeks(updatedWeeks);
        onUpdatePlan({ ...plan, weeks: updatedWeeks });
      } else if (activeWeekIndex !== overWeekIndex || activeDay !== overDay) {
        // Move between days or weeks
        moveWorkout(
          activeWeekIndex,
          activeDay,
          activeRunIndex,
          overWeekIndex,
          overDay,
          overRunIndex
        );
      }
    }
    // Handle dropping on an empty day
    else if (overData?.type === "empty-day") {
      const overWeekIndex = overData.weekIndex as number;
      const overDay = overData.day as Day;

      if (activeWeekIndex !== overWeekIndex || activeDay !== overDay) {
        // Move to empty day (append at the end)
        moveWorkout(
          activeWeekIndex,
          activeDay,
          activeRunIndex,
          overWeekIndex,
          overDay,
          0
        );
      }
    }
    // Handle dropping on a day container (with existing workouts)
    else if (overData?.type === "day") {
      const overWeekIndex = overData.weekIndex as number;
      const overDay = overData.day as Day;

      if (activeWeekIndex !== overWeekIndex || activeDay !== overDay) {
        // Move to the end of the day
        const targetDay = weeks[overWeekIndex]?.days[overDay];
        const targetIndex = targetDay ? targetDay.length : 0;
        moveWorkout(
          activeWeekIndex,
          activeDay,
          activeRunIndex,
          overWeekIndex,
          overDay,
          targetIndex
        );
      }
    }
  };

  const moveWorkout = (
    fromWeekIndex: number,
    fromDay: Day,
    fromRunIndex: number,
    toWeekIndex: number,
    toDay: Day,
    toRunIndex: number
  ) => {
    const updatedWeeks = weeks.map((week, weekIndex) => {
      const updatedWeek = { ...week };

      // Remove from source
      if (weekIndex === fromWeekIndex) {
        const fromRuns = [...updatedWeek.days[fromDay]];
        const [movedRun] = fromRuns.splice(fromRunIndex, 1);
        updatedWeek.days[fromDay] = fromRuns;

        // Recalculate weekly total for source week
        const sourceWeek = recalculateWeeklyTotal(updatedWeek);

        // If moving within the same week, add to destination
        if (fromWeekIndex === toWeekIndex) {
          const toRuns = [...sourceWeek.days[toDay]];
          toRuns.splice(toRunIndex, 0, movedRun);
          sourceWeek.days[toDay] = toRuns;

          // Recalculate weekly total again
          return recalculateWeeklyTotal(sourceWeek);
        }

        return sourceWeek;
      }

      // Add to destination (if different week)
      if (weekIndex === toWeekIndex && fromWeekIndex !== toWeekIndex) {
        const sourceWeek = weeks[fromWeekIndex];
        const movedRun = sourceWeek.days[fromDay][fromRunIndex];
        const toRuns = [...updatedWeek.days[toDay]];
        toRuns.splice(toRunIndex, 0, movedRun);
        updatedWeek.days[toDay] = toRuns;

        // Recalculate weekly total for destination week
        return recalculateWeeklyTotal(updatedWeek);
      }

      return updatedWeek;
    });

    setWeeks(updatedWeeks);
    onUpdatePlan({ ...plan, weeks: updatedWeeks });
  };

  const formatRaceDistance = (distance: string | null): string => {
    if (!distance) return "Unknown";
    const map: Record<string, string> = {
      "5k": "5K",
      "10k": "10K",
      half: "Half Marathon",
      full: "Full Marathon",
      custom: "Custom",
    };
    return map[distance] || distance;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Summary Bar */}
        {summary && (
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Weeks:</span>
                <span className="font-semibold text-foreground">
                  {summary.weeks}
                </span>
              </div>
              {summary.raceDate && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Race:</span>
                  <span className="font-semibold text-foreground">
                    {new Date(summary.raceDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              {summary.raceDistance && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="font-semibold text-foreground">
                    {formatRaceDistance(summary.raceDistance)}
                  </span>
                </div>
              )}
              {peakWeek && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Peak week:</span>
                  <span className="font-semibold text-foreground">
                    {peakWeek.weeklyTotal} km
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Color Legend - Single Row Pills */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-background/95 backdrop-blur-sm py-3 border-b border-border mb-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Legend:
          </span>
          {Object.entries(runTypeColors)
            .filter(([type]) => type !== "Rest")
            .map(([type, colorClass]) => (
              <div
                key={type}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 ${colorClass}`}
              >
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    type === "Easy"
                      ? "bg-blue-500"
                      : type === "Long"
                      ? "bg-green-500"
                      : type === "Tempo"
                      ? "bg-yellow-500"
                      : type === "Interval"
                      ? "bg-purple-500"
                      : type === "Strength"
                      ? "bg-orange-500"
                      : "bg-red-500"
                  }`}
                />
                <span className="text-xs font-medium">{type}</span>
              </div>
            ))}
        </div>

        {/* Training Table */}
        <div className="rounded-xl border bg-card overflow-hidden w-full">
          <div className="w-full overflow-hidden">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center" style={{ width: "10%" }}>
                    Week
                  </TableHead>
                  {days.map((day) => (
                    <TableHead
                      key={day}
                      className="text-center"
                      style={{ width: "12%" }}
                    >
                      {day}
                    </TableHead>
                  ))}
                  <TableHead className="text-center" style={{ width: "6%" }}>
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeks.map((week, weekIndex) => (
                  <TableRow
                    key={week.week}
                    className="hover:bg-muted/40 transition"
                  >
                    <TableCell className="p-2 sm:p-3 text-center font-semibold">
                      <div className="flex flex-col items-center justify-center h-[70px]">
                        <div className="text-xs sm:text-sm">
                          Week {week.week}
                        </div>
                        <div className="mt-1 text-[10px] sm:text-xs text-muted-foreground">
                          {new Date(week.startDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {days.map((day) => (
                      <TableCell key={day} className="p-1 sm:p-2 align-top">
                        <RunCell
                          week={week}
                          day={day}
                          weekIndex={weekIndex}
                          onUpdateRun={handleUpdateRun}
                          onUpdateNickname={handleUpdateNickname}
                          onAddRun={handleAddRun}
                          onRemoveRun={handleRemoveRun}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="p-2 sm:p-3 text-center font-bold text-sm sm:text-base">
                      <div className="flex items-center justify-center h-[70px]">
                        {week.weeklyTotal}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DragOverlay>
          {activeRun ? (
            <div
              className={`w-full p-2 rounded-lg text-center border ${
                runTypeColors[activeRun.type] || runTypeColors.Rest
              } min-h-[60px] flex flex-col justify-center opacity-90 shadow-xl`}
            >
              <span className="text-xs font-semibold mb-1">
                {activeRun.type}
                {activeRun.nickname && (
                  <span className="block text-xs opacity-80 mt-0.5">
                    ({activeRun.nickname})
                  </span>
                )}
              </span>
              <span className="text-sm font-bold text-center">
                {activeRun.distance || 0}km
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
