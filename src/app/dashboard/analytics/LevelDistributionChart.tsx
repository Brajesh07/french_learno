"use client";

import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export interface LevelDistributionData {
  levels: string[];
  passed: number[];
  failed: number[];
}

export function LevelDistributionChart({
  data,
}: {
  data: LevelDistributionData;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current?.destroy();

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    try {
      chartRef.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: data.levels,
          datasets: [
            {
              label: "Passed",
              data: data.passed,
              backgroundColor: "#534AB7",
              borderRadius: 3,
              stack: "stack",
            },
            {
              label: "Failed",
              data: data.failed,
              backgroundColor: "#E24B4A",
              borderRadius: 3,
              stack: "stack",
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { mode: "index", intersect: false },
          },
          scales: {
            x: {
              stacked: true,
              grid: { color: "rgba(156, 163, 175, 0.15)" },
              ticks: { color: "#9ca3af", font: { size: 11 }, precision: 0 },
              border: { display: false },
            },
            y: {
              stacked: true,
              grid: { display: false },
              ticks: { color: "#9ca3af", font: { size: 13, weight: "bold" } },
              border: { display: false },
            },
          },
        },
      });
    } catch (e) {
      console.error("LevelDistributionChart init error:", e);
    }

    return () => {
      chartRef.current?.destroy();
    };
  }, [data]);

  return <canvas ref={canvasRef} />;
}
