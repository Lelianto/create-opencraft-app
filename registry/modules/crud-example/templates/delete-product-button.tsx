"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "{{import.sharedComponents}}/confirmation-dialog";
import type { ApiResponse } from "@/types/api";

/**
 * Delete a product behind an explicit confirmation step.
 *
 * The dialog is a UX guard against accidents — nothing more. The DELETE handler
 * independently verifies the session and record ownership, because a client can
 * always call the endpoint directly.
 */
export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    setPending(true);
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiResponse<{ id: string }>;
      if (payload.success) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <ConfirmationDialog
      title="Delete this product?"
      description={`"${name}" will be permanently removed. This cannot be undone.`}
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={onConfirm}
      trigger={
        <Button variant="ghost" size="sm" disabled={pending}>
          Delete
        </Button>
      }
    />
  );
}
