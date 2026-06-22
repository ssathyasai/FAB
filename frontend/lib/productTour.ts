import { driver, type DriveStep, type Config } from "driver.js";
import { updateSettings } from "@/lib/api";

export const TOUR_STORAGE_KEY = "fab_tour_completed";
export const TOUR_START_EVENT = "fab-start-tour";

export function getTourSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: "Welcome to AI FAB",
        description:
          "This quick tour shows you where everything lives. It only takes a minute.",
        side: "over",
        align: "center",
      },
    },
    {
      element: "[data-tour='sidebar-logo']",
      popover: {
        title: "Home",
        description: "Click the logo anytime to jump back to Budget Overview.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='budget-section']",
      popover: {
        title: "Budget Tools",
        description:
          "Set up your budget, track spending, run the optimizer, and find money leaks.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='finance-section']",
      popover: {
        title: "Finance Advisors",
        description:
          "AI-powered insights for debt, savings, investments, and emergency planning.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='savings-section']",
      popover: {
        title: "Piggy Bank",
        description: "Track short-term savings goals in your personal piggy bank.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='bank-section']",
      popover: {
        title: "Bank Accounts",
        description: "Connect and manage bank accounts, transfers, and transaction history.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='coach']",
      popover: {
        title: "FIN TRACKER Coach",
        description: "Chat with your AI coach for personalized financial guidance.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='settings']",
      popover: {
        title: "Settings",
        description:
          "Update your profile, theme, and income. You can replay this tour anytime from here.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='main-content']",
      popover: {
        title: "Main Workspace",
        description:
          "Charts, stats, and tools appear here for whichever section you select.",
        side: "left",
        align: "start",
      },
    },
    {
      popover: {
        title: "You're all set!",
        description: "Start with Budget Setup Wizard, then explore at your own pace.",
        side: "over",
        align: "center",
      },
    },
  ];
}

function tourConfig(onComplete?: () => void): Config {
  return {
    showProgress: true,
    animate: true,
    smoothScroll: true,
    overlayOpacity: 0.72,
    stagePadding: 8,
    stageRadius: 10,
    popoverClass: "fab-tour-popover",
    steps: getTourSteps(),
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Get started",
    onDestroyed: () => {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
      updateSettings({ tour_complete: true }).catch(() => {});
      onComplete?.();
    },
  };
}

let activeDriver: ReturnType<typeof driver> | null = null;

export function startProductTour(onComplete?: () => void) {
  activeDriver?.destroy();
  activeDriver = driver(tourConfig(onComplete));
  activeDriver.drive();
}

export function requestProductTour() {
  window.dispatchEvent(new CustomEvent(TOUR_START_EVENT));
}
