import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary/20 text-secondary-foreground hover:bg-secondary/30',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border-border text-foreground hover:bg-muted',
        success:
          'border-transparent bg-gradient-success text-white shadow-sm shadow-success/25 hover:shadow-md',
        warning:
          'border-transparent bg-gradient-warning text-white shadow-sm shadow-warning/25 hover:shadow-md',
        premium:
          'border-transparent bg-gradient-premium text-white shadow-md shadow-primary/20',
        live: 'border-transparent bg-gradient-live text-white shadow-sm shadow-blue-500/25 animate-pulse',
        ending:
          'border-transparent bg-gradient-ending text-white shadow-sm shadow-red-500/30 animate-pulse',
        muted:
          'border-transparent bg-muted text-muted-foreground hover:bg-muted/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
