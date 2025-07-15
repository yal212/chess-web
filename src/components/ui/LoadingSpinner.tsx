'use client'

import React from 'react'
import { cn } from '@/utils/cn'

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'blue' | 'white' | 'gray' | 'purple'
  text?: string
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = 'md', color = 'blue', text, ...props }, ref) => {
    const sizes = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12'
    }
    
    const colors = {
      blue: 'border-blue-600',
      white: 'border-white',
      gray: 'border-gray-600',
      purple: 'border-purple-600'
    }

    return (
      <div
        className={cn('flex flex-col items-center justify-center space-y-2', className)}
        ref={ref}
        {...props}
      >
        <div
          className={cn(
            'animate-spin rounded-full border-2 border-t-transparent',
            sizes[size],
            colors[color]
          )}
        />
        {text && (
          <p className="text-sm text-gray-600 animate-pulse">{text}</p>
        )}
      </div>
    )
  }
)

LoadingSpinner.displayName = 'LoadingSpinner'

export default LoadingSpinner
