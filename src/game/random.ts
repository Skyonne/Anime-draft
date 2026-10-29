/** Uniform integer in [0, max); rejection avoids modulo bias. */
export function randomInt(max: number, draw = () => crypto.getRandomValues(new Uint32Array(1))[0]): number {
  if (!Number.isInteger(max) || max < 1 || max > 0x100000000) throw new Error('Plage invalide');
  const limit = Math.floor(0x100000000 / max) * max;
  let value: number;
  do { value = draw(); } while (value >= limit);
  return value % max;
}

/** Partial Fisher–Yates: every ordered six-character sample is equally likely. */
export function drawSix(ids: readonly string[], integer = randomInt): string[] {
  if (ids.length < 6 || new Set(ids).size !== ids.length) throw new Error('Au moins six identifiants uniques sont requis');
  const pool = [...ids];
  for (let i = 0; i < 6; i++) {
    const j = i + integer(pool.length - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 6);
}
