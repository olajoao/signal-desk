import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
            <span className="text-xl font-bold text-white">SignalDesk</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-sm text-blue-400">Real-time event monitoring</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Know when things break
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            before your users do
          </span>
        </h1>

        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
          SignalDesk monitors your application events in real-time and alerts you
          when patterns indicate problems. Simple API, powerful rules, instant notifications.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
          >
            Start for free
          </Link>
          <a
            href="#how-it-works"
            className="border border-zinc-700 hover:border-zinc-600 text-zinc-300 px-8 py-3 rounded-lg text-lg font-medium transition-colors"
          >
            See how it works
          </a>
        </div>

        {/* Code preview */}
        <div className="mt-16 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden text-left max-w-3xl mx-auto">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <span className="ml-2 text-xs text-zinc-500">your-app.ts</span>
          </div>
          <pre className="p-6 text-sm overflow-x-auto">
            <code>
              <span className="text-zinc-500">{"// Send events when things happen in your app"}</span>{"\n"}
              <span className="text-purple-400">await</span> <span className="text-blue-400">fetch</span>(<span className="text-green-400">&apos;https://api.signaldesk.io/events&apos;</span>, {"{"}{"\n"}
              {"  "}method: <span className="text-green-400">&apos;POST&apos;</span>,{"\n"}
              {"  "}headers: {"{"} <span className="text-green-400">&apos;Authorization&apos;</span>: <span className="text-green-400">`Bearer ${"{"}<span className="text-orange-400">API_KEY</span>{"}"}`</span> {"},"}{"\n"}
              {"  "}body: <span className="text-blue-400">JSON</span>.<span className="text-yellow-400">stringify</span>({"{"}{"\n"}
              {"    "}type: <span className="text-green-400">&apos;payment_failed&apos;</span>,{"\n"}
              {"    "}metadata: {"{"} userId, error: err.message {"}"}{"\n"}
              {"  "}{"}"}{"),"}{"\n"}
              {"}"});
            </code>
          </pre>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-800/50 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Everything you need to stay on top of your app
          </h2>
          <p className="text-zinc-400 text-center mb-16 max-w-2xl mx-auto">
            Simple event ingestion, powerful pattern detection, and instant alerts across multiple channels.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<EventIcon />}
              title="Event Ingestion"
              description="Send events via simple REST API. Track errors, user actions, system metrics - anything that matters."
            />
            <FeatureCard
              icon={<RuleIcon />}
              title="Smart Rules"
              description="Define thresholds and time windows. Alert when payment failures exceed 5 in 60 seconds."
            />
            <FeatureCard
              icon={<BellIcon />}
              title="Multi-channel Alerts"
              description="Get notified via Discord, webhooks, or in-app. Never miss a critical issue again."
            />
            <FeatureCard
              icon={<ChartIcon />}
              title="Real-time Dashboard"
              description="Watch events flow in real-time. See patterns emerge before they become problems."
            />
            <FeatureCard
              icon={<WindowIcon />}
              title="Sliding Windows"
              description="Count events over configurable time windows. Cooldowns prevent alert fatigue."
            />
            <FeatureCard
              icon={<TeamIcon />}
              title="Multi-tenant"
              description="Isolated workspaces for your team. Fine-grained API keys for different services."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Up and running in 5 minutes
          </h2>
          <p className="text-zinc-400 text-center mb-16">
            Three simple steps to start monitoring your application
          </p>

          <div className="grid md:grid-cols-3 gap-12">
            <Step
              number="1"
              title="Create an account"
              description="Sign up and create your organization. Get your API key from the settings page."
            />
            <Step
              number="2"
              title="Send events"
              description="Add a few lines of code to send events when important things happen in your app."
            />
            <Step
              number="3"
              title="Configure rules"
              description="Define what patterns should trigger alerts. Set thresholds, windows, and notification channels."
            />
          </div>

          {/* Code examples */}
          <div className="mt-20">
            <h3 className="text-xl font-semibold text-white text-center mb-8">
              Works with any language
            </h3>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <CodeExample
                language="JavaScript"
                code={`// npm install node-fetch (or use native fetch)
await fetch('https://api.signaldesk.io/events', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'order_failed',
    metadata: { orderId, reason: error.message }
  })
});`}
              />
              <CodeExample
                language="Python"
                code={`import requests

requests.post(
    'https://api.signaldesk.io/events',
    headers={'Authorization': 'Bearer sk_your_api_key'},
    json={
        'type': 'order_failed',
        'metadata': {'orderId': order_id, 'reason': str(e)}
    }
)`}
              />
              <CodeExample
                language="cURL"
                code={`curl -X POST https://api.signaldesk.io/events \\
  -H "Authorization: Bearer sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "order_failed",
    "metadata": {"orderId": "123", "reason": "Card declined"}
  }'`}
              />
              <CodeExample
                language="Go"
                code={`payload, _ := json.Marshal(map[string]interface{}{
    "type": "order_failed",
    "metadata": map[string]string{
        "orderId": orderId,
        "reason": err.Error(),
    },
})
req, _ := http.NewRequest("POST",
    "https://api.signaldesk.io/events",
    bytes.NewBuffer(payload))
req.Header.Set("Authorization", "Bearer sk_your_api_key")
req.Header.Set("Content-Type", "application/json")
http.DefaultClient.Do(req)`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800/50 bg-gradient-to-b from-zinc-900/50 to-zinc-950">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to stop firefighting?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
            Join teams who catch issues before they become incidents.
            Free to start, no credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
          >
            Get started for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded" />
            <span>SignalDesk</span>
          </div>
          <div>Built for developers, by developers</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
      <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm">{description}</p>
    </div>
  );
}

function CodeExample({ language, code }: { language: string; code: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <span className="text-xs text-zinc-400">{language}</span>
      </div>
      <pre className="p-4 text-xs overflow-x-auto text-zinc-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Icons
function EventIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function RuleIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function WindowIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
