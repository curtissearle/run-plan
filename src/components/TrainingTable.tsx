"use client";

import { TrainingPlan, Week, Run, Day } from "@/lib/planGenerator";
import { useState, useEffect, useMemo } from "react";
import React from "react";
import { createPortal } from "react-dom";
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
import { kmToMiles, milesToKm } from "@/lib/utils";

interface TrainingTableProps {
  plan: TrainingPlan;
  onUpdatePlan: (plan: TrainingPlan) => void;
  summary?: {
    weeks: number;
    raceDate: string | null;
    raceDistance: string | null;
  } | null;
  currentUnit?: "km" | "miles";
  onUnitChange?: (unit: "km" | "miles", convertedPlan: TrainingPlan) => void;
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
  currentUnit: "km" | "miles";
  onUpdateRun: (
    weekIndex: number,
    day: Day,
    runIndex: number,
    updates: {
      measurementType?: "distance" | "time";
      distance?: number;
      time?: number;
      description?: string;
    }
  ) => void;
  onUpdateNickname: (
    weekIndex: number,
    day: Day,
    runIndex: number,
    nickname: string
  ) => void;
  onRemoveRun: (weekIndex: number, day: Day, runIndex: number) => void;
  editingDescriptionId: string | null;
  onStartEditingDescription: (id: string) => void;
  onStopEditingDescription: () => void;
}

const DraggableWorkout = ({
  run,
  runIndex,
  weekIndex,
  day,
  canRemove,
  currentUnit,
  onUpdateRun,
  onUpdateNickname,
  onRemoveRun,
  editingDescriptionId,
  onStartEditingDescription,
  onStopEditingDescription,
}: DraggableWorkoutProps) => {
  const [isEditingNickname, setIsEditingNickname] = React.useState(false);
  const [nicknameValue, setNicknameValue] = React.useState(run.nickname || "");
  const [descriptionValue, setDescriptionValue] = React.useState(run.description || "");
  
  // Determine measurement type - default to "distance" for backward compatibility
  const measurementType = run.measurementType || (run.distance !== undefined ? "distance" : run.time !== undefined ? "time" : "distance");
  
  const descriptionId = run.id || `${weekIndex}-${day}-${runIndex}`;
  const isEditingDescription = editingDescriptionId === descriptionId;
  
  React.useEffect(() => {
    if (isEditingDescription) {
      setDescriptionValue(run.description || "");
    }
  }, [isEditingDescription, run.description]);

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

  const handleDescriptionSave = () => {
    onUpdateRun(weekIndex, day, runIndex, { description: descriptionValue });
    onStopEditingDescription();
  };

  const handleDescriptionCancel = () => {
    setDescriptionValue(run.description || "");
    onStopEditingDescription();
  };

  const handleMeasurementTypeChange = (newType: "distance" | "time") => {
    onUpdateRun(weekIndex, day, runIndex, { 
      measurementType: newType,
      // Clear the opposite field
      distance: newType === "distance" ? run.distance : undefined,
      time: newType === "time" ? run.time : undefined,
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`w-full p-2 rounded-lg text-center border ${colorClass} min-h-[100px] flex flex-col relative transition ${
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
      <div className="text-xs font-semibold mb-2">
        <div>{run.type}</div>
        {isEditingNickname ? (
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={nicknameValue}
              onChange={(e) => setNicknameValue(e.target.value)}
              className="w-full text-[10px] text-center border border-input rounded bg-background px-1 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
                className="h-5 px-2 text-[10px] bg-green-600 text-white hover:bg-green-500"
                aria-label="Save nickname"
              >
                ✓
              </Button>
              <Button
                onClick={handleNicknameCancel}
                variant="secondary"
                size="sm"
                className="h-5 px-2 text-[10px]"
                aria-label="Cancel"
              >
                ✕
              </Button>
            </div>
          </div>
        ) : (
          <button
            className="text-[10px] text-muted-foreground hover:text-foreground transition cursor-pointer mt-0.5 w-full"
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
      {run.type !== "Strength" ? (
        <div className="space-y-1.5 mb-2" onClick={(e) => e.stopPropagation()}>
          {/* Measurement Type Selector */}
          <select
            value={measurementType}
            onChange={(e) => handleMeasurementTypeChange(e.target.value as "distance" | "time")}
            className="w-full text-[10px] border border-input rounded-md bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="distance">Distance</option>
            <option value="time">Time (Min)</option>
          </select>
          
          {/* Distance or Time Input */}
          <div className="flex items-center justify-center gap-1">
            {measurementType === "distance" ? (
              <>
                <input
                  type="number"
                  value={run.distance && run.distance > 0 ? run.distance : ""}
                  onChange={(e) => {
                    const newDistance = Number(e.target.value);
                    onUpdateRun(weekIndex, day, runIndex, {
                      distance: isNaN(newDistance) || e.target.value === "" ? 0 : newDistance,
                    });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-transparent text-center font-bold text-sm text-foreground p-0 border-none focus:outline-none focus:ring-1 focus:ring-ring rounded"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  aria-label={`Distance in ${currentUnit === "km" ? "kilometers" : "miles"}`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {currentUnit === "km" ? "km" : "mi"}
                </span>
              </>
            ) : (
              <>
                <input
                  type="number"
                  value={run.time && run.time > 0 ? run.time : ""}
                  onChange={(e) => {
                    const newTime = Number(e.target.value);
                    onUpdateRun(weekIndex, day, runIndex, {
                      time: isNaN(newTime) || e.target.value === "" ? 0 : newTime,
                    });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-transparent text-center font-bold text-sm text-foreground p-0 border-none focus:outline-none focus:ring-1 focus:ring-ring rounded"
                  min="0"
                  step="1"
                  placeholder="0"
                  aria-label="Time in minutes"
                />
                <span className="text-[10px] text-muted-foreground">
                  MIN
                </span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-2 min-h-[20px]" />
      )}
      
      {/* Description Field */}
      <div className="mt-auto" onClick={(e) => e.stopPropagation()}>
        <button
          className="w-full text-[10px] text-muted-foreground hover:text-foreground transition cursor-pointer text-center px-2 py-1.5 rounded-md border border-border/50 bg-muted/30 hover:bg-muted/50 truncate"
          onClick={(e) => {
            e.stopPropagation();
            onStartEditingDescription(descriptionId);
          }}
          aria-label={run.description ? "Edit description" : "Add description"}
          title={run.description || "Add description"}
        >
          {run.description ? (
            <span className="block truncate">{run.description}</span>
          ) : (
            <span>Add Breakdown...</span>
          )}
        </button>
      </div>
      
      {/* Description Editor Modal */}
      {isEditingDescription && (
        <DescriptionEditor
          value={descriptionValue}
          onChange={setDescriptionValue}
          onSave={handleDescriptionSave}
          onCancel={handleDescriptionCancel}
        />
      )}
    </div>
  );
};

interface DescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const DescriptionEditor = ({
  value,
  onChange,
  onSave,
  onCancel,
}: DescriptionEditorProps) => {
  const [mounted, setMounted] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  React.useEffect(() => {
    if (mounted && textareaRef.current) {
      // Auto-resize textarea based on content
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`;
    }
  }, [value, mounted]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Editor */}
      <div 
        className="fixed z-[9999] bg-white dark:bg-card border border-border rounded-lg shadow-2xl p-4 min-w-[400px] max-w-[600px]"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-semibold mb-3 text-foreground">
          Edit Description:
        </div>
        
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm border border-input rounded-md bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-y-auto"
          placeholder="Run breakdown (e.g., 10-min easy, 5-min tempo x 3)"
          rows={6}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              onSave();
            } else if (e.key === "Escape") {
              onCancel();
            }
          }}
          style={{ maxHeight: "400px" }}
        />
        
        <div className="flex gap-2 mt-3 justify-end">
          <Button
            onClick={onSave}
            size="sm"
            className="h-8 px-4 text-sm bg-green-600 text-white hover:bg-green-500 font-medium"
          >
            Save
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            className="h-8 px-4 text-sm border-border"
          >
            Cancel
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
};

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (workout: {
    type: Run["type"];
    nickname?: string;
    measurementType?: "distance" | "time";
    distance?: number;
    time?: number;
    description?: string;
  }) => void;
  initialRun?: Run | null;
  currentUnit: "km" | "miles";
  position?: "top" | "bottom";
}

const WorkoutModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialRun,
  currentUnit,
  position = "bottom",
}: WorkoutModalProps) => {
  const [workoutType, setWorkoutType] = React.useState<Run["type"]>(
    initialRun?.type || "Easy"
  );
  const [nickname, setNickname] = React.useState(initialRun?.nickname || "");
  const [measurementType, setMeasurementType] = React.useState<"distance" | "time">(
    initialRun?.measurementType || (initialRun?.distance !== undefined ? "distance" : initialRun?.time !== undefined ? "time" : "distance")
  );
  const [distance, setDistance] = React.useState<number | undefined>(
    initialRun?.distance
  );
  const [time, setTime] = React.useState<number | undefined>(initialRun?.time);
  const [description, setDescription] = React.useState(initialRun?.description || "");

  React.useEffect(() => {
    if (initialRun) {
      setWorkoutType(initialRun.type);
      setNickname(initialRun.nickname || "");
      setMeasurementType(
        initialRun.measurementType || (initialRun.distance !== undefined ? "distance" : initialRun.time !== undefined ? "time" : "distance")
      );
      setDistance(initialRun.distance);
      setTime(initialRun.time);
      setDescription(initialRun.description || "");
    } else {
      // Reset for new workout
      setWorkoutType("Easy");
      setNickname("");
      setMeasurementType("distance");
      setDistance(undefined);
      setTime(undefined);
      setDescription("");
    }
  }, [initialRun, isOpen]);

  const workoutTypes: Run["type"][] = [
    "Easy",
    "Long",
    "Tempo",
    "Interval",
    "Strength",
    "Race",
  ];

  const handleSubmit = () => {
    onSubmit({
      type: workoutType,
      nickname: nickname || undefined,
      measurementType,
      distance: measurementType === "distance" ? distance : undefined,
      time: measurementType === "time" ? time : undefined,
      description: description || undefined,
    });
    onClose();
  };

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div 
        className="fixed z-[9999] bg-white dark:bg-card border border-border rounded-lg shadow-2xl p-4 min-w-[320px] max-w-[400px]"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-semibold mb-3 text-foreground">
          {initialRun ? "Edit Workout:" : "Add Workout:"}
        </div>
        
        <div className="space-y-3">
          {/* Type and Nickname */}
          <div className="flex gap-2">
            <select
              value={workoutType}
              onChange={(e) => setWorkoutType(e.target.value as Run["type"])}
              className="flex-1 text-sm border border-input rounded-md bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
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
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="flex-1 text-sm border border-input rounded-md bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
            />
          </div>

          {/* Measurement Type and Value */}
          {workoutType !== "Strength" && (
            <>
              <select
                value={measurementType}
                onChange={(e) => {
                  const newType = e.target.value as "distance" | "time";
                  setMeasurementType(newType);
                  if (newType === "distance") {
                    setTime(undefined);
                  } else {
                    setDistance(undefined);
                  }
                }}
                className="w-full text-sm border border-input rounded-md bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option value="distance">Distance</option>
                <option value="time">Time (Minutes)</option>
              </select>
              
              {measurementType === "distance" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0"
                    value={distance || ""}
                    onChange={(e) => setDistance(e.target.value ? Number(e.target.value) : undefined)}
                    className="flex-1 text-sm border border-input rounded-md bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    min="0"
                    step="0.1"
                  />
                  <span className="text-sm text-muted-foreground">
                    {currentUnit === "km" ? "km" : "mi"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0"
                    value={time || ""}
                    onChange={(e) => setTime(e.target.value ? Number(e.target.value) : undefined)}
                    className="flex-1 text-sm border border-input rounded-md bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    min="0"
                    step="1"
                  />
                  <span className="text-sm text-muted-foreground">MIN</span>
                </div>
              )}
            </>
          )}

          {/* Description */}
          <textarea
            placeholder="Run breakdown (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm border border-input rounded-md bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground resize-none"
            rows={2}
          />

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSubmit}
              size="sm"
              className="flex-1 text-sm bg-green-600 text-white hover:bg-green-500 font-medium"
            >
              {initialRun ? "Update" : "Add"}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="flex-1 text-sm border-border"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

interface RunCellProps {
  week: Week;
  day: Day;
  weekIndex: number;
  currentUnit: "km" | "miles";
  onUpdateRun: (
    weekIndex: number,
    day: Day,
    runIndex: number,
    updates: {
      measurementType?: "distance" | "time";
      distance?: number;
      time?: number;
      description?: string;
    }
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
    workout: {
      type: Run["type"];
      nickname?: string;
      measurementType?: "distance" | "time";
      distance?: number;
      time?: number;
      description?: string;
    }
  ) => void;
  onRemoveRun: (weekIndex: number, day: Day, runIndex: number) => void;
  modalId: string;
  openModalId: string | null;
  onOpenModal: (id: string) => void;
  onCloseModal: () => void;
  editingDescriptionId: string | null;
  onStartEditingDescription: (id: string) => void;
  onStopEditingDescription: () => void;
}

const RunCell = ({
  week,
  day,
  weekIndex,
  currentUnit,
  onUpdateRun,
  onUpdateNickname,
  onAddRun,
  onRemoveRun,
  modalId,
  openModalId,
  onOpenModal,
  onCloseModal,
  editingDescriptionId,
  onStartEditingDescription,
  onStopEditingDescription,
}: RunCellProps) => {
  const runs = Array.isArray(week.days[day])
    ? (week.days[day].filter(Boolean) as Run[])
    : [];
  const showWorkoutModal = openModalId === modalId;

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

  const handleWorkoutSubmit = (workout: {
    type: Run["type"];
    nickname?: string;
    measurementType?: "distance" | "time";
    distance?: number;
    time?: number;
    description?: string;
  }) => {
    // Add new run
    onAddRun(weekIndex, day, workout);
    onCloseModal();
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
        <div className="relative">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal(modalId);
            }}
            size="sm"
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-500"
          >
            + Add Workout
          </Button>
          {showWorkoutModal && (
            <WorkoutModal
              isOpen={true}
              onClose={onCloseModal}
              onSubmit={handleWorkoutSubmit}
              currentUnit={currentUnit}
              position="top"
            />
          )}
        </div>
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
            currentUnit={currentUnit}
            onUpdateRun={onUpdateRun}
            onUpdateNickname={onUpdateNickname}
            onRemoveRun={onRemoveRun}
            editingDescriptionId={editingDescriptionId}
            onStartEditingDescription={onStartEditingDescription}
            onStopEditingDescription={onStopEditingDescription}
          />
        ))}
        <div className="relative">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal(modalId);
            }}
            size="sm"
            className="w-full text-xs bg-green-600 text-white hover:bg-green-500"
          >
            + Add Workout
          </Button>
          {showWorkoutModal && (
            <WorkoutModal
              isOpen={true}
              onClose={onCloseModal}
              onSubmit={handleWorkoutSubmit}
              currentUnit={currentUnit}
              position="bottom"
            />
          )}
        </div>
      </div>
    </SortableContext>
  );
};

export default function TrainingTable({
  plan,
  onUpdatePlan,
  summary,
  currentUnit = "km",
  onUnitChange,
}: TrainingTableProps) {
  const [weeks, setWeeks] = useState<Week[]>(plan.weeks);
  const [activeRun, setActiveRun] = useState<Run | null>(null);
  const [openModalId, setOpenModalId] = useState<string | null>(null);
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);

  const handleUnitToggle = () => {
    if (!onUnitChange) return;
    
    const newUnit = currentUnit === "km" ? "miles" : "km";
    
    // Convert all distances in the plan
    const convertedWeeks = weeks.map((week) => {
      const convertedDays: Record<Day, Run[]> = {
        Mon: [],
        Tue: [],
        Wed: [],
        Thu: [],
        Fri: [],
        Sat: [],
        Sun: [],
      };
      
      let newWeeklyTotal = 0;
      
      Object.entries(week.days).forEach(([day, runs]) => {
        const dayKey = day as Day;
        convertedDays[dayKey] = runs.map((run) => {
          if (!run.distance) return run;
          
          let convertedDistance: number;
          if (currentUnit === "km" && newUnit === "miles") {
            convertedDistance = kmToMiles(run.distance);
          } else if (currentUnit === "miles" && newUnit === "km") {
            convertedDistance = milesToKm(run.distance);
          } else {
            convertedDistance = run.distance;
          }
          
          newWeeklyTotal += convertedDistance;
          
          return {
            ...run,
            distance: Math.round(convertedDistance * 10) / 10,
          };
        });
      });
      
      return {
        ...week,
        days: convertedDays,
        weeklyTotal: Math.round(newWeeklyTotal),
      };
    });
    
    const convertedPlan = { ...plan, weeks: convertedWeeks };
    setWeeks(convertedWeeks);
    onUpdatePlan(convertedPlan);
    onUnitChange(newUnit, convertedPlan);
  };

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
    updates: {
      measurementType?: "distance" | "time";
      distance?: number;
      time?: number;
      description?: string;
    }
  ) => {
    const updatedWeeks = weeks.map((week, index) => {
      if (index === weekIndex) {
        const updatedWeek = { ...week };
        const runs = [...updatedWeek.days[day]];

        if (runs[runIndex]) {
          const updatedRun = { ...runs[runIndex] };
          
          // Handle measurement type change - clear the opposite field
          if (updates.measurementType !== undefined) {
            updatedRun.measurementType = updates.measurementType;
            if (updates.measurementType === "distance") {
              updatedRun.time = undefined;
            } else if (updates.measurementType === "time") {
              updatedRun.distance = undefined;
            }
          }
          
          // Update distance or time
          if (updates.distance !== undefined) {
            updatedRun.distance = updates.distance;
          }
          if (updates.time !== undefined) {
            updatedRun.time = updates.time;
          }
          
          // Update description
          if (updates.description !== undefined) {
            updatedRun.description = updates.description;
          }
          
          runs[runIndex] = updatedRun;
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
    workout: {
      type: Run["type"];
      nickname?: string;
      measurementType?: "distance" | "time";
      distance?: number;
      time?: number;
      description?: string;
    }
  ) => {
    const updatedWeeks = weeks.map((week, index) => {
      if (index === weekIndex) {
        const updatedWeek = { ...week };
        const runs = [...updatedWeek.days[day]];

        const measurementType = workout.measurementType || "distance";
        const defaultDistance = workout.type === "Strength" ? 0 : workout.distance || 5;
        const defaultTime = workout.time || (measurementType === "time" ? 30 : undefined);

        runs.push({
          id: `${weekIndex}-${day}-${workout.type}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          type: workout.type,
          measurementType,
          distance: measurementType === "distance" ? defaultDistance : undefined,
          time: measurementType === "time" ? defaultTime : undefined,
          nickname: workout.nickname,
          description: workout.description,
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
                    {peakWeek.weeklyTotal} {currentUnit === "km" ? "km" : "mi"}
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
          {onUnitChange && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUnitToggle}
              className="ml-auto text-xs"
            >
              Switch to {currentUnit === "km" ? "Miles" : "KM"}
            </Button>
          )}
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
                          currentUnit={currentUnit}
                          onUpdateRun={handleUpdateRun}
                          onUpdateNickname={handleUpdateNickname}
                          onAddRun={handleAddRun}
                          onRemoveRun={handleRemoveRun}
                          modalId={`${weekIndex}-${day}`}
                          openModalId={openModalId}
                          onOpenModal={setOpenModalId}
                          onCloseModal={() => setOpenModalId(null)}
                          editingDescriptionId={editingDescriptionId}
                          onStartEditingDescription={setEditingDescriptionId}
                          onStopEditingDescription={() => setEditingDescriptionId(null)}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="p-2 sm:p-3 text-center font-bold text-sm sm:text-base">
                      <div className="flex items-center justify-center h-[70px]">
                        {week.weeklyTotal} {currentUnit === "km" ? "km" : "mi"}
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
              {activeRun.type !== "Strength" && (
                <span className="text-sm font-bold text-center">
                  {(() => {
                    const measurementType = activeRun.measurementType || (activeRun.distance !== undefined ? "distance" : activeRun.time !== undefined ? "time" : "distance");
                    if (measurementType === "time") {
                      return `${activeRun.time || 0} MIN`;
                    }
                    return `${activeRun.distance || 0}${currentUnit === "km" ? "km" : "mi"}`;
                  })()}
                </span>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
