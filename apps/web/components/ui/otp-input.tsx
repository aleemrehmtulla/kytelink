import { OTPInput, type SlotProps } from "input-otp";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const LENGTH = 6;

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
}

function isOtherFieldFocused(target: EventTarget | null, input: HTMLInputElement): boolean {
  const candidates = [target, document.activeElement];
  return candidates.some(
    (node) =>
      node instanceof HTMLElement &&
      node !== input &&
      (node.isContentEditable ||
        node instanceof HTMLInputElement ||
        node instanceof HTMLTextAreaElement ||
        node instanceof HTMLSelectElement),
  );
}

function Slot(props: SlotProps) {
  return (
    <div
      className={cn(
        "flex h-12 w-10 items-center justify-center rounded-input border text-lg font-semibold text-foreground transition-colors",
        props.isActive ? "border-accent" : "border-border",
      )}
    >
      {props.char ?? (props.hasFakeCaret ? <span className="animate-pulse text-subtle-foreground">|</span> : null)}
    </div>
  );
}

export function OtpInput({ value, onChange, onComplete, disabled }: OtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = useRef({ value, onChange });
  useEffect(() => {
    latest.current = { value, onChange };
  });

  useEffect(() => {
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!/^\d$/.test(event.key)) return;
      if (document.activeElement === input) return;
      if (isOtherFieldFocused(event.target, input)) return;
      event.preventDefault();
      input.focus();
      latest.current.onChange((latest.current.value + event.key).slice(0, LENGTH));
    };
    const handlePaste = (event: ClipboardEvent) => {
      if (isOtherFieldFocused(event.target, input)) return;
      const code = (event.clipboardData?.getData("text") ?? "").replace(/\D/g, "").slice(0, LENGTH);
      if (!code) return;
      event.preventDefault();
      input.focus();
      latest.current.onChange(code);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("paste", handlePaste);
    };
  }, [disabled]);

  return (
    <OTPInput
      ref={inputRef}
      maxLength={LENGTH}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      disabled={disabled}
      containerClassName="flex items-center gap-2"
      render={({ slots }) => (
        <div className="flex gap-2">
          {slots.map((slot, index) => (
            <Slot key={index} {...slot} />
          ))}
        </div>
      )}
    />
  );
}
