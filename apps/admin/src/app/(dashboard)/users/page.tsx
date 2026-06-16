"use client";

import { useState } from "react";
import Link from "next/link";
import { FX_ADMIN_USERS, FX_ROLES } from "@nova/shared";
import { PageHeader, Badge, Table, Td } from "@/components/ui";
import { SlideOver, Field, TextInput, PrimaryButton, GhostButton } from "@/components/overlay";

/** Users — invites via modal with role checkboxes; wires to POST /v1/admin/users [users:write]. */
export default function UsersPage() {
  const [users, setUsers] = useState(FX_ADMIN_USERS);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>(["SUPPORT"]);

  function invite() {
    setUsers((u) => [
      ...u,
      { id: `u_${u.length + 1}`, name: name || email.split("@")[0], email, roles, isActive: true, lastActiveAt: "invited" },
    ]);
    setName(""); setEmail(""); setRoles(["SUPPORT"]); setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Users"
        desc="Platform operators. Access is the union of assigned role permissions."
        action={<PrimaryButton onClick={() => setOpen(true)} className="px-3.5">+ Invite user</PrimaryButton>}
      />
      <p className="mb-4 text-sm text-zinc-500">
        Manage permission sets on the <Link href="/roles" className="text-brand-600 hover:underline">Roles</Link> page.
      </p>
      <Table head={["Name", "Email", "Roles", "Status", "Last active"]}>
        {users.map((u) => (
          <tr key={u.id} className="hover:bg-zinc-100">
            <Td className="font-medium">{u.name}</Td>
            <Td className="text-zinc-500">{u.email}</Td>
            <Td><span className="flex gap-1.5">{u.roles.map((r) => <Badge key={r} value={r} />)}</span></Td>
            <Td><Badge value={u.isActive ? "ACTIVE" : "SUSPENDED"} /></Td>
            <Td className="text-xs text-zinc-500">{u.lastActiveAt}</Td>
          </tr>
        ))}
      </Table>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title="Invite a platform user"
        desc="They'll receive an email invite to set their password."
        footer={
          <>
            <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={invite} disabled={!email.includes("@") || roles.length === 0}>
              Send invite
            </PrimaryButton>
          </>
        }
      >
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Team member's name" />
        </Field>
        <Field label="Email">
          <TextInput value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@nova-apps.dev" />
        </Field>
        <Field label="Roles" hint="Access is the union of selected roles.">
          <div className="space-y-2">
            {FX_ROLES.map((r) => (
              <label key={r.name} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${roles.includes(r.name) ? "border-zinc-900/30 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"}`}>
                <input
                  type="checkbox"
                  checked={roles.includes(r.name)}
                  onChange={() => setRoles((rs) => (rs.includes(r.name) ? rs.filter((x) => x !== r.name) : [...rs, r.name]))}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                />
                <span>
                  <span className="block text-body font-semibold">{r.name}</span>
                  <span className="text-xs text-zinc-500">{r.description}</span>
                </span>
              </label>
            ))}
          </div>
        </Field>
      </SlideOver>
    </div>
  );
}
