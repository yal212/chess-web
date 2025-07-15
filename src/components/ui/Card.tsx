'use client'

import React from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  hover?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, hover = false, ...props }, ref) => {
    const baseStyles = 'rounded-xl transition-all duration-200'
    
    const variants = {
      default: 'bg-white border border-gray-200',
      elevated: 'bg-white shadow-lg hover:shadow-xl',
      outlined: 'bg-white border-2 border-gray-300',
      gradient: 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
    }
    
    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10'
    }

    const hoverStyles = hover ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : ''

    return (
      <div
        className={cn(baseStyles, variants[variant], paddings[padding], hoverStyles, className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card
