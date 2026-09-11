export type ProgressStatus = "not_started" | "in_progress" | "done";

/** Canonical status: it is derived only from computed progress. */
export function statusForProgress(progressPercent: number): ProgressStatus {
  if (progressPercent >= 100) return "done";
  if (progressPercent > 0) return "in_progress";
  return "not_started";
}

export function progressFromSteps(
  steps: ReadonlyArray<{ completedAt: string | null }>,
): number {
  if (steps.length === 0) return 0;
  return Math.round(
    (steps.filter((step) => step.completedAt !== null).length / steps.length) * 100,
  );
}

/** A main quest is the unweighted average of its direct subquest progress. */
export function progressFromSubquests(progress: readonly number[]): number {
  if (progress.length === 0) return 0;
  return Math.round(progress.reduce((total, value) => total + Math.min(100, Math.max(0, value)), 0) / progress.length);
}
