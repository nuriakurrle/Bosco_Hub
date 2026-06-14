"use client";
// components/ContractDraft.js — Vertrags- und Küchenplan-Buttons (nutzen das
// generische DraftButton-Modal).
import DraftButton from "@/components/DraftButton";
import { buildContractDraft } from "@/lib/contract";

export default function ContractButton({ booking, onSaveText }) {
  return (
    <DraftButton
      booking={booking}
      label="Vertrag"
      icon="doc"
      kind="secondary"
      title="Vertragsentwurf"
      build={buildContractDraft}
      initialText={booking.contractText || ""}
      onSave={onSaveText}
    />
  );
}
