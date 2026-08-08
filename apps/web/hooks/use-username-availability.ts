import { useEffect, useState } from "react";
import { validateUsername } from "@kytelink/schemas";
import { useApp } from "../lib/app-context";
import { useDebouncedValue } from "./use-debounced-value";

type AvailabilityStatus = "idle" | "checking" | "available" | "unavailable";

export interface AvailabilityResult {
  status: AvailabilityStatus;
  reason: string | null;
  suggestions: string[];
}

const REASON_COPY: Record<string, string> = {
  empty: "Pick a username",
  too_long: "That's too long (max 30)",
  invalid_chars: "Only a–z, 0–9, dots, dashes and underscores",
  reserved: "That name is reserved",
  unsafe_dot: "A dot can't start or end it, repeat, or look like a file type",
  taken: "That's already taken",
};

export function useUsernameAvailability(raw: string, kyteId?: string): AvailabilityResult {
  const { api } = useApp();
  const debounced = useDebouncedValue(raw.trim().toLowerCase(), 350);
  const [result, setResult] = useState<AvailabilityResult>({
    status: "idle",
    reason: null,
    suggestions: [],
  });

  useEffect(() => {
    if (debounced.length === 0) {
      setResult({ status: "idle", reason: null, suggestions: [] });
      return;
    }
    const validation = validateUsername(debounced);
    if (!validation.ok) {
      setResult({ status: "unavailable", reason: REASON_COPY[validation.reason] ?? null, suggestions: [] });
      return;
    }
    let active = true;
    setResult((current) => ({ ...current, status: "checking" }));
    api.kyte
      .checkUsername({ username: debounced, kyteId })
      .then((check) => {
        if (!active) return;
        if (check.available) {
          setResult({ status: "available", reason: null, suggestions: [] });
        } else {
          setResult({
            status: "unavailable",
            reason: REASON_COPY[check.reason ?? "taken"] ?? "Unavailable",
            suggestions: check.suggestions,
          });
        }
      })
      .catch(() => {
        if (active) setResult({ status: "idle", reason: null, suggestions: [] });
      });
    return () => {
      active = false;
    };
  }, [debounced, kyteId, api]);

  return result;
}
