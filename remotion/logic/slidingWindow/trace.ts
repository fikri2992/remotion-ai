export type SlidingWindowStep =
  | { t: number; type: 'moveRight'; index: number; char: string }
  | { t: number; type: 'addToSet'; char: string }
  | { t: number; type: 'foundDuplicate'; char: string; atIndex: number }
  | { t: number; type: 'moveLeftUntil'; fromIndex: number; stopAtIndex: number }
  | { t: number; type: 'updateBest'; start: number; end: number };

export interface TraceResult {
  steps: SlidingWindowStep[];
  duration: number; // frames
}

export interface TraceConfig {
  durations?: {
    moveRight?: number;
    add?: number;
    duplicate?: number;
    moveLeftEach?: number; // per index advanced for timing estimate
    updateBest?: number;
  };
  fps?: number;
  tailSeconds?: number; // seconds of buffer at the end
}

const defaultDurations = {
  moveRight: 12,
  add: 6,
  duplicate: 10,
  moveLeftEach: 8,
  updateBest: 8,
};

export const baseFps = 30;
export const durationsForFps = (fps: number, base: number = baseFps) => {
  const scale = fps / base;
  const round = (n: number) => Math.max(1, Math.round(n * scale));
  return {
    moveRight: round(defaultDurations.moveRight),
    add: round(defaultDurations.add),
    duplicate: round(defaultDurations.duplicate),
    moveLeftEach: round(defaultDurations.moveLeftEach),
    updateBest: round(defaultDurations.updateBest),
  } as Required<NonNullable<TraceConfig['durations']>>;
};

export const traceLongestSubstring = (s: string, cfg: TraceConfig = {}): TraceResult => {
  const D = { ...defaultDurations, ...(cfg.durations ?? {}) };
  const steps: SlidingWindowStep[] = [];

  let t = 0;
  let left = 0;
  let bestLen = 0;
  const lastSeen = new Map<string, number>();

  for (let right = 0; right < s.length; right++) {
    const char = s[right];

    // Move right pointer
    steps.push({ t, type: 'moveRight', index: right, char });
    t += D.moveRight;

    const prevIndex = lastSeen.get(char);
    if (prevIndex !== undefined && prevIndex >= left) {
      // Duplicate found within window
      steps.push({ t, type: 'foundDuplicate', char, atIndex: right });
      t += D.duplicate;

      const newLeft = prevIndex + 1;
      steps.push({ t, type: 'moveLeftUntil', fromIndex: left, stopAtIndex: newLeft });
      // duration proportional to distance moved
      t += Math.max(1, newLeft - left) * D.moveLeftEach;
      left = newLeft;
    }

    // Add to set
    steps.push({ t, type: 'addToSet', char });
    t += D.add;

    // Update best if needed
    const currLen = right - left + 1;
    if (currLen > bestLen) {
      bestLen = currLen;
      steps.push({ t, type: 'updateBest', start: left, end: right });
      t += D.updateBest;
    }

    lastSeen.set(char, right);
  }

  // Give some buffer at the end, scaled by fps
  const tailSec = cfg.tailSeconds ?? 1;
  const fpsUsed = cfg.fps ?? baseFps;
  return { steps, duration: t + Math.max(1, Math.round(tailSec * fpsUsed)) };
};
