import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SignalDesk — Real-time alerts & insights for your app",
  description:
    "Monitor events, set alert rules, and get notified instantly via Slack, Discord, email, or webhook. Start free.",
  openGraph: {
    title: "SignalDesk — Real-time alerts & insights",
    description: "Monitor events, set alert rules, and get notified instantly.",
    url: "https://signaldesk.dev",
    siteName: "SignalDesk",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SignalDesk — Real-time alerts & insights",
    description: "Monitor events, set alert rules, and get notified instantly.",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
