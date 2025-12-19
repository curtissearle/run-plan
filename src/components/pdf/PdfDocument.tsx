"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { TrainingPlan, Day, Run } from "@/lib/planGenerator";
import { formatWeekDateRange } from "@/lib/utils";

interface PdfConfig {
  orientation: "portrait" | "landscape";
  title: string;
  headerColor: string;
  headerTextColor: string;
}

interface PdfDocumentProps {
  plan: TrainingPlan;
  config: PdfConfig;
  unit?: "km" | "miles";
}

// Register fonts
Font.register({
  family: "Oswald",
  src: "https://fonts.gstatic.com/s/oswald/v13/Y_TKV6o8WovbUd3m_X9aAA.ttf",
});

// Workout type color mapping
const getWorkoutTypeColor = (type: Run["type"]): string => {
  switch (type) {
    case "Easy":
      return "#dbeafe"; // Light blue
    case "Tempo":
      return "#fed7aa"; // Orange/amber
    case "Long":
      return "#d1fae5"; // Light green
    case "Interval":
      return "#e9d5ff"; // Light purple
    case "Race":
      return "#fee2e2"; // Light red
    case "Strength":
      return "#f3f4f6"; // Gray
    case "Rest":
      return "#f9fafb"; // Very light gray
    default:
      return "#ffffff";
  }
};

const getWorkoutTypeBorderColor = (type: Run["type"]): string => {
  switch (type) {
    case "Easy":
      return "#3b82f6"; // Blue
    case "Tempo":
      return "#f97316"; // Orange
    case "Long":
      return "#10b981"; // Green
    case "Interval":
      return "#a855f7"; // Purple
    case "Race":
      return "#ef4444"; // Red
    case "Strength":
      return "#6b7280"; // Gray
    case "Rest":
      return "#d1d5db"; // Light gray
    default:
      return "#e5e7eb";
  }
};

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "white",
    padding: 30,
  },
  title: {
    fontSize: 24,
    textAlign: "center",
    fontFamily: "Oswald",
    marginBottom: 20,
    color: "#111827",
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableRowAlternate: {
    margin: "auto",
    flexDirection: "row",
    backgroundColor: "#fafafa",
  },
  tableColHeader: {
    width: "11%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f3f4f6",
    padding: 6,
  },
  tableColHeaderWeek: {
    width: "13%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f3f4f6",
    padding: 6,
  },
  tableColHeaderTotal: {
    width: "14%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f3f4f6",
    padding: 6,
  },
  headerText: {
    textAlign: "center",
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
  },
  tableCol: {
    width: "11%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 4,
    minHeight: 40,
  },
  tableColWeek: {
    width: "13%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableColTotal: {
    width: "14%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
    backgroundColor: "#f9fafb",
  },
  // Workout container styles
  workoutContainer: {
    marginBottom: 4,
    padding: 4,
    borderRadius: 2,
    borderLeftWidth: 3,
  },
  workoutContainerLast: {
    marginBottom: 0,
    padding: 4,
    borderRadius: 2,
    borderLeftWidth: 3,
  },
  // Typography hierarchy
  distanceText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "left",
    marginBottom: 2,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "left",
    marginBottom: 2,
  },
  runTypeText: {
    fontSize: 9,
    color: "#4b5563",
    textAlign: "left",
    marginBottom: 1,
    fontWeight: "600",
  },
  runTypeWithNickname: {
    fontSize: 9,
    color: "#4b5563",
    textAlign: "left",
    marginBottom: 1,
    fontWeight: "600",
  },
  descriptionText: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 2,
    fontStyle: "italic",
    textAlign: "left",
  },
  weekNumberText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 2,
  },
  weekDateText: {
    fontSize: 8,
    color: "#6b7280",
    textAlign: "center",
  },
  totalText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
  },
  restText: {
    fontSize: 9,
    color: "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
  },
});

const days: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const PdfDocument = ({ plan, config, unit = "km" }: PdfDocumentProps) => {
  // Create dynamic styles based on config - use inline styles for dynamic values
  const headerStyle = {
    backgroundColor: config.headerColor,
  };
  const headerTextStyle = {
    color: config.headerTextColor,
  };

  // Helper function to render a single workout
  const renderWorkout = (run: Run, isLast: boolean, index: number) => {
    const workoutType = run.type;
    const backgroundColor = getWorkoutTypeColor(workoutType);
    const borderColor = getWorkoutTypeBorderColor(workoutType);
    const measurementType = run.measurementType || 
      (run.distance !== undefined ? "distance" : run.time !== undefined ? "time" : "distance");

    return (
      <View
        key={index}
        style={[
          isLast ? styles.workoutContainerLast : styles.workoutContainer,
          {
            backgroundColor,
            borderLeftColor: borderColor,
          },
        ]}
      >
        {/* Distance/Time - Primary (largest, bold) */}
        {workoutType !== "Strength" && workoutType !== "Rest" && (
          <>
            {measurementType === "time" && run.time && run.time > 0 ? (
              <Text style={styles.timeText}>
                {Math.round(run.time)} MIN
              </Text>
            ) : measurementType === "distance" && run.distance && run.distance > 0 ? (
              <Text style={styles.distanceText}>
                {Math.round(run.distance * 10) / 10}{unit === "km" ? "km" : "mi"}
              </Text>
            ) : null}
          </>
        )}

        {/* Workout Type - Secondary (medium, color-coded) */}
        <Text style={run.nickname ? styles.runTypeWithNickname : styles.runTypeText}>
          {run.nickname
            ? `${run.type} - ${run.nickname}`
            : run.type || ""}
        </Text>

        {/* Description/Notes - Tertiary (smallest, muted) */}
        {run.description && (
          <Text style={styles.descriptionText}>
            {run.description}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" orientation={config.orientation} style={styles.page}>
        <Text style={styles.title}>{config.title}</Text>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRow}>
            <View style={[styles.tableColHeaderWeek, headerStyle]}>
              <Text style={[styles.headerText, headerTextStyle]}>Week</Text>
            </View>
            {days.map((day) => (
              <View key={day} style={[styles.tableColHeader, headerStyle]}>
                <Text style={[styles.headerText, headerTextStyle]}>{day}</Text>
              </View>
            ))}
            <View style={[styles.tableColHeaderTotal, headerStyle]}>
              <Text style={[styles.headerText, headerTextStyle]}>
                Total ({unit === "km" ? "KM" : "Miles"})
              </Text>
            </View>
          </View>
          {/* Body */}
          {plan.weeks.map((week, weekIndex) => {
            const weekDateRange = formatWeekDateRange(week.startDate);
            const isAlternateRow = weekIndex % 2 === 1;
            
            return (
              <View 
                style={isAlternateRow ? styles.tableRowAlternate : styles.tableRow} 
                key={week.week}
                wrap={false}
              >
                {/* Week Column with Date Range */}
                <View style={styles.tableColWeek}>
                  <Text style={styles.weekNumberText}>Week {week.week}</Text>
                  <Text style={styles.weekDateText}>{weekDateRange}</Text>
                </View>

                {/* Day Columns */}
                {days.map((day) => {
                  const runs = week.days[day];
                  const filteredRuns = runs?.filter((run) => run != null) || [];
                  
                  return (
                    <View style={styles.tableCol} key={day}>
                      {filteredRuns.length > 0 ? (
                        filteredRuns.map((run, index) =>
                          renderWorkout(run, index === filteredRuns.length - 1, index)
                        )
                      ) : (
                        <View
                          style={[
                            styles.workoutContainerLast,
                            {
                              backgroundColor: getWorkoutTypeColor("Rest"),
                              borderLeftColor: getWorkoutTypeBorderColor("Rest"),
                            },
                          ]}
                        >
                          <Text style={styles.restText}>Rest</Text>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Total Column */}
                <View style={styles.tableColTotal}>
                  <Text style={styles.totalText}>
                    {Math.round(week.weeklyTotal * 10) / 10}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
};
