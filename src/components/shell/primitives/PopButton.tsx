// PopButton — primary / secondary action button with retro pop feel.
// Primary = red brand fill (action / critical only, per 75/15/10 rule).
// Secondary = pink surface + red text (everyday actions, sourcing tasks).

import { ButtonHTMLAttributes, ReactNode } from "react";

export interface PopButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export default function PopButton({
  variant = "primary",
  leftIcon,
  rightIcon,
  children,
  className,
  ...rest
}: PopButtonProps) {
  const cls = variant === "primary" ? "gp-btn-primary" : "gp-btn-secondary";
  return (
    <button
      {...rest}
      className={[cls, className].filter(Boolean).join(" ")}
    >
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
    </button>
  );
}
