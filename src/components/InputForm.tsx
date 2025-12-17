"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Run } from "@/lib/planGenerator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useTrainingSession } from "@/lib/useTrainingSession";
import { TrainingPlanSchema, validateSchema } from "@/lib/planSchema";

const trainingDaySchema = z.object({
  day: z.string(),
  workouts: z
    .array(
      z.object({
        runType: z.string(),
        nickname: z.string().optional(),
      })
    )
    .min(1, "At least one workout required"),
});

const formSchema = z
  .object({
    todayDate: z.string().min(1, "Today's Date is required"),
    raceDate: z.string().min(1, "Race Date is required"),
    raceDistance: z.string().min(1, "Race Distance is required"),
    customRaceDistance: z
      .number()
      .positive("Distance must be positive")
      .optional(),
    trainingDays: z
      .array(trainingDaySchema)
      .min(1, "Select at least one training day"),
  })
  .refine(
    (data) => {
      if (data.raceDate && data.todayDate) {
        return new Date(data.raceDate) > new Date(data.todayDate);
      }
      return true;
    },
    {
      message: "Race date must be after today's date",
      path: ["raceDate"],
    }
  )
  .refine(
    (data) => {
      if (data.raceDistance === "custom") {
        return data.customRaceDistance && data.customRaceDistance > 0;
      }
      return true;
    },
    {
      message: "Custom distance is required and must be greater than 0",
      path: ["customRaceDistance"],
    }
  );

export type FormValues = z.infer<typeof formSchema>;

interface InputFormProps {
  onSubmit: (data: FormValues) => void;
  initialValues: FormValues | null;
  onImport?: (schema: TrainingPlanSchema) => void;
}

const runTypes: Run["type"][] = [
  "Easy",
  "Long",
  "Interval",
  "Tempo",
  "Strength",
];
const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function InputForm({ onSubmit, initialValues, onImport }: InputFormProps) {
  const { importPlanSchema } = useTrainingSession();
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues || {
      todayDate: new Date().toISOString().split("T")[0],
      raceDate: "",
      raceDistance: "",
      trainingDays: [],
    },
  });

  // Set mounted state to prevent hydration mismatch with Select
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset form when initialValues change (e.g., when coming back from table)
  useEffect(() => {
    if (initialValues) {
      form.reset(initialValues);
    }
  }, [initialValues, form]);

  const watchedRaceDistance = useWatch({
    control: form.control,
    name: "raceDistance",
  });

  const watchedTrainingDays = useWatch({
    control: form.control,
    name: "trainingDays",
    defaultValue: [],
  });

  const handleDayChange = (checked: boolean, day: string) => {
    const currentDays = form.getValues("trainingDays");
    if (checked) {
      form.setValue("trainingDays", [
        ...currentDays,
        { day, workouts: [{ runType: "Easy" }] },
      ]);
    } else {
      form.setValue(
        "trainingDays",
        currentDays.filter((d) => d.day !== day)
      );
    }
    // Trigger validation to show/hide error messages
    form.trigger("trainingDays");
  };

  const handleAddWorkout = (day: string) => {
    const currentDays = form.getValues("trainingDays");
    const dayIndex = currentDays.findIndex((d) => d.day === day);
    if (dayIndex !== -1) {
      const updatedDays = [...currentDays];
      updatedDays[dayIndex] = {
        ...updatedDays[dayIndex],
        workouts: [...updatedDays[dayIndex].workouts, { runType: "Easy" }],
      };
      form.setValue("trainingDays", updatedDays);
    }
  };

  const handleRemoveWorkout = (day: string, workoutIndex: number) => {
    const currentDays = form.getValues("trainingDays");
    const dayIndex = currentDays.findIndex((d) => d.day === day);
    if (dayIndex !== -1) {
      const updatedDays = [...currentDays];
      updatedDays[dayIndex] = {
        ...updatedDays[dayIndex],
        workouts: updatedDays[dayIndex].workouts.filter(
          (_, index) => index !== workoutIndex
        ),
      };
      form.setValue("trainingDays", updatedDays);
    }
  };

  const handleImportJSON = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(false);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const validationResult = validateSchema(parsed);
      if (!validationResult.valid) {
        setImportError(validationResult.error || "Invalid plan schema format.");
        return;
      }

      if (onImport) {
        onImport(parsed as TrainingPlanSchema);
      } else {
        importPlanSchema(parsed as TrainingPlanSchema);
      }
      setImportSuccess(true);
      setTimeout(() => {
        setImportSuccess(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 3000);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Failed to parse JSON file. Please check the file format."
      );
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
      >
        {/* JSON Import */}
        <section className="space-y-4">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground mb-1">
                Import Existing Plan
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Have a saved training plan? Import it to continue where you left
                off or make changes.
              </p>
            </div>
            <div>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
                id="json-import"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
              >
                📤 Import JSON Plan
              </Button>
            </div>

            {importError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/40 text-destructive text-xs">
                {importError}
              </div>
            )}

            {importSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-xs">
                Plan imported successfully! Your form has been populated with
                the imported data.
              </div>
            )}
          </div>
        </section>

        {/* Race basics */}
        <section className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Race basics
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Set when you&apos;re racing and the target distance.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="todayDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>📅 Today&apos;s date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="raceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>🏁 Race date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <FormField
              control={form.control}
              name="raceDistance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>📐 Race distance</FormLabel>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <FormControl>
                      {isMounted ? (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a distance" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5k">5K</SelectItem>
                            <SelectItem value="10k">10K</SelectItem>
                            <SelectItem value="half">Half marathon</SelectItem>
                            <SelectItem value="full">Full marathon</SelectItem>
                            <SelectItem value="custom">Custom (km)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground">
                          Select a distance
                        </div>
                      )}
                    </FormControl>

                    {watchedRaceDistance === "custom" && (
                      <FormField
                        control={form.control}
                        name="customRaceDistance"
                        render={({ field: customField }) => (
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Distance in km"
                              value={customField.value ?? ""}
                              onChange={(e) =>
                                customField.onChange(
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                        )}
                      />
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-[11px] text-muted-foreground">
              Choose a standard race or specify your own distance in kilometers.
            </p>
          </div>
        </section>

        {/* Training pattern */}
        <section className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Training pattern
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick your usual training days and the types of workouts.
              </p>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            {form.formState.errors.trainingDays && (
              <p className="text-xs text-destructive">
                {form.formState.errors.trainingDays.message}
              </p>
            )}

            {daysOfWeek.map((day) => {
              const selectedDay = watchedTrainingDays.find(
                (d) => d.day === day
              );
              const isChecked = !!selectedDay;
              return (
                <div
                  key={day}
                  className="flex flex-col space-y-2 rounded-xl border border-border bg-muted/40 p-3"
                >
                  <div className="flex items-center">
                    <Checkbox
                      id={day}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleDayChange(Boolean(checked), day)
                      }
                    />
                    <label
                      htmlFor={day}
                      className="ml-3 block w-12 text-sm font-medium"
                    >
                      {day}
                    </label>
                  </div>
                  {isChecked && selectedDay && (
                    <div className="ml-7 space-y-2">
                      {selectedDay.workouts.map((workout, workoutIndex) => (
                        <div
                          key={workoutIndex}
                          className="flex flex-col space-y-2 rounded-lg border border-border bg-muted/60 p-2"
                        >
                          <div className="flex items-center space-x-2">
                            <select
                              {...form.register(
                                `trainingDays.${watchedTrainingDays.findIndex(
                                  (d) => d.day === day
                                )}.workouts.${workoutIndex}.runType`
                              )}
                              className="block w-full rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground shadow-sm outline-none ring-0 focus:border-ring focus:ring-2 focus:ring-ring"
                            >
                              {runTypes.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                            {selectedDay.workouts.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveWorkout(day, workoutIndex)
                                }
                                className="px-2 text-xs text-red-300 hover:text-red-200"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="Nickname (e.g., Upper Body, Hills)"
                            {...form.register(
                              `trainingDays.${watchedTrainingDays.findIndex(
                                (d) => d.day === day
                              )}.workouts.${workoutIndex}.nickname`
                            )}
                            className="block w-full rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground shadow-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-0 text-xs font-medium"
                        onClick={() => handleAddWorkout(day)}
                      >
                        + Add another workout
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Summary & CTA */}
        <section className="space-y-4 border-t border-border pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              After generating a plan you&apos;ll be able to drag workouts
              between days, tweak distances, and export everything to PDF.
            </p>
            <Button type="submit" className="w-full sm:w-auto">
              Generate training plan
            </Button>
          </div>
        </section>
      </form>
    </Form>
  );
}
