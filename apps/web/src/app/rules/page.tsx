"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getRules, createRule, deleteRule, updateRule, type RuleItem } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function RulesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RuleItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rules"],
    queryFn: () => getRules(),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (rule: Omit<RuleItem, "id">) => createRule(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      setIsCreating(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      updateRule(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules"] }),
  });

  if (authLoading || !user) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Rules</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primary)]/80"
        >
          New Rule
        </button>
      </div>

      {isCreating && (
        <CreateRuleForm
          onSubmit={(rule) => createMutation.mutate(rule)}
          onCancel={() => setIsCreating(false)}
          isLoading={createMutation.isPending}
          error={createMutation.error?.message}
        />
      )}

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg">
        {isLoading ? (
          <div className="p-4 text-gray-400">Loading rules...</div>
        ) : data?.rules.length === 0 ? (
          <div className="p-4 text-gray-400">No rules created yet.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {data?.rules.map((rule) => (
              <div key={rule.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({ id: rule.id, enabled: !rule.enabled })
                      }
                      className={`w-10 h-6 rounded-full transition-colors ${
                        rule.enabled ? "bg-[var(--success)]" : "bg-gray-600"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${
                          rule.enabled ? "translate-x-4" : ""
                        }`}
                      />
                    </button>
                    <span className="font-medium">{rule.name}</span>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(rule)}
                    className="text-gray-400 hover:text-[var(--error)]"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-sm text-gray-400">
                  When <span className="text-[var(--primary)]">{rule.eventType}</span>{" "}
                  {rule.condition.replace("_", " ")} {rule.threshold} times in {rule.windowSeconds}s
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Actions: {rule.actions.map((a) => a.channel).join(", ")} | Cooldown:{" "}
                  {rule.cooldownSeconds}s
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Rule"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function CreateRuleForm({
  onSubmit,
  onCancel,
  isLoading,
  error,
}: {
  onSubmit: (rule: Omit<RuleItem, "id">) => void;
  onCancel: () => void;
  isLoading: boolean;
  error?: string;
}) {
  const [form, setForm] = useState({
    name: "",
    eventType: "",
    condition: "count_gte",
    threshold: 5,
    windowSeconds: 60,
    cooldownSeconds: 60,
    webhookUrl: "",
    discordWebhookUrl: "",
    slackWebhookUrl: "",
    emailTo: "",
    inApp: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const actions: RuleItem["actions"] = [];
    if (form.inApp) {
      actions.push({ channel: "in_app", config: {} });
    }
    if (form.discordWebhookUrl) {
      actions.push({ channel: "discord", config: { webhookUrl: form.discordWebhookUrl } });
    }
    if (form.webhookUrl) {
      actions.push({ channel: "webhook", config: { url: form.webhookUrl } });
    }
    if (form.slackWebhookUrl) {
      actions.push({ channel: "slack", config: { webhookUrl: form.slackWebhookUrl } });
    }
    if (form.emailTo) {
      actions.push({ channel: "email", config: { to: form.emailTo } });
    }
    onSubmit({
      name: form.name,
      eventType: form.eventType,
      condition: form.condition,
      threshold: form.threshold,
      windowSeconds: form.windowSeconds,
      cooldownSeconds: form.cooldownSeconds,
      actions,
      enabled: true,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 mb-6"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Rule Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Event Type</label>
          <input
            type="text"
            value={form.eventType}
            onChange={(e) => setForm({ ...form, eventType: e.target.value })}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2"
            placeholder="checkout_failed"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Condition</label>
          <select
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2"
          >
            <option value="count_gte">Count &gt;= Threshold</option>
            <option value="count_gt">Count &gt; Threshold</option>
            <option value="count_eq">Count = Threshold</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Threshold</label>
          <input
            type="number"
            value={form.threshold}
            onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2"
            min={1}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Window (seconds)</label>
          <input
            type="number"
            value={form.windowSeconds}
            onChange={(e) => setForm({ ...form, windowSeconds: Number(e.target.value) })}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2"
            min={1}
            max={86400}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Cooldown (seconds)</label>
          <input
            type="number"
            value={form.cooldownSeconds}
            onChange={(e) => setForm({ ...form, cooldownSeconds: Number(e.target.value) })}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2"
            min={0}
            required
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">Discord Webhook URL</label>
        <input
          type="url"
          value={form.discordWebhookUrl}
          onChange={(e) => setForm({ ...form, discordWebhookUrl: e.target.value })}
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2"
          placeholder="https://discord.com/api/webhooks/..."
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">Slack Webhook URL</label>
        <input
          type="url"
          value={form.slackWebhookUrl}
          onChange={(e) => setForm({ ...form, slackWebhookUrl: e.target.value })}
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2"
          placeholder="https://hooks.slack.com/services/..."
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">Email Alert Address</label>
        <input
          type="email"
          value={form.emailTo}
          onChange={(e) => setForm({ ...form, emailTo: e.target.value })}
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2"
          placeholder="alerts@example.com"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">Generic Webhook URL</label>
        <input
          type="url"
          value={form.webhookUrl}
          onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2"
          placeholder="https://..."
        />
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.inApp}
            onChange={(e) => setForm({ ...form, inApp: e.target.checked })}
          />
          <span className="text-sm text-gray-400">In-app notification</span>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-[var(--primary)] text-white px-4 py-2 rounded hover:bg-[var(--primary)]/80 disabled:opacity-50"
        >
          {isLoading ? "Creating..." : "Create Rule"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded border border-[var(--border)] hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
