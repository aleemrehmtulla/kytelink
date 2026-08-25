import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useUsernameAvailability } from "../../../hooks/use-username-availability";
import { Button } from "../../ui/button";
import { Spinner } from "../../ui/spinner";

export interface SelectUsernameStepProps {
  username: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function SelectUsernameStep({ username, onChange, onNext }: SelectUsernameStepProps) {
  const availability = useUsernameAvailability(username);
  const canContinue = availability.status === "available";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">Claim your link</h1>
        <p className="mt-1.5 text-sm text-secondary">This is your address. You can change it later.</p>
      </div>

      <div
        className={cn(
          "flex items-stretch overflow-hidden rounded-input border bg-card text-sm transition-colors sm:text-base",
          availability.status === "available"
            ? "border-success"
            : availability.status === "unavailable"
              ? "border-danger"
              : "border-border",
        )}
      >
        <span className="flex shrink-0 items-center whitespace-nowrap border-r border-border bg-tint pl-4 pr-3 text-secondary">
          kytelink.com/
        </span>
        <input
          autoFocus
          value={username}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && canContinue && onNext()}
          placeholder="logan"
          className="h-12 w-full min-w-0 bg-transparent pl-3 pr-2 text-ink outline-none placeholder:text-faint"
        />
        <span className="mr-4 flex size-5 shrink-0 items-center justify-center self-center">
          {availability.status === "checking" ? (
            <Spinner size={18} />
          ) : availability.status === "available" ? (
            <Check className="size-5 text-success animate-in zoom-in duration-200" />
          ) : null}
        </span>
      </div>

      <div className="flex min-h-6 flex-col gap-2.5">
        <p
          className={cn(
            "text-[13px] leading-5",
            availability.reason ? "text-danger" : "text-faint",
          )}
        >
          {availability.reason ?? (
            <>
              Your page will live at kytelink.com/
              <span className="text-ink">{username.trim() || "yourname"}</span>
            </>
          )}
        </p>

        {availability.suggestions.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto">
            {availability.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onChange(suggestion)}
                className="h-7 shrink-0 cursor-pointer whitespace-nowrap rounded-pill border border-border px-3 text-[13px] text-secondary transition-colors hover:border-ink hover:text-ink"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Button variant="accent" block size="lg" disabled={!canContinue} onClick={onNext}>
        Continue
        <kbd className="flex h-5 items-center rounded-[5px] bg-white/20 px-1.5 font-sans text-[12px] font-medium">
          ↵
        </kbd>
      </Button>
    </div>
  );
}
