"use client";

import * as z from "zod";
import { TrainingPlan, Run, Day } from "./planGenerator";

export const TRAINING_PLAN_SCHEMA_VERSION = "1.0.0";

const runTypeEnum = z.enum([
  "Rest",
  "Easy",
  "Long",
  "Interval",
  "Tempo",
  "Race",
  "Strength",
]);

const runSchema = z
  .object({
    id: z.string().optional(),
    type: runTypeEnum,
    measurementType: z.enum(["distance", "time"]).optional(),
    distance: z.number().optional(),
    time: z.number().optional(),
    notes: z.string().optional(),
    nickname: z.string().optional(),
    description: z.string().optional(),
  })
  .refine(
    (data) => {
      // If measurementType is provided, ensure either distance or time is set (but not both)
      if (data.measurementType === "distance") {
        return data.distance !== undefined && data.distance !== null;
      }
      if (data.measurementType === "time") {
        return data.time !== undefined && data.time !== null;
      }
      // If measurementType is not provided, infer from presence of distance or time
      // For backward compatibility, allow either distance or time
      return true;
    },
    {
      message: "When measurementType is 'distance', distance must be set. When measurementType is 'time', time must be set.",
    }
  )
  .transform((data) => {
    // Backward compatibility: infer measurementType from presence of distance or time
    if (!data.measurementType) {
      if (data.distance !== undefined && data.distance !== null) {
        return { ...data, measurementType: "distance" as const };
      }
      if (data.time !== undefined && data.time !== null) {
        return { ...data, measurementType: "time" as const };
      }
    }
    return data;
  });

// Strict day key schema – only allow valid Day values
const dayKeySchema = z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

const weekSchema = z
  .object({
    week: z.number(),
    startDate: z.string(),
    // Record with Day keys and arrays of runs as values
    // Accept arrays that may contain nulls, but transform to filter them out
    days: z.record(
      dayKeySchema,
      z
        .array(z.union([runSchema, z.null()]))
        .transform((arr) => arr.filter((item): item is z.infer<typeof runSchema> => item !== null))
    ),
    weeklyTotal: z.number(),
  })
  .transform((week) => ({
    ...week,
    // Double-check: ensure no nulls slipped through
    days: Object.fromEntries(
      Object.entries(week.days).map(([day, runs]) => [
        day,
        Array.isArray(runs) ? runs.filter((run) => run !== null && run !== undefined) : [],
      ])
    ) as Record<Day, Run[]>,
  }));

export const planSettingsSchema = z.object({
  todayDate: z.string(),
  raceDate: z.string(),
  raceDistance: z.string(),
  customRaceDistance: z.number().optional(),
  unit: z.enum(["km", "miles"]).default("km"),
  trainingDays: z.array(
    z.object({
      day: z.string(),
      workouts: z.array(
        z.object({
          runType: z.string(),
          nickname: z.string().optional(),
        })
      ),
    })
  ),
});

export type PlanSettings = z.infer<typeof planSettingsSchema>;

export const trainingPlanSchema = z.object({
  version: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  source: z.enum(["generated", "imported", "edited"]),
  settings: planSettingsSchema,
  plan: z.object({
    weeks: z.array(weekSchema),
  }),
});

export type TrainingPlanSchema = z.infer<typeof trainingPlanSchema>;

// Helper function to clean null values from plan data
function cleanPlanData(plan: TrainingPlan): TrainingPlan {
  return {
    weeks: plan.weeks.map((week) => ({
      ...week,
      days: Object.fromEntries(
        Object.entries(week.days).map(([day, runs]) => [
          day,
          Array.isArray(runs) ? runs.filter((run) => run !== null && run !== undefined) : [],
        ])
      ) as Record<Day, Run[]>,
    })),
  };
}

export function createSchemaFromPlan(args: {
  settings: PlanSettings;
  plan: TrainingPlan;
  source?: TrainingPlanSchema["source"];
}): TrainingPlanSchema {
  const now = new Date().toISOString();
  // Clean the plan data to remove any null values before creating schema
  const cleanedPlan = cleanPlanData(args.plan);
  return {
    version: TRAINING_PLAN_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    source: args.source ?? "generated",
    settings: args.settings,
    plan: cleanedPlan,
  };
}

export function updateSchemaAfterEdit(
  schema: TrainingPlanSchema,
  plan: TrainingPlan
): TrainingPlanSchema {
  // Clean the plan data to remove any null values
  const cleanedPlan = cleanPlanData(plan);
  return {
    ...schema,
    updatedAt: new Date().toISOString(),
    source: schema.source === "generated" ? "edited" : schema.source,
    plan: cleanedPlan,
  };
}

export function parseTrainingPlanSchema(json: unknown): TrainingPlanSchema {
  const parsed = trainingPlanSchema.parse(json);

  if (!parsed.version) {
    throw new Error("Missing training plan schema version.");
  }

  // Clean the parsed plan data to remove any null values
  if (parsed.plan) {
    parsed.plan = cleanPlanData(parsed.plan);
  }

  // For now we accept any version string but keep a hook for future migrations.
  return parsed;
}

export function isRunArray(value: unknown): value is Run[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (r) =>
      typeof r === "object" &&
      r !== null &&
      "type" in r &&
      runTypeEnum.options.includes((r as Run).type)
  );
}

export function validateSchema(
  json: unknown
): { valid: boolean; error?: string } {
  try {
    const parsed = trainingPlanSchema.parse(json);
    if (!parsed.version) {
      return { valid: false, error: "Missing training plan schema version." };
    }
    // Hook for future version-specific migrations/validation
    return { valid: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Enhanced error messages with context
      // Note: newer Zod versions use `.issues` instead of `.errors`
      const zodError = err;
      const issues: z.ZodIssue[] = Array.isArray(zodError.issues)
        ? zodError.issues
        : Array.isArray((zodError as unknown as { errors?: z.ZodIssue[] }).errors)
        ? (zodError as unknown as { errors: z.ZodIssue[] }).errors
        : [];

      const messages = issues.map((e) => {
        const path = Array.isArray(e.path) ? e.path.join(".") : "";
        let message = e.message ?? "Invalid value";

        // Add context for run type errors
        // Check for enum validation errors (may be "invalid_type" or "invalid_value" in newer Zod)
        if (path.includes("type") && (e.code === "invalid_type" || e.code === "invalid_value")) {
          const received = "received" in e ? String(e.received) : "unknown";
          message = `Invalid run type "${received}". Expected one of: ${runTypeEnum.options.join(", ")}`;
        }

        // For day key errors, the message already contains the invalid keys from superRefine
        if (path.includes("days") && e.code === "custom") {
          // Message is already enhanced by superRefine
        }

        return `${path ? `${path}: ` : ""}${message}`;
      });
      return { valid: false, error: messages.join("; ") };
    }
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Unknown schema error",
    };
  }
}


