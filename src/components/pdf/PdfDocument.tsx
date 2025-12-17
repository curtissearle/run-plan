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
import { TrainingPlan, Day } from "@/lib/planGenerator";

interface PdfConfig {
  orientation: "portrait" | "landscape";
  title: string;
  headerColor: string;
  headerTextColor: string;
}

interface PdfDocumentProps {
  plan: TrainingPlan;
  config: PdfConfig;
}

// Register fonts
Font.register({
  family: "Oswald",
  src: "https://fonts.gstatic.com/s/oswald/v13/Y_TKV6o8WovbUd3m_X9aAA.ttf",
});

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
  tableColHeader: {
    width: "11%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f3f4f6",
    padding: 5,
  },
  tableColHeaderWeek: {
    width: "13%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f3f4f6",
    padding: 5,
  },
  tableColHeaderTotal: {
    width: "14%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f3f4f6",
    padding: 5,
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
    padding: 5,
  },
  tableColWeek: {
    width: "13%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  tableColTotal: {
    width: "14%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  cellText: {
    textAlign: "center",
    fontSize: 9,
  },
  runType: {
    fontSize: 8,
    color: "#6b7280",
  },
});

const days: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const PdfDocument = ({ plan, config }: PdfDocumentProps) => {
  // Create dynamic styles based on config - use inline styles for dynamic values
  const headerStyle = {
    backgroundColor: config.headerColor,
  };
  const headerTextStyle = {
    color: config.headerTextColor,
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
                Total (KM)
              </Text>
            </View>
          </View>
          {/* Body */}
          {plan.weeks.map((week) => (
            <View style={styles.tableRow} key={week.week}>
              <View style={styles.tableColWeek}>
                <Text style={styles.cellText}>{week.week}</Text>
              </View>
              {days.map((day) => {
                const runs = week.days[day];
                return (
                  <View style={styles.tableCol} key={day}>
                    {runs && runs.length > 0 ? (
                      runs
                        .filter((run) => run != null)
                        .map((run, index, filteredRuns) => (
                          <React.Fragment key={index}>
                            <View
                              style={{
                                marginBottom:
                                  index < filteredRuns.length - 1 ? 3 : 0,
                              }}
                            >
                              <Text style={styles.cellText}>
                                {run?.distance && run.distance > 0
                                  ? `${run.distance}km`
                                  : ""}
                              </Text>
                              <Text style={styles.runType}>
                                {run?.nickname
                                  ? `${run.type} - ${run.nickname}`
                                  : run?.type || ""}
                              </Text>
                            </View>
                            {filteredRuns.length > 1 &&
                              index < filteredRuns.length - 1 && (
                                <Text
                                  style={{
                                    fontSize: 8,
                                    color: "#888",
                                    marginVertical: 2,
                                  }}
                                >
                                  ──────────
                                </Text>
                              )}
                          </React.Fragment>
                        ))
                    ) : (
                      <Text style={styles.cellText}>Rest</Text>
                    )}
                  </View>
                );
              })}
              <View style={styles.tableColTotal}>
                <Text style={styles.cellText}>{week.weeklyTotal}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};
