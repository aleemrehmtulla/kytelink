const SEPARATORS = new Set([" ", "-", "_", "/", "@", ".", ":", ",", "(", ")", "[", "]"]);

const SCORE_MATCH = 16;
const BONUS_FIRST_CHAR = 18;
const BONUS_AFTER_SEPARATOR = 14;
const BONUS_CAMEL_BOUNDARY = 12;
const BONUS_EXACT_CASE = 2;
const BONUS_CONSECUTIVE = 8;
const GAP_PENALTY_BASE = 2;
const TRAILING_PENALTY = 0.5;
const NO_MATCH = -1;

function isSeparator(char: string | undefined): boolean {
  return char !== undefined && SEPARATORS.has(char);
}

function isCamelBoundary(previous: string | undefined, current: string): boolean {
  if (previous === undefined) return false;
  const previousLower =
    previous === previous.toLowerCase() && previous !== previous.toUpperCase();
  const currentUpper =
    current !== current.toLowerCase() && current === current.toUpperCase();
  return previousLower && currentUpper;
}

function positionScore(text: string, index: number, queryChar: string): number {
  const char = text[index];
  if (char === undefined) return 0;
  let score = SCORE_MATCH;
  if (index === 0) score += BONUS_FIRST_CHAR;
  else if (isSeparator(text[index - 1])) score += BONUS_AFTER_SEPARATOR;
  else if (isCamelBoundary(text[index - 1], char)) score += BONUS_CAMEL_BOUNDARY;
  if (char === queryChar) score += BONUS_EXACT_CASE;
  return score;
}

/**
 * fzf-style subsequence score maximised with a small DP rather than a greedy
 * left-to-right scan, so `"corp"` scores higher against `"acme corp"` (word
 * boundary) than against `"scorpion"` (mid-word) instead of just matching first.
 */
export function fuzzyScore(text: string, query: string): number {
  if (query.length === 0) return 0;
  if (text.length === 0) return NO_MATCH;
  if (query.length > text.length) return NO_MATCH;

  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();

  let previousRow: number[] = new Array<number>(text.length).fill(
    Number.NEGATIVE_INFINITY,
  );

  for (let queryIndex = 0; queryIndex < needle.length; queryIndex += 1) {
    const needleChar = needle[queryIndex];
    const queryChar = query[queryIndex];
    if (needleChar === undefined || queryChar === undefined) return NO_MATCH;
    const row: number[] = new Array<number>(text.length).fill(Number.NEGATIVE_INFINITY);
    let anyMatch = false;

    for (let textIndex = queryIndex; textIndex < text.length; textIndex += 1) {
      if (haystack[textIndex] !== needleChar) continue;
      const here = positionScore(text, textIndex, queryChar);

      if (queryIndex === 0) {
        row[textIndex] = here;
        anyMatch = true;
        continue;
      }

      let best = Number.NEGATIVE_INFINITY;
      for (
        let previousIndex = queryIndex - 1;
        previousIndex < textIndex;
        previousIndex += 1
      ) {
        const carried = previousRow[previousIndex];
        if (carried === undefined || carried === Number.NEGATIVE_INFINITY) continue;
        const gap = textIndex - previousIndex - 1;
        const adjustment = gap === 0 ? BONUS_CONSECUTIVE : -(GAP_PENALTY_BASE + gap);
        const candidate = carried + here + adjustment;
        if (candidate > best) best = candidate;
      }
      if (best === Number.NEGATIVE_INFINITY) continue;
      row[textIndex] = best;
      anyMatch = true;
    }

    if (!anyMatch) return NO_MATCH;
    previousRow = row;
  }

  let total = Number.NEGATIVE_INFINITY;
  for (let textIndex = 0; textIndex < text.length; textIndex += 1) {
    const candidate = previousRow[textIndex];
    if (candidate === undefined || candidate === Number.NEGATIVE_INFINITY) continue;
    const withTrailing = candidate - (text.length - 1 - textIndex) * TRAILING_PENALTY;
    if (withTrailing > total) total = withTrailing;
  }
  if (total === Number.NEGATIVE_INFINITY) return NO_MATCH;
  return Math.max(0, total);
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  keys: (item: T) => string[],
): T[] {
  if (query.trim().length === 0) return [...items];
  const trimmed = query.trim();
  const scored: { item: T; order: number; score: number }[] = [];
  items.forEach((item, order) => {
    let best = NO_MATCH;
    for (const key of keys(item)) {
      const score = fuzzyScore(key, trimmed);
      if (score > best) best = score;
    }
    if (best >= 0) scored.push({ item, order, score: best });
  });
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  return scored.map((entry) => entry.item);
}
