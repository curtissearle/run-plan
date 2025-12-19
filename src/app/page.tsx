"use client";

import { useMemo } from "react";
import InputForm, { FormValues } from "@/components/InputForm";
import { TrainingPlanSchema } from "@/lib/planSchema";
import TrainingTable from "@/components/TrainingTable";
import PdfConfigurator from "@/components/pdf/PdfConfigurator";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TrainingPlan } from "@/lib/planGenerator";
import { TrainingStep, useTrainingSession } from "@/lib/useTrainingSession";
import { Button } from "@/components/ui/button";

export default function Home() {
  const {
    formValues,
    plan,
    step,
    setStep,
    generateAndSetPlan,
    updatePlan,
    updateFormValues,
    exportPlanSchema,
    resetSession,
    importPlanSchema,
  } = useTrainingSession();

  const handleFormSubmit = (data: FormValues) => {
    generateAndSetPlan(data);
  };

  const handleReset = () => {
    resetSession();
  };

  const handleUpdatePlan = (newPlan: TrainingPlan) => {
    updatePlan(newPlan);
  };

  const goToStep = (next: TrainingStep) => {
    setStep(next);
  };

  const planSummary = useMemo(
    () =>
      plan && plan.weeks.length > 0
        ? {
            weeks: plan.weeks.length,
            raceDate: formValues?.raceDate ?? null,
            raceDistance: formValues?.raceDistance ?? null,
          }
        : null,
    [plan, formValues?.raceDate, formValues?.raceDistance]
  );

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <header className="space-y-4 border-b border-border pb-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Running plan generator
            </h1>
            <p className="max-w-2xl text-sm sm:text-base text-muted-foreground">
              Move through the steps to configure your race, fine-tune the
              schedule, and export a polished training plan.
            </p>
          </div>

          <nav
            aria-label="Planner steps"
            className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <ol className="flex flex-1 flex-wrap gap-2 text-xs sm:text-sm">
              {[
                {
                  id: "configure",
                  label: "Configure",
                  description: "Race & training basics",
                },
                {
                  id: "edit",
                  label: "Edit schedule",
                  description: "Adjust weeks & workouts",
                },
                { id: "export", label: "Export", description: "PDF & JSON" },
              ].map(({ id, label, description }, index) => {
                const isActive = step === id;
                const isComplete =
                  (step === "edit" && id === "configure") ||
                  (step === "export" && (id === "configure" || id === "edit"));

                return (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1"
                  >
                    <Button
                      type="button"
                      onClick={() => {
                        if (id === "configure") {
                          goToStep("configure");
                        } else if (
                          id === "edit" &&
                          plan &&
                          plan.weeks.length > 0
                        ) {
                          goToStep("edit");
                        } else if (
                          id === "export" &&
                          plan &&
                          plan.weeks.length > 0
                        ) {
                          goToStep("export");
                        }
                      }}
                      variant={
                        isActive
                          ? "default"
                          : isComplete
                          ? "secondary"
                          : "ghost"
                      }
                      className={`flex items-center gap-2 px-2 py-1 text-left ${
                        isActive
                          ? ""
                          : isComplete
                          ? ""
                          : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isActive
                            ? "bg-primary/20 text-primary-foreground"
                            : isComplete
                            ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="flex flex-col">
                        <span className="font-medium">{label}</span>
                        <span
                          className={`hidden text-[11px] sm:inline ${
                            isActive
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {description}
                        </span>
                      </span>
                    </Button>
                    {index < 2 && (
                      <span className="hidden h-px w-6 bg-border sm:inline" />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </header>

        <main className="space-y-8">
          {step === "configure" && (
            <InputForm
              onSubmit={handleFormSubmit}
              initialValues={formValues}
              onImport={(schema: TrainingPlanSchema) =>
                importPlanSchema(schema)
              }
            />
          )}

          {step === "edit" && plan && (
            <>
              <TrainingTable
                plan={plan}
                onUpdatePlan={handleUpdatePlan}
                summary={planSummary}
                currentUnit={formValues?.unit || "km"}
                onUnitChange={(newUnit, convertedPlan) => {
                  if (formValues) {
                    const updatedValues = { ...formValues, unit: newUnit };
                    // Update form values with new unit
                    updateFormValues(updatedValues);
                    // Update plan with converted distances
                    if (convertedPlan) {
                      updatePlan(convertedPlan);
                      // Update schema settings to reflect the new unit
                      // We need to get the current schema and update its settings
                      const currentSchema = exportPlanSchema();
                      if (currentSchema) {
                        const updatedSchema = {
                          ...currentSchema,
                          settings: {
                            ...currentSchema.settings,
                            unit: newUnit,
                          },
                          updatedAt: new Date().toISOString(),
                        };
                        importPlanSchema(updatedSchema);
                      }
                    }
                  }
                }}
              />
              <div className="flex flex-col items-center justify-between gap-4 pt-4 sm:flex-row">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => goToStep("configure")}
                  >
                    Back to form
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleReset}
                  >
                    Start over
                  </Button>
                </div>
                <Button type="button" onClick={() => goToStep("export")}>
                  Configure &amp; preview PDF
                </Button>
              </div>
            </>
          )}

          {step === "export" && plan && (
            <PdfConfigurator onBack={() => goToStep("edit")} plan={plan} />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
