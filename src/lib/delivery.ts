export type Stage = 'placed' | 'packed' | 'on_the_way' | 'delivered';

export const STAGE_LABELS: Record<Stage, string> = {
  placed: 'Order placed',
  packed: 'Packed',
  on_the_way: 'On the way',
  delivered: 'Delivered',
};

export const STAGE_ORDER: Stage[] = ['placed', 'packed', 'on_the_way', 'delivered'];

/** Status is derived from elapsed time so it survives reloads without a cron. */
export function stageFor(elapsedMin: number, etaMin: number): Stage {
  if (etaMin <= 0) return 'delivered';
  const f = elapsedMin / etaMin;
  return f >= 1 ? 'delivered' : f >= 0.5 ? 'on_the_way' : f >= 0.2 ? 'packed' : 'placed';
}

export const riderProgress = (elapsedMin: number, etaMin: number): number =>
  Math.min(1, Math.max(0, (elapsedMin / etaMin - 0.5) / 0.5));

export function minutesRemaining(elapsedMin: number, etaMin: number): number {
  return Math.max(0, Math.ceil(etaMin - elapsedMin));
}

export function stageIndex(stage: Stage): number {
  return STAGE_ORDER.indexOf(stage);
}

/** Server time offset, kept so a wrong device clock cannot skew the tracker. */
export function clockOffset(serverIso: string, deviceNow = Date.now()): number {
  return new Date(serverIso).getTime() - deviceNow;
}

export function elapsedMinutes(createdAtIso: string, now: number, offset = 0): number {
  return Math.max(0, (now + offset - new Date(createdAtIso).getTime()) / 60000);
}
