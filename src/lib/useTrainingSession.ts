"use client";

import { useEffect, useState } from "react";
import { useLocalStorage } from "./storage";
import { FormValues } from "@/components/InputForm";
import { TrainingPlan, generatePlan, Day, Run } from "./planGenerator";
import {
  PlanSettings,
  TrainingPlanSchema,
  createSchemaFromPlan,
  updateSchemaAfterEdit,
} from "./planSchema";
import { kmToMiles, milesToKm } from "./utils";

export type TrainingStep = "configure" | "edit" | "export";

interface TrainingSession {
  formValues: FormValues | null;
  plan: TrainingPlan | null;
  schema: TrainingPlanSchema | null;
  step: TrainingStep;
  setStep: (step: TrainingStep) => void;
  updateFormValues: (values: FormValues | null) => void;
  generateAndSetPlan: (values: FormValues) => void;
  updatePlan: (plan: TrainingPlan | null) => void;
  exportPlanSchema: () => TrainingPlanSchema | null;
  importPlanSchema: (schema: TrainingPlanSchema) => void;
  resetSession: () => void;
}

export function useTrainingSession(): TrainingSession {
  const [formValues, setFormValues] = useLocalStorage<FormValues | null>(
    "training-form-values",
    null
  );
  const [plan, setPlan] = useLocalStorage<TrainingPlan | null>(
    "training-plan",
    null
  );
  const [schema, setSchema] = useLocalStorage<TrainingPlanSchema | null>(
    "training-plan-schema-v1",
    null
  );
  const [step, setStep] = useState<TrainingStep>("configure");

  useEffect(() => {
    if (plan && plan.weeks.length > 0) {
      setStep((current) => (current === "configure" ? "edit" : current));
    }
  }, [plan]);

  const updateFormValues = (values: FormValues | null) => {
    setFormValues(values);
  };

  const generateAndSetPlan = (values: FormValues) => {
    setFormValues(values);
    const nextPlan = generatePlan(values);
    setPlan(nextPlan);

    const settings: PlanSettings = {
      todayDate: values.todayDate,
      raceDate: values.raceDate,
      raceDistance: values.raceDistance,
      customRaceDistance: values.customRaceDistance,
      unit: values.unit || "km",
      trainingDays: values.trainingDays.map((d) => ({
        day: d.day,
        workouts: d.workouts.map((w) => ({
          runType: w.runType,
          nickname: w.nickname,
        })),
      })),
    };

    const nextSchema = createSchemaFromPlan({
      settings,
      plan: nextPlan,
      source: "generated",
    });
    setSchema(nextSchema);

    if (nextPlan.weeks.length > 0) {
      setStep("edit");
    }
  };

  const updatePlan = (next: TrainingPlan | null) => {
    setPlan(next);
    if (next && schema) {
      setSchema(updateSchemaAfterEdit(schema, next));
    }
  };

  const exportPlanSchema = () => schema;

  const importPlanSchema = (incoming: TrainingPlanSchema) => {
    // Validate the imported schema structure
    const validDays: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const validRunTypes: Run["type"][] = [
      "Rest",
      "Easy",
      "Long",
      "Interval",
      "Tempo",
      "Race",
      "Strength",
    ];

    // Validate plan structure if present
    if (incoming?.plan) {
      const validationErrors: string[] = [];

      // Validate each week
      if (!incoming.plan.weeks) {
        throw new Error("Invalid plan structure: weeks array is missing");
      }

      if (!Array.isArray(incoming.plan.weeks)) {
        throw new Error("Invalid plan structure: weeks must be an array");
      }

      incoming.plan.weeks.forEach((week) => {
        // Validate day keys
        const dayKeys = Object.keys(week.days || {});
        const invalidDayKeys = dayKeys.filter(
          (key) => !validDays.includes(key as Day)
        );
        if (invalidDayKeys.length > 0) {
          validationErrors.push(
            `Week ${week.week}: Invalid day key(s): ${invalidDayKeys.join(", ")}. Expected one of: ${validDays.join(", ")}`
          );
        }

        // Validate run types in each day
        dayKeys.forEach((dayKey) => {
          const runs = week.days[dayKey as Day] || [];
          if (!Array.isArray(runs)) {
            validationErrors.push(
              `Week ${week.week}, ${dayKey}: runs must be an array`
            );
            return;
          }
          runs.forEach((run, runIndex) => {
            if (run && !validRunTypes.includes(run.type)) {
              validationErrors.push(
                `Week ${week.week}, ${dayKey}, run ${runIndex + 1}: Invalid run type "${run.type}". Expected one of: ${validRunTypes.join(", ")}`
              );
            }
          });
        });
      });

      if (validationErrors.length > 0) {
        throw new Error(
          `Invalid plan structure: ${validationErrors.join("; ")}`
        );
      }
    }

    setSchema(incoming);
    const incomingSettings = incoming?.settings;

    if (!incomingSettings) {
      console.error("Invalid schema: missing settings");
      return;
    }

    const trainingDaysArray = incomingSettings.trainingDays;

    if (!Array.isArray(trainingDaysArray)) {
      throw new Error("Invalid settings: trainingDays must be an array");
    }

    const nextFormValues: FormValues = {
      todayDate: incomingSettings.todayDate || "",
      raceDate: incomingSettings.raceDate || "",
      raceDistance: incomingSettings.raceDistance || "",
      customRaceDistance: incomingSettings.customRaceDistance,
      unit: incomingSettings.unit || "km",
      trainingDays: trainingDaysArray.map((d) => {
        if (!d) {
          throw new Error(`Invalid training day: day is undefined`);
        }

        const workoutsArray = d.workouts;
        if (!Array.isArray(workoutsArray)) {
          throw new Error(`Invalid training day: workouts must be an array`);
        }

        return {
          day: d?.day || "",
          workouts: workoutsArray.map((w) => {
            return {
              runType: (w?.runType || "Easy") as FormValues["trainingDays"][number]["workouts"][number]["runType"],
              nickname: w?.nickname,
            };
          }),
        };
      }),
    };

    setFormValues(nextFormValues);
    
    if (incoming?.plan) {
      setPlan(incoming.plan);
      if (incoming.plan.weeks && incoming.plan.weeks.length > 0) {
        setStep("edit");
      }
    } else {
      console.error("Invalid schema: missing plan");
      setPlan(null);
    }
  };

  const resetSession = () => {
    setFormValues(null);
    setPlan(null);
    setSchema(null);
    setStep("configure");
  };

  return {
    formValues,
    plan,
    schema,
    step,
    setStep,
    updateFormValues,
    generateAndSetPlan,
    updatePlan,
    exportPlanSchema,
    importPlanSchema,
    resetSession,
  };
}
