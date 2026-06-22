"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getSettings } from "@/lib/api";
import {
  TOUR_STORAGE_KEY,
  TOUR_START_EVENT,
  startProductTour,
} from "@/lib/productTour";
import "driver.js/dist/driver.css";

export default function ProductTour() {
  const pathname = usePathname();
  const autoStartedRef = useRef(false);

  useEffect(() => {
    const handler = () => startProductTour();
    window.addEventListener(TOUR_START_EVENT, handler);
    return () => window.removeEventListener(TOUR_START_EVENT, handler);
  }, []);

  useEffect(() => {
    if (pathname === "/onboarding" || autoStartedRef.current) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      if (localStorage.getItem(TOUR_STORAGE_KEY) === "true") {
        autoStartedRef.current = true;
        return;
      }

      try {
        const res = await getSettings();
        if (cancelled) return;

        if (res.data.tour_complete) {
          localStorage.setItem(TOUR_STORAGE_KEY, "true");
          autoStartedRef.current = true;
          return;
        }

        if (!res.data.onboarding_complete) return;
      } catch {
        return;
      }

      autoStartedRef.current = true;
      timer = setTimeout(() => {
        if (!cancelled) startProductTour();
      }, 900);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
