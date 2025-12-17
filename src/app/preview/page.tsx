"use client";

import React from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { useLocalStorage } from "@/lib/storage";
import { TrainingPlan } from "@/lib/planGenerator";
import { PdfDocument } from "@/components/pdf/PdfDocument";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PdfPreviewPage() {
  const [plan] = useLocalStorage<TrainingPlan | null>("training-plan", null);

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">No plan found</h1>
            <p className="text-muted-foreground">
              Please generate a training plan first to view the preview.
            </p>
          </div>
          <Button asChild>
            <Link href="/">Go to Planner</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">PDF Preview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full-page preview of your training plan
          </p>
        </div>
        <Card className="overflow-hidden">
          <PDFViewer
            style={{ width: "100%", height: "100vh", minHeight: "800px" }}
            showToolbar={true}
          >
            <PdfDocument
              plan={plan}
              config={{
                orientation: "portrait",
                title: "Your Training Plan",
                headerColor: "#1e293b",
                headerTextColor: "#ffffff",
              }}
            />
          </PDFViewer>
        </Card>
        <div className="flex items-center gap-4">
          <Button asChild variant="outline">
            <Link href="/">← Back to Planner</Link>
          </Button>
          <Button asChild>
            <Link href="/">Download PDF</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
