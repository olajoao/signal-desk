"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getRules, createRule, deleteRule, updateRule, type RuleItem } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";

const CONDITION_SYMBOLS: Record<string, string> = {
  count_gte: "≥",
  count_gt: ">",
  count_eq: "=",
};

const CHANNELS = ["in_app", "discord", "slack", "email", "webhook"] as const;

const CHANNEL_LABELS: Record<string, string> = {
  in_app: "In-App",
  discord: "Discord",
  slack: "Slack",
  email: "Email",
  webhook: "Webhook",
};

interface FormState {
  name: string;
  eventType: string;
  condition: string;
  threshold: number;
  windowSeconds: number;
  cooldownSeconds: number;
  channels: Record<string, boolean>;
  discordUrl: string;
  slackUrl: string;
  emailTo: string;
  webhookUrl: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  eventType: "",
  condition: "count_gte",
  threshold: 5,
  windowSeconds: 60,
  cooldownSeconds: 60,
  channels: { in_app: true, discord: false, slack: false, email: false, webhook: false },
  discordUrl: "",
  slackUrl: "",
  emailTo: "",
  webhookUrl: "",
};

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

  if (authLoading || !user) return <div className="text-[var(--muted)]">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Rules</h1>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="bg-[var(--accent)] text-black px-4 py-2 rounded font-medium hover:bg-[var(--accent-dim)]"
          >
            New Rule
          </button>
        )}
      </div>

      {isCreating && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
            New Rule
          </h2>
          <CreateRuleForm
            onSubmit={(rule) => createMutation.mutate(rule)}
            onCancel={() => {
              setIsCreating(false);
              createMutation.reset();
            }}
            isLoading={createMutation.isPending}
            error={createMutation.error?.message}
          />
        </>
      )}

      <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
        Active Rules
      </h2>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded">
        {isLoading ? (
          <div className="p-6 text-[var(--muted)]">Loading rules...</div>
        ) : data?.rules.length === 0 ? (
          <EmptyState onCreateClick={() => setIsCreating(true)} />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {data?.rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() =>
                  toggleMutation.mutate({ id: rule.id, enabled: !rule.enabled })
                }
                onDelete={() => setDeleteTarget(rule)}
              />
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

/* ─── Empty State ─── */

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="py-16 px-6 flex flex-col items-center text-center">
      <p className="text-lg font-semibold mb-1">No rules yet</p>
      <p className="text-sm text-[var(--muted)] mb-5">
        Rules define when SignalDesk should alert you
      </p>
      <button
        onClick={onCreateClick}
        className="bg-[var(--accent)] text-black px-4 py-2 rounded font-medium hover:bg-[var(--accent-dim)]"
      >
        Create your first rule
      </button>
    </div>
  );
}

/* ─── Rule Card ─── */

function RuleCard({
  rule,
  onToggle,
  onDelete,
}: {
  rule: RuleItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const symbol = CONDITION_SYMBOLS[rule.condition] ?? rule.condition;

  return (
    <div className="px-4 py-3 flex items-center gap-4">
      {/* Left: toggle + name */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggle}
          className={`w-10 h-6 rounded-full transition-colors ${
            rule.enabled ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
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

      {/* Center: natural language condition */}
      <div className="flex-1 min-w-0 font-mono text-sm text-[var(--muted)]">
        <span className="text-[var(--accent)]">{rule.eventType}</span>{" "}
        {symbol} {rule.threshold} in {rule.windowSeconds}s
        <span className="text-[var(--dim)] ml-3">cooldown {rule.cooldownSeconds}s</span>
      </div>

      {/* Right: channel badges + delete */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex gap-1.5">
          {rule.actions.map((a) => (
            <span
              key={a.channel}
              className="bg-[var(--accent-muted)] text-[var(--accent)] font-mono text-xs px-2 py-0.5 rounded"
            >
              {CHANNEL_LABELS[a.channel] ?? a.channel}
            </span>
          ))}
        </div>
        <button
          onClick={onDelete}
          className="text-[var(--muted)] hover:text-[var(--error)] ml-2 text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* ─── Create Rule Form ─── */

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
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const activeChannels = Object.entries(form.channels).filter(([, v]) => v);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const actions: RuleItem["actions"] = [];

    for (const [ch] of activeChannels) {
      switch (ch) {
        case "in_app":
          actions.push({ channel: "in_app", config: {} });
          break;
        case "discord":
          actions.push({ channel: "discord", config: { webhookUrl: form.discordUrl } });
          break;
        case "slack":
          actions.push({ channel: "slack", config: { webhookUrl: form.slackUrl } });
          break;
        case "email":
          actions.push({ channel: "email", config: { to: form.emailTo } });
          break;
        case "webhook":
          actions.push({ channel: "webhook", config: { url: form.webhookUrl } });
          break;
      }
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

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const toggleChannel = (ch: string) =>
    setForm((prev) => ({
      ...prev,
      channels: { ...prev.channels, [ch]: !prev.channels[ch] },
    }));

  const inputBase =
    "bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 focus:border-[var(--accent)] focus:outline-none";

  const inlineInput =
    "bg-[var(--background)] border-b border-[var(--border)] px-2 py-1 focus:border-[var(--accent)] focus:outline-none text-center font-mono";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--card)] border border-[var(--border)] rounded mb-6"
    >
      {/* ── Section 1: TRIGGER ── */}
      <div className="p-5 border-b border-[var(--border)]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-4">
          Trigger
        </p>

        {/* Row 1: Rule name */}
        <div className="mb-4">
          <label className="block text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
            Rule Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            className={`${inputBase} w-full font-mono`}
            placeholder="e.g. checkout-failures"
            required
          />
        </div>

        {/* Row 2: Natural language condition builder */}
        <div className="mb-4">
          <label className="block text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
            Condition
          </label>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="text-[var(--muted)]">When</span>
            <input
              type="text"
              value={form.eventType}
              onChange={(e) => set({ eventType: e.target.value })}
              className={`${inlineInput} w-40`}
              placeholder="payment_failed"
              required
            />
            <span className="text-[var(--muted)]">occurs</span>
            <select
              value={form.condition}
              onChange={(e) => set({ condition: e.target.value })}
              className="bg-[var(--background)] border-b border-[var(--border)] px-2 py-1 focus:border-[var(--accent)] focus:outline-none font-mono text-center appearance-none cursor-pointer"
            >
              <option value="count_gte">≥</option>
              <option value="count_gt">&gt;</option>
              <option value="count_eq">=</option>
            </select>
            <input
              type="number"
              value={form.threshold}
              onChange={(e) => set({ threshold: Number(e.target.value) })}
              className={`${inlineInput} w-16`}
              min={1}
              required
            />
            <span className="text-[var(--muted)]">times in</span>
            <input
              type="number"
              value={form.windowSeconds}
              onChange={(e) => set({ windowSeconds: Number(e.target.value) })}
              className={`${inlineInput} w-20`}
              min={1}
              max={86400}
              required
            />
            <span className="text-[var(--muted)]">s</span>
          </div>
        </div>

        {/* Row 3: Cooldown */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--muted)]">Cooldown:</span>
          <input
            type="number"
            value={form.cooldownSeconds}
            onChange={(e) => set({ cooldownSeconds: Number(e.target.value) })}
            className={`${inlineInput} w-20`}
            min={0}
            max={86400}
            required
          />
          <span className="text-[var(--muted)]">s between alerts</span>
        </div>
      </div>

      {/* ── Section 2: NOTIFY ── */}
      <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-4">
          Notify
        </p>

        {/* Channel toggle chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CHANNELS.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => toggleChannel(ch)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                form.channels[ch]
                  ? "bg-[var(--accent)] text-black font-medium"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)]"
              }`}
            >
              {CHANNEL_LABELS[ch]}
            </button>
          ))}
        </div>

        {/* Progressive disclosure: config fields for active channels */}
        <div className="space-y-3">
          {form.channels.discord && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-[var(--muted)] w-20 shrink-0">Discord</label>
              <input
                type="url"
                value={form.discordUrl}
                onChange={(e) => set({ discordUrl: e.target.value })}
                className={`${inputBase} flex-1 text-sm`}
                placeholder="Discord webhook URL"
                required
              />
            </div>
          )}
          {form.channels.slack && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-[var(--muted)] w-20 shrink-0">Slack</label>
              <input
                type="url"
                value={form.slackUrl}
                onChange={(e) => set({ slackUrl: e.target.value })}
                className={`${inputBase} flex-1 text-sm`}
                placeholder="Slack webhook URL"
                required
              />
            </div>
          )}
          {form.channels.email && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-[var(--muted)] w-20 shrink-0">Email</label>
              <input
                type="email"
                value={form.emailTo}
                onChange={(e) => set({ emailTo: e.target.value })}
                className={`${inputBase} flex-1 text-sm`}
                placeholder="Alert email address"
                required
              />
            </div>
          )}
          {form.channels.webhook && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-[var(--muted)] w-20 shrink-0">Webhook</label>
              <input
                type="url"
                value={form.webhookUrl}
                onChange={(e) => set({ webhookUrl: e.target.value })}
                className={`${inputBase} flex-1 text-sm`}
                placeholder="Webhook URL"
                required
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-5 pb-5">
        {error && (
          <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
            {error}
          </div>
        )}
        {activeChannels.length === 0 && (
          <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-sm">
            Select at least one notification channel
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded border border-[var(--border)] hover:bg-white/5 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || activeChannels.length === 0}
            className="bg-[var(--accent)] text-black px-4 py-2 rounded font-medium hover:bg-[var(--accent-dim)] disabled:opacity-50 text-sm"
          >
            {isLoading ? "Creating..." : "Create Rule"}
          </button>
        </div>
      </div>
    </form>
  );
}
