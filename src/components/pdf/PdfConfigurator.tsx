import React, { useState, useEffect } from "react";
import { PdfDocument } from "./PdfDocument";
import { TrainingPlan } from "@/lib/planGenerator";
import { useTrainingSession } from "@/lib/useTrainingSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PDFViewer, pdf } from "@react-pdf/renderer";

// For parity with previous getPdf usage:
const getPdf = async () => pdf;

interface PdfConfiguratorProps {
  onBack: () => void;
  plan: TrainingPlan;
}

interface PdfConfig {
  orientation: "portrait" | "landscape";
  title: string;
  headerColor: string;
  headerTextColor: string;
}

export default function PdfConfigurator({
  onBack,
  plan,
}: PdfConfiguratorProps) {
  const { exportPlanSchema } = useTrainingSession();
  const [config, setConfig] = useState<PdfConfig>({
    orientation: "portrait",
    title: "Your Training Plan",
    headerColor: "#1e293b",
    headerTextColor: "#ffffff",
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const pdf = await getPdf();
      const doc = <PdfDocument plan={plan} config={config} />;
      const instance = pdf(doc);
      const blob = await instance.toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `training-plan-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate PDF. Please try again.";
      setDownloadError(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportJSON = () => {
    const schema = exportPlanSchema();
    if (!schema) {
      alert("No plan to export. Please generate a plan first.");
      return;
    }

    const jsonString = JSON.stringify(schema, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `training-plan-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-6 p-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Export & Configure</h2>
          <p className="text-sm text-muted-foreground">
            Customize your PDF export or save/load your plan as JSON.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel - 1/3 width */}
          <div className="space-y-6 lg:col-span-1">
            {/* PDF Styling Options */}
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide">
                PDF Options
              </h3>

              {/* Orientation */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Orientation</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="orientation"
                      value="portrait"
                      checked={config.orientation === "portrait"}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          orientation: e.target.value as
                            | "portrait"
                            | "landscape",
                        })
                      }
                    />
                    Portrait
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="orientation"
                      value="landscape"
                      checked={config.orientation === "landscape"}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          orientation: e.target.value as
                            | "portrait"
                            | "landscape",
                        })
                      }
                    />
                    Landscape
                  </label>
                </div>
              </div>

              {/* Custom Title */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Document Title</Label>
                <Input
                  type="text"
                  value={config.title}
                  onChange={(e) =>
                    setConfig({ ...config, title: e.target.value })
                  }
                  placeholder="Your Training Plan"
                />
              </div>

              {/* Header Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Table Header Color
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.headerColor}
                    onChange={(e) =>
                      setConfig({ ...config, headerColor: e.target.value })
                    }
                    className="w-12 h-10 border rounded-lg cursor-pointer bg-background"
                  />
                  <Input
                    type="text"
                    value={config.headerColor}
                    onChange={(e) =>
                      setConfig({ ...config, headerColor: e.target.value })
                    }
                    placeholder="#1e293b"
                  />
                  <Button
                    onClick={() =>
                      setConfig({ ...config, headerColor: "#1e293b" })
                    }
                    variant="outline"
                    size="sm"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {/* Header Text Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Table Header Text Color
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.headerTextColor}
                    onChange={(e) =>
                      setConfig({ ...config, headerTextColor: e.target.value })
                    }
                    className="w-12 h-10 border rounded-lg cursor-pointer bg-background"
                  />
                  <Input
                    type="text"
                    value={config.headerTextColor}
                    onChange={(e) =>
                      setConfig({ ...config, headerTextColor: e.target.value })
                    }
                    placeholder="#ffffff"
                  />
                  <Button
                    onClick={() =>
                      setConfig({ ...config, headerTextColor: "#ffffff" })
                    }
                    variant="outline"
                    size="sm"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </Card>

            {/* Plan Summary */}
            <Card className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase tracking-wide">
                Plan Summary
              </h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{plan.weeks.length} weeks of training</p>
                <p>Total weekly distance varies by week</p>
              </div>
            </Card>

            {/* JSON Export */}
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide">
                Export as JSON
              </h3>

              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Export your training plan as JSON to save a backup, share with
                  others, or import it later to continue editing. The JSON file
                  contains all your plan data including settings, workouts, and
                  customizations.
                </p>
                <Button
                  onClick={handleExportJSON}
                  className="w-full"
                  variant="outline"
                >
                  📥 Download JSON
                </Button>
              </div>
            </Card>
          </div>

          {/* Live Preview - 2/3 width */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden h-[600px]">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold text-sm uppercase tracking-wide">
                  Live Preview
                </h3>
              </div>
              <div className="h-full w-full relative">
                {isMounted ? (
                  <>
                    <PDFViewer
                      key={`${config.orientation}-${config.title}-${config.headerColor}-${config.headerTextColor}`}
                      width="100%"
                      height="100%"
                      style={{ border: "none" }}
                      showToolbar={false}
                    >
                      <PdfDocument plan={plan} config={config} />
                    </PDFViewer>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Loading preview...
                  </div>
                )}
              </div>
              <div className="p-3 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Preview updates automatically as you change settings
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={onBack}>
                    ← Back to Edit
                  </Button>
                  <Button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    size="sm"
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50"
                  >
                    {isDownloading ? "Generating..." : "📄 Download PDF"}
                  </Button>
                </div>
              </div>
              {downloadError && (
                <div className="p-2 border-t bg-destructive/10 border-destructive/40 text-destructive text-xs">
                  {downloadError}
                </div>
              )}
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}
