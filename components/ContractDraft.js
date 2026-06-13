"use client";
// components/ContractDraft.js — Vertrags- und Küchenplan-Buttons (nutzen das
// generische DraftButton-Modal).
import DraftButton from "@/components/DraftButton";
import { buildContractDraft } from "@/lib/contract";
import { buildMealPlan } from "@/lib/mealplan";

export default function ContractButton({ booking }) {
  return <DraftButton booking={booking} label="Vertrag" icon="doc" kind="secondary" title="Vertragsentwurf" build={buildContractDraft} />;
}

export function MealButton({ booking }) {
  return <DraftButton booking={booking} label="Küche" icon="meal" kind="ghost" title="Küchenplan" build={buildMealPlan} />;
}
