"use client";

import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export interface SubscriptionData {
  free: number;
  paid: number;
  conversionRate: number;
}

export function SubscriptionDonutChart({ data }: { data: SubscriptionData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current?.destroy();

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const total = data.free + data.paid;

    try {
      chartRef.current = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Free", "Paid"],
          datasets: [
            {
              data: total === 0 ? [1, 0] : [data.free, data.paid],
              backgroundColor:
                total === 0 ? ["#e5e7eb", "#e5e7eb"] : ["#534AB7", "#1D9E75"],
              borderWidth: 0,
              hoverOffset: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "68%",
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.parsed as number;
                  const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                  return ` ${ctx.label}: ${val} (${pct}%)`;
                },
              },
            },
          },
        },
      });
    } catch (e) {
      console.error("SubscriptionDonutChart init error:", e);
    }

    return () => {
      chartRef.current?.destroy();
    };
  }, [data]);

  return <canvas ref={canvasRef} />;
}
