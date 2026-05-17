"use client";

import { useEffect, useRef } from "react";
import { Chart, registerables, type Plugin } from "chart.js";

Chart.register(...registerables);

export interface QuizPerformanceData {
  levels: string[];
  avgScores: number[];
  passRates: number[];
}

// Custom plugin: draws a horizontal dashed red line at y = 70 (pass threshold)
const passThresholdPlugin: Plugin<"bar"> = {
  id: "passThreshold",
  afterDraw(chart) {
    const {
      ctx,
      chartArea: { left, right },
      scales: { y },
    } = chart;
    if (!y) return;
    const yPos = y.getPixelForValue(70);
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.5;
    ctx.moveTo(left, yPos);
    ctx.lineTo(right, yPos);
    ctx.stroke();
    ctx.restore();
  },
};

export function QuizPerformanceChart({ data }: { data: QuizPerformanceData }) {
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
        plugins: [passThresholdPlugin],
        data: {
          labels: data.levels,
          datasets: [
            {
              label: "Avg Score",
              data: data.avgScores,
              backgroundColor: "#534AB7",
              borderRadius: 4,
              barPercentage: 0.7,
              categoryPercentage: 0.6,
            },
            {
              label: "Pass Rate",
              data: data.passRates,
              backgroundColor: "#1D9E75",
              borderRadius: 4,
              barPercentage: 0.7,
              categoryPercentage: 0.6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: "#9ca3af", font: { size: 12 } },
              border: { display: false },
            },
            y: {
              min: 0,
              max: 100,
              grid: { color: "rgba(156, 163, 175, 0.15)" },
              ticks: {
                color: "#9ca3af",
                font: { size: 11 },
                callback: (v) => `${v}%`,
              },
              border: { display: false },
            },
          },
        },
      });
    } catch (e) {
      console.error("QuizPerformanceChart init error:", e);
    }

    return () => {
      chartRef.current?.destroy();
    };
  }, [data]);

  return <canvas ref={canvasRef} />;
}
