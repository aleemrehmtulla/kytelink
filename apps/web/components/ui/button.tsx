import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-pill font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground not-disabled:hover:bg-primary/90",
        secondary: "border border-border bg-card text-muted-foreground not-disabled:hover:bg-tint",
        ghost: "text-foreground not-disabled:hover:bg-tint",
        accent: "bg-accent text-accent-foreground not-disabled:hover:bg-accent-hover",
        danger: "border border-danger-border bg-card text-danger not-disabled:hover:bg-danger-subtle",
        "danger-ghost": "text-danger not-disabled:hover:bg-danger-subtle",
        link: "text-accent underline-offset-4 not-disabled:hover:underline",
      },
      size: {
        sm: "h-8 gap-1.5 px-4 text-sm [&_svg]:size-4",
        md: "h-10 gap-2 px-5 text-sm [&_svg]:size-4",
        lg: "h-11 gap-2 px-6 text-[0.95rem] [&_svg]:size-[1.05rem]",
        icon: "size-9 [&_svg]:size-4",
        "icon-sm": "size-8 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  block?: boolean;
  asChild?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading = false, block = false, asChild = false, disabled, className, children, ...rest },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size }), block && "w-full", className);

  // Slot (asChild) requires a single element child, so it can't receive the
  // spinner sibling — pass the child straight through in that mode.
  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...rest}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn("relative", classes)}
      {...rest}
    >
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={16} className="border-current/30 border-t-current" />
        </span>
      ) : null}
      <span className={cn("contents", loading && "invisible")}>{children}</span>
    </button>
  );
});
