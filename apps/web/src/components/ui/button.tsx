import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-gray-800 to-black text-white border border-gray-200 shadow-xs hover:bg-gradient-to-l hover:from-gray-700 hover:to-gray-900 active:bg-gradient-to-l active:from-gray-700 active:to-gray-900",
        destructive:
          "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-xs hover:bg-gradient-to-l hover:from-red-500 hover:to-red-600 active:bg-gradient-to-l active:from-red-500 active:to-red-600 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-gradient-to-r from-white to-gray-50 text-gray-900 shadow-xs hover:bg-gradient-to-l hover:from-gray-50 hover:to-white hover:text-gray-700 active:bg-gradient-to-l active:from-gray-50 active:to-white active:text-gray-700 dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 shadow-xs hover:bg-gradient-to-l hover:from-gray-200 hover:to-gray-100 active:bg-gradient-to-l active:from-gray-200 active:to-gray-100",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...(props as any)}
    />
  )
}

export { Button, buttonVariants }
