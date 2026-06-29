"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Coleta Core Web Vitals (LCP, INP, CLS, FCP, TTFB) no cliente.
 * Em produção, envie `metric` para seu endpoint/RUM
 * (ex.: navigator.sendBeacon("/api/vitals", JSON.stringify(metric))).
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[web-vitals] ${metric.name}: ${Math.round(metric.value)}`);
    }
  });
  return null;
}
