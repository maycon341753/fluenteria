import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_0_0_hsl(217_91%_45%)] hover:shadow-[0_2px_0_0_hsl(217_91%_45%)] hover:translate-y-[2px] rounded-2xl",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_4px_0_0_hsl(0_84%_45%)] hover:shadow-[0_2px_0_0_hsl(0_84%_45%)] hover:translate-y-[2px] rounded-2xl",
        outline: "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-2xl",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-2xl",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-2xl",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-[0_4px_0_0_hsl(142_71%_30%)] hover:shadow-[0_2px_0_0_hsl(142_71%_30%)] hover:translate-y-[2px] rounded-2xl",
        gamification: "bg-gamification text-gamification-foreground hover:bg-gamification/90 shadow-[0_4px_0_0_hsl(48_96%_38%)] hover:shadow-[0_2px_0_0_hsl(48_96%_38%)] hover:translate-y-[2px] rounded-2xl",
        hero: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_6px_0_0_hsl(217_91%_45%)] hover:shadow-[0_3px_0_0_hsl(217_91%_45%)] hover:translate-y-[3px] rounded-2xl text-lg",
        referral: "bg-referral text-referral-foreground hover:bg-referral/90 shadow-[0_4px_0_0_hsl(258_90%_50%)] hover:shadow-[0_2px_0_0_hsl(258_90%_50%)] hover:translate-y-[2px] rounded-2xl",
      },
      size: {
        default: "h-12 px-6 py-2 text-base",
        sm: "h-10 px-4 text-sm",
        lg: "h-14 px-10 text-lg",
        xl: "h-16 px-12 text-xl",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
