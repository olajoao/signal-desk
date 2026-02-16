"use client";

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="bg-[var(--surface)] rounded overflow-hidden">
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-xs text-[var(--muted)]">{title}</span>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-xs text-[var(--dim)] hover:text-[var(--foreground)]"
        >
          Copy
        </button>
      </div>
      <pre className="p-4 text-xs overflow-x-auto text-[var(--foreground)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function getApiBase() {
  if (typeof window === "undefined") return "http://localhost:3001";
  return window.location.origin.replace(":3000", ":3001");
}

export default function GuidePage() {
  const base = getApiBase();

  return (
    <div className="space-y-6">
      {/* Integration Guide */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="font-medium">Integration Guide</h2>
        </div>
        <div className="p-4">
          <p className="text-sm text-[var(--muted)] mb-4">
            Send events to SignalDesk whenever something important happens in your application. Use
            your API key in the Authorization header.
          </p>

          <div className="space-y-4">
            <CodeBlock
              title="JavaScript / TypeScript"
              code={`async function trackEvent(type: string, metadata: object) {
  await fetch('${base}/events', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type, metadata })
  });
}

// Example: Track failed payments
try {
  await processPayment(order);
} catch (error) {
  await trackEvent('payment_failed', {
    orderId: order.id,
    amount: order.total,
    error: error.message
  });
  throw error;
}`}
            />

            <CodeBlock
              title="Python"
              code={`import requests

def track_event(event_type: str, metadata: dict):
    requests.post(
        '${base}/events',
        headers={'Authorization': 'Bearer YOUR_API_KEY'},
        json={'type': event_type, 'metadata': metadata}
    )

# Example: Track failed logins
try:
    authenticate(user, password)
except AuthError as e:
    track_event('login_failed', {
        'email': user.email,
        'reason': str(e),
        'ip': request.remote_addr
    })
    raise`}
            />

            <CodeBlock
              title="cURL"
              code={`curl -X POST ${base}/events \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "checkout_failed",
    "metadata": {
      "cartId": "cart_123",
      "userId": "user_456",
      "error": "Card declined"
    }
  }'`}
            />

            <CodeBlock
              title="Go"
              code={`func trackEvent(eventType string, metadata map[string]interface{}) error {
    payload, _ := json.Marshal(map[string]interface{}{
        "type":     eventType,
        "metadata": metadata,
    })

    req, _ := http.NewRequest("POST",
        "${base}/events",
        bytes.NewBuffer(payload))
    req.Header.Set("Authorization", "Bearer YOUR_API_KEY")
    req.Header.Set("Content-Type", "application/json")

    _, err := http.DefaultClient.Do(req)
    return err
}`}
            />
          </div>
        </div>
      </div>

      {/* Event Schema */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="font-medium">Event Schema</h2>
        </div>
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[13px] uppercase tracking-wider text-[var(--muted)]">
                <th className="pb-2">Field</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Required</th>
                <th className="pb-2">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 font-mono text-[var(--accent)]">type</td>
                <td>string</td>
                <td>Yes</td>
                <td>Event type (e.g., &quot;payment_failed&quot;)</td>
              </tr>
              <tr>
                <td className="py-2 font-mono text-[var(--accent)]">metadata</td>
                <td>object</td>
                <td>No</td>
                <td>Additional data about the event</td>
              </tr>
              <tr>
                <td className="py-2 font-mono text-[var(--accent)]">timestamp</td>
                <td>ISO 8601</td>
                <td>No</td>
                <td>Event time (defaults to now)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
