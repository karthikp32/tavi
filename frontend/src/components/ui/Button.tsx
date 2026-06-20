import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-tavi-navy text-white hover:bg-tavi-indigo",
  secondary: "bg-white text-tavi-navy border border-tavi-navy/20 hover:bg-tavi-pale-blue/40",
  ghost: "bg-transparent text-tavi-navy/80 hover:bg-tavi-pale-blue/40",
};

export function Button({
  variant = "primary",
  icon,
  trailingIcon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className ?? ""}`}
      {...rest}
    >
      {icon}
      {children}
      {trailingIcon}
    </button>
  );
}
