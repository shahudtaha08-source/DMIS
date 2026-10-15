import { Hammer } from "lucide-react";
import type { ModuleDef } from "../config/modules";
import { EmptyState } from "../components/ui";

/** Honest placeholder for a module that is not built yet — no fake data. */
export function ModulePlaceholderPage({ module: m }: { module: ModuleDef }) {
  return <EmptyState icon={m.icon ?? Hammer} title={`${m.label} is under construction`} description={`${m.description} Scheduled for Chunk ${m.chunk}.`} />;
}
