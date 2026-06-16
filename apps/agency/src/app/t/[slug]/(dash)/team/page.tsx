"use client";

import { useState } from "react";
import { FX_AGENCIES } from "@nova/shared";
import { PageHeader, Badge, Table, Td } from "@/components/ui";
import { SlideOver, Field, TextInput, Select, PrimaryButton, GhostButton } from "@/components/overlay";

/** Team — invites via modal; wires to POST /v1/agencies/me/members (Phase 1 completion). */
export default function TeamPage() {
  const acme = FX_AGENCIES.find((a) => a.slug === "acme")!;
  const [members, setMembers] = useState(acme.members);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function invite() {
    setMembers((m) => [...m, { name: name || email.split("@")[0], email, role: "MEMBER" as const }]);
    setName(""); setEmail(""); setOpen(false);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Team"
        desc="People with access to this agency dashboard. Members view everything; owners manage payouts and team."
        action={<PrimaryButton onClick={() => setOpen(true)} className="px-3.5">+ Invite member</PrimaryButton>}
      />

      <Table head={["Name", "Email", "Role", ""]}>
        {members.map((m) => (
          <tr key={m.email} className="hover:bg-zinc-100">
            <Td className="font-medium">{m.name}</Td>
            <Td className="text-zinc-500">{m.email}</Td>
            <Td><Badge value={m.role} /></Td>
            <Td className="text-right">
              {m.role !== "OWNER" && <button className="text-xs text-zinc-400 hover:text-danger-600">Remove</button>}
            </Td>
          </tr>
        ))}
      </Table>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title="Invite a team member"
        desc="They'll receive an email invite to set their password."
        footer={
          <>
            <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={invite} disabled={!email.includes("@")}>Send invite</PrimaryButton>
          </>
        }
      >
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Colleague's name" />
        </Field>
        <Field label="Email">
          <TextInput value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="colleague@agency.com" />
        </Field>
        <Field label="Role" hint="Owners can manage payout methods and the team. Members have read access to everything.">
          <Select defaultValue="MEMBER">
            <option value="MEMBER">Member</option>
            <option value="OWNER">Owner</option>
          </Select>
        </Field>
      </SlideOver>
    </div>
  );
}
