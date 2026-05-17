"use client";

import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export interface ActivityData {
  labels: string[];
  signups: number[];
  active: number[];
}

export function ActivityLineChart({ data }: { data: ActivityData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current?.destroy();

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    try {
      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: data.labels,
          datasets: [
            {
              label: "New Signups",
              data: data.signups,
              borderColor: "#534AB7",
              backgroundColor: "rgba(83, 74, 183, 0.1)",
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: "#534AB7",
              borderWidth: 2,
            },
            {
              label: "Active Students",
              data: data.active,
              borderColor: "#1D9E75",
              backgroundColor: "rgba(29, 158, 117, 0.08)",
              fill: true,
              tension: 0.4,
              borderDash: [5, 4],
              pointRadius: 4,
              pointBackgroundColor: "#1D9E75",
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { mode: "index", intersect: false },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: "#9ca3af", font: { size: 11 } },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(156, 163, 175, 0.15)",
              },
              ticks: {
                color: "#9ca3af",
                font: { size: 11 },
                precision: 0,
              },
              border: { display: false },
            },
          },
        },
      });
    } catch (e) {
      console.error("ActivityLineChart init error:", e);
    }

    return () => {
      chartRef.current?.destroy();
    };
  }, [data]);

  return <canvas ref={canvasRef} />;
}
