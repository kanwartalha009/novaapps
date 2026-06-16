"use client";

import { useState } from "react";

/** Demo interaction — wires to POST /v1/admin/agencies/:id/approve in Phase 1 completion. */
export function ApproveAgencyButton() {
  const [approved, setApproved] = useState(false);
  if (approved) {
    return (
      <span className="rounded-md bg-success-50 px-3.5 py-2 text-sm font-semibold text-success-600">
        ✓ Approved (demo)
      </span>
    );
  }
  return (
    <button
      onClick={() => setApproved(true)}
      className="rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
    >
      Approve agency
    </button>
  );
}
