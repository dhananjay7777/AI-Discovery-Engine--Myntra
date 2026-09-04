/** Cohen's kappa for two raters on categorical labels. */
export function cohensKappa(a: string[], b: string[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const n = a.length;
  let agree = 0;
  const countA = new Map<string, number>();
  const countB = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) agree += 1;
    countA.set(a[i], (countA.get(a[i]) ?? 0) + 1);
    countB.set(b[i], (countB.get(b[i]) ?? 0) + 1);
  }
  const po = agree / n;
  let pe = 0;
  const categories = new Set([...countA.keys(), ...countB.keys()]);
  for (const cat of categories) {
    pe += ((countA.get(cat) ?? 0) / n) * ((countB.get(cat) ?? 0) / n);
  }
  if (pe >= 1) return po >= 1 ? 1 : 0;
  return (po - pe) / (1 - pe);
}

export function accuracy(a: string[], b: string[]): number {
  if (a.length === 0) return 0;
  let match = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) match += 1;
  }
  return match / a.length;
}

export function precisionRecall(
  predicted: boolean[],
  actual: boolean[],
): { precision: number; recall: number } {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (let i = 0; i < predicted.length; i++) {
    if (predicted[i] && actual[i]) tp += 1;
    else if (predicted[i] && !actual[i]) fp += 1;
    else if (!predicted[i] && actual[i]) fn += 1;
  }
  return {
    precision: tp + fp === 0 ? 0 : tp / (tp + fp),
    recall: tp + fn === 0 ? 0 : tp / (tp + fn),
  };
}
