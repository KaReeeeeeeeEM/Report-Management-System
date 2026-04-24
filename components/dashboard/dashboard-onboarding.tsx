"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type StepConfig = {
  element: string;
  intro: string;
  title?: string;
};

const ONBOARDING_KEY_PREFIX = "rms-onboarding";

const STEP_MAP: Record<string, StepConfig[]> = {
  "/overview": [
    {
      element: "[data-tour='overview-metrics']",
      title: "Quick summary",
      intro: "Start here to see the latest report numbers at a glance.",
    },
    {
      element: "[data-tour='overview-charts']",
      title: "Trends",
      intro: "These charts help you spot report activity and progress over time.",
    },
    {
      element: "[data-tour='overview-latest-reports']",
      title: "Latest reports",
      intro: "This section shows the newest reports so you can open them quickly.",
    },
  ],
  "/reports": [
    {
      element: "[data-tour='reports-create']",
      title: "Add a report",
      intro: "Use this button anytime you want to add a new report PDF.",
    },
    {
      element: "[data-tour='reports-table']",
      title: "Your reports",
      intro: "Here you can view report details, see when they were created, and check when they were last opened.",
    },
    {
      element: "[data-tour='reports-actions']",
      title: "More actions",
      intro: "Use the menu to open, download, edit, or move a report to the recycle bin.",
    },
  ],
  "/recycle-bin": [
    {
      element: "[data-tour='recycle-table']",
      title: "Recycle bin",
      intro: "Reports you remove stay here until you decide to bring them back.",
    },
    {
      element: "[data-tour='recycle-actions']",
      title: "Recover reports",
      intro: "Use the action menu to restore a report back to the main reports page.",
    },
  ],
};

export function DashboardOnboarding() {
  const pathname = usePathname();

  useEffect(() => {
    const steps = STEP_MAP[pathname];
    if (!steps || typeof window === "undefined") return;

    const storageKey = `${ONBOARDING_KEY_PREFIX}:${pathname}`;
    if (window.localStorage.getItem(storageKey) === "done") return;

    const timer = window.setTimeout(() => {
      const availableSteps = steps.filter((step) => document.querySelector(step.element));
      if (availableSteps.length === 0) return;

      import("intro.js").then(({ default: introJs }) => {
        const tour = introJs();
        tour.setOptions({
          steps: availableSteps,
          nextLabel: "Next",
          prevLabel: "Back",
          doneLabel: "Finish",
          showProgress: true,
          showBullets: false,
          overlayOpacity: 0.7,
        });

        const markDone = () => window.localStorage.setItem(storageKey, "done");
        tour.oncomplete(markDone);
        tour.onexit(markDone);
        tour.start();
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
