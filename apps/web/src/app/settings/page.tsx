"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getApiKeys, createApiKey, deleteApiKey, getUsage, getPlans,
  getMembers, inviteMember, removeMember,
  createCheckoutSession, getBillingPortal,
} from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

export default function SettingsPage() {
  const { token, user, org, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState("never");
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const isOwner = org?.role === "owner";
  const isAdmin = org?.role === "admin" || isOwner;

  const { data, isLoading } = useQuery({
    queryKey: ["api-keys", token],
    queryFn: () => (token ? getApiKeys(token) : Promise.resolve({ apiKeys: [] })),
    enabled: !!token,
  });

  const { data: usageData } = useQuery({
    queryKey: ["usage", token],
    queryFn: () => (token ? getUsage(token) : null),
    enabled: !!token,
    refetchInterval: 30000,
  });

  const { data: plansData } = useQuery({
    queryKey: ["plans"],
    queryFn: () => getPlans(),
    enabled: showPlans,
  });

  const { data: membersData } = useQuery({
    queryKey: ["members", token],
    queryFn: () => (token ? getMembers(token) : Promise.resolve({ members: [] })),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: ({ name, expiresIn }: { name: string; expiresIn?: string }) =>
      createApiKey(token!, name, expiresIn),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setShowNewKey(result.key);
      setNewKeyName("");
      setNewKeyExpiry("never");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiKey(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      inviteMember(token!, email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setInviteEmail("");
      setInviteRole("member");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => removeMember(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) => createCheckoutSession(token!, planId),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => getBillingPortal(token!),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  if (authLoading || !token) return <div className="text-gray-400">Loading...</div>;

  const usage = usageData?.usage;
  const limits = usageData?.limits;
  const plan = usageData?.plan;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      {/* Usage & Plan */}
      {usage && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Usage & Plan</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                {plan?.name}
              </span>
              {plan?.id !== "free" && (
                <button
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  {portalMutation.isPending ? "Loading..." : "Manage Billing"}
                </button>
              )}
              <button
                onClick={() => setShowPlans(!showPlans)}
                className="text-sm text-gray-400 hover:text-white"
              >
                {showPlans ? "Hide plans" : "Upgrade"}
              </button>
            </div>
          </div>

          {/* Events usage bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Events this month</span>
              <span>
                {usage.events.used.toLocaleString()} / {usage.events.limit.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  usage.events.percentUsed >= 90
                    ? "bg-red-500"
                    : usage.events.percentUsed >= 70
                    ? "bg-yellow-500"
                    : "bg-blue-500"
                }`}
                style={{ width: `${Math.min(100, usage.events.percentUsed)}%` }}
              />
            </div>
            {usage.events.percentUsed >= 80 && (
              <p className="text-xs text-yellow-400 mt-1">
                {usage.events.percentUsed >= 100
                  ? "Limit reached! Upgrade to continue."
                  : `${usage.events.remaining.toLocaleString()} events remaining`}
              </p>
            )}
          </div>

          {/* Rules usage */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Rules</span>
              <span>
                {usage.rules.used} / {usage.rules.limit}
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${(usage.rules.used / usage.rules.limit) * 100}%` }}
              />
            </div>
          </div>

          {/* Plan limits */}
          <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-[var(--border)]">
            <div>
              <span className="text-gray-400">Rate limit:</span>{" "}
              <span>{limits?.rateLimit} req/min</span>
            </div>
            <div>
              <span className="text-gray-400">Retention:</span>{" "}
              <span>{limits?.retentionDays} days</span>
            </div>
          </div>

          {/* Overage */}
          {usage.overage.events > 0 && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
              <div className="text-sm text-yellow-400">
                Overage: {usage.overage.events.toLocaleString()} events (${usage.overage.cost.toFixed(2)})
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plans comparison */}
      {showPlans && plansData && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 mb-6">
          <h2 className="font-medium mb-4">Available Plans</h2>
          <div className="grid gap-4">
            {plansData.plans.map((p) => (
              <div
                key={p.id}
                className={`p-4 border rounded-lg ${
                  p.id === plan?.id
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-[var(--border)]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{p.displayName}</span>
                    {p.id === plan?.id && (
                      <span className="ml-2 text-xs text-blue-400">(Current)</span>
                    )}
                  </div>
                  <span className="text-lg font-bold">
                    ${(p.priceMonthly / 100).toFixed(0)}
                    <span className="text-sm font-normal text-gray-400">/mo</span>
                  </span>
                </div>
                <div className="text-sm text-gray-400 space-y-1">
                  <div>{p.eventsPerMonth.toLocaleString()} events/month</div>
                  <div>{p.rulesLimit} rules</div>
                  <div>{p.retentionDays} days retention</div>
                  <div>{p.rateLimit} req/min</div>
                </div>
                {p.id !== plan?.id && p.id !== "free" && (
                  <button
                    onClick={() => checkoutMutation.mutate(p.id)}
                    disabled={checkoutMutation.isPending}
                    className="mt-3 w-full bg-[var(--primary)] text-white px-4 py-2 rounded text-sm hover:bg-[var(--primary)]/80 disabled:opacity-50"
                  >
                    {checkoutMutation.isPending ? "Redirecting..." : `Upgrade to ${p.displayName}`}
                  </button>
                )}
              </div>
            ))}
          </div>
          {checkoutMutation.isError && (
            <p className="text-xs text-red-400 mt-4">
              {checkoutMutation.error instanceof Error ? checkoutMutation.error.message : "Checkout failed"}
            </p>
          )}
        </div>
      )}

      {/* Account Info */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 mb-6">
        <h2 className="font-medium mb-4">Account</h2>
        <div className="space-y-2 text-sm">
          <div><span className="text-gray-400">Email:</span> {user?.email}</div>
          <div><span className="text-gray-400">Organization:</span> {org?.name}</div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg mb-6">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="font-medium">Team Members</h2>
        </div>

        {isOwner && (
          <div className="p-4 border-b border-[var(--border)]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
              }}
              className="flex gap-2"
            >
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm"
                placeholder="Email address"
                required
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={inviteMutation.isPending}
                className="bg-[var(--primary)] text-white px-4 py-2 rounded text-sm hover:bg-[var(--primary)]/80 disabled:opacity-50"
              >
                {inviteMutation.isPending ? "Inviting..." : "Invite"}
              </button>
            </form>
            {inviteMutation.isError && (
              <p className="text-xs text-red-400 mt-2">
                {inviteMutation.error instanceof Error ? inviteMutation.error.message : "Invite failed"}
              </p>
            )}
            {inviteMutation.isSuccess && (
              <p className="text-xs text-green-400 mt-2">Invite sent! Check the server console for the token.</p>
            )}
          </div>
        )}

        <div className="divide-y divide-[var(--border)]">
          {membersData?.members.map((m) => (
            <div key={m.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{m.name ?? m.email}</div>
                <div className="text-sm text-gray-500">
                  {m.email} &middot;{" "}
                  <span className={m.role === "owner" ? "text-yellow-400" : m.role === "admin" ? "text-blue-400" : "text-gray-400"}>
                    {m.role}
                  </span>
                </div>
              </div>
              {isOwner && m.userId !== user?.id && (
                <button
                  onClick={() => removeMemberMutation.mutate(m.id)}
                  className="text-gray-400 hover:text-[var(--error)] text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Newly created key */}
      {showNewKey && (
        <div className="bg-[var(--success)]/10 border border-[var(--success)] rounded-lg p-4 mb-6">
          <div className="font-medium text-[var(--success)] mb-2">New API Key Created</div>
          <p className="text-sm text-gray-400 mb-2">
            Copy this key now. You won&apos;t be able to see it again.
          </p>
          <code className="block bg-[var(--background)] p-2 rounded text-sm break-all">
            {showNewKey}
          </code>
          <button
            onClick={() => setShowNewKey(null)}
            className="mt-2 text-sm text-gray-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create new key */}
      {isAdmin && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 mb-6">
          <h2 className="font-medium mb-4">Create New API Key</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({ name: newKeyName, expiresIn: newKeyExpiry === "never" ? undefined : newKeyExpiry });
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2"
              placeholder="Key name (e.g., production)"
              required
            />
            <select
              value={newKeyExpiry}
              onChange={(e) => setNewKeyExpiry(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm"
            >
              <option value="never">Never expires</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="1y">1 year</option>
            </select>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-[var(--primary)] text-white px-4 py-2 rounded hover:bg-[var(--primary)]/80 disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          </form>
        </div>
      )}

      {/* API Keys list */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg mb-6">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="font-medium">API Keys</h2>
        </div>
        {isLoading ? (
          <div className="p-4 text-gray-400">Loading...</div>
        ) : data?.apiKeys.length === 0 ? (
          <div className="p-4 text-gray-400">No API keys. Create one above to get started.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {data?.apiKeys.map((key) => (
              <div key={key.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {key.name}
                    {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Expired</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {key.keyPrefix} | Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && ` | Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    {key.expiresAt && ` | Expires ${new Date(key.expiresAt).toLocaleDateString()}`}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteMutation.mutate(key.id)}
                    className="text-gray-400 hover:text-[var(--error)]"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Integration Guide */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg mb-6">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="font-medium">Integration Guide</h2>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-400 mb-4">
            Send events to SignalDesk whenever something important happens in your application.
            Use your API key in the Authorization header.
          </p>

          <div className="space-y-4">
            <CodeBlock
              title="JavaScript / TypeScript"
              code={`async function trackEvent(type: string, metadata: object) {
  await fetch('${typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':3001') : 'http://localhost:3001'}/events', {
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
        '${typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':3001') : 'http://localhost:3001'}/events',
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
              code={`curl -X POST ${typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':3001') : 'http://localhost:3001'}/events \\
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
        "${typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':3001') : 'http://localhost:3001'}/events",
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
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="font-medium">Event Schema</h2>
        </div>
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="pb-2">Field</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Required</th>
                <th className="pb-2">Description</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr>
                <td className="py-2 font-mono text-blue-400">type</td>
                <td>string</td>
                <td>Yes</td>
                <td>Event type (e.g., &quot;payment_failed&quot;)</td>
              </tr>
              <tr>
                <td className="py-2 font-mono text-blue-400">metadata</td>
                <td>object</td>
                <td>No</td>
                <td>Additional data about the event</td>
              </tr>
              <tr>
                <td className="py-2 font-mono text-blue-400">timestamp</td>
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

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="bg-[var(--background)] rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-xs text-gray-400">{title}</span>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-xs text-gray-500 hover:text-white"
        >
          Copy
        </button>
      </div>
      <pre className="p-4 text-xs overflow-x-auto text-gray-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}
