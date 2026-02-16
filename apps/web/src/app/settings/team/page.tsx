"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMembers, inviteMember, removeMember } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function TeamPage() {
  const { user, org } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  const isOwner = org?.role === "owner";

  const { data: membersData } = useQuery({
    queryKey: ["members"],
    queryFn: () => getMembers(),
    enabled: !!user,
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) => inviteMember(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setInviteEmail("");
      setInviteRole("member");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => removeMember(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg">
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
              {inviteMutation.error instanceof Error
                ? inviteMutation.error.message
                : "Invite failed"}
            </p>
          )}
          {inviteMutation.isSuccess && (
            <p className="text-xs text-green-400 mt-2">
              Invite sent! Check the server console for the token.
            </p>
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
                <span
                  className={
                    m.role === "owner"
                      ? "text-yellow-400"
                      : m.role === "admin"
                      ? "text-blue-400"
                      : "text-gray-400"
                  }
                >
                  {m.role}
                </span>
              </div>
            </div>
            {isOwner && m.userId !== user?.id && (
              <button
                onClick={() => setRemoveTarget({ id: m.id, name: m.name ?? m.email })}
                className="text-gray-400 hover:text-[var(--error)] text-sm"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Member"
        description={`Remove "${removeTarget?.name}" from the team? They will lose access immediately.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (removeTarget) removeMemberMutation.mutate(removeTarget.id);
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
