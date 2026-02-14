"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiKeys, createApiKey, deleteApiKey } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

const ALL_SCOPES = [
  "events:read",
  "events:write",
  "rules:read",
  "rules:write",
  "notifications:read",
  "api-keys:read",
  "api-keys:write",
] as const;

export default function ApiKeysPage() {
  const { user, org } = useAuth();
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState("never");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);

  const isOwner = org?.role === "owner";
  const isAdmin = org?.role === "admin" || isOwner;

  const { data, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => getApiKeys(),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: ({
      name,
      expiresIn,
      scopes,
    }: {
      name: string;
      expiresIn?: string;
      scopes?: string[];
    }) => createApiKey(name, expiresIn, scopes),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setShowNewKey(result.key);
      setNewKeyName("");
      setNewKeyExpiry("never");
      setNewKeyScopes([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  return (
    <div className="space-y-6">
      {/* Newly created key */}
      {showNewKey && (
        <div className="bg-[var(--success)]/10 border border-[var(--success)] rounded-lg p-4">
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
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="font-medium mb-4">Create New API Key</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                name: newKeyName,
                expiresIn: newKeyExpiry === "never" ? undefined : newKeyExpiry,
                scopes: newKeyScopes.length > 0 ? newKeyScopes : undefined,
              });
            }}
          >
            <div className="flex gap-2 mb-3">
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
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-2">
                Scopes <span className="text-gray-500">(empty = full access)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_SCOPES.map((scope) => (
                  <label
                    key={scope}
                    className={`text-xs px-2 py-1 rounded border cursor-pointer select-none transition-colors ${
                      newKeyScopes.includes(scope)
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                        : "border-[var(--border)] text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={newKeyScopes.includes(scope)}
                      onChange={(e) =>
                        setNewKeyScopes(
                          e.target.checked
                            ? [...newKeyScopes, scope]
                            : newKeyScopes.filter((s) => s !== scope)
                        )
                      }
                    />
                    {scope}
                  </label>
                ))}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* API Keys list */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg">
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
                      <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                        Expired
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {key.keyPrefix} | Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt &&
                      ` | Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    {key.expiresAt &&
                      ` | Expires ${new Date(key.expiresAt).toLocaleDateString()}`}
                  </div>
                  {key.scopes && key.scopes.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {key.scopes.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-500 mt-1">Full access</div>
                  )}
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
    </div>
  );
}
