"use client";

import Link from "next/link";

interface OnboardingChecklistProps {
  hasApiKey: boolean;
  hasRule: boolean;
  hasEvent: boolean;
}

export function OnboardingChecklist({ hasApiKey, hasRule, hasEvent }: OnboardingChecklistProps) {
  const allDone = hasApiKey && hasRule && hasEvent;
  if (allDone) return null;

  const steps = [
    { done: hasApiKey, label: "Create an API key", href: "/settings", action: "Go to Settings" },
    { done: hasRule, label: "Create an alert rule", href: "/rules", action: "Go to Rules" },
    { done: hasEvent, label: "Send your first event", href: "/settings", action: "View Guide" },
  ];

  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider">Getting Started</h3>
        <span className="text-sm font-mono text-[var(--muted)]">{completed}/3</span>
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                step.done ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--dim)]"
              }`}>
                {step.done && (
                  <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              <span className={`text-sm ${step.done ? "text-[var(--dim)] line-through" : ""}`}>
                {step.label}
              </span>
            </div>
            {!step.done && (
              <Link href={step.href} className="text-xs text-[var(--accent)] hover:underline">
                {step.action}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
