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
}

const defaultDurations = {
  moveRight: 12,
  add: 6,
  duplicate: 10,
  moveLeftEach: 8,
  updateBest: 8,
};

export const traceLongestSubstring = (s: string, cfg: TraceConfig = {}): TraceResult => {
  const D = { ...defaultDurations, ...(cfg.durations ?? {}) };
  const steps: SlidingWindowStep[] = [];

  let t = 0;
  let left = 0;
  let bestLen = 0;
  let bestStart = 0;
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
      bestStart = left;
      steps.push({ t, type: 'updateBest', start: left, end: right });
      t += D.updateBest;
    }

    lastSeen.set(char, right);
  }

  // Give some buffer at the end
  return { steps, duration: t + 30 };
};
