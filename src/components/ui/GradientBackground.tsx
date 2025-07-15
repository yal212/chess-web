'use client'

import React from 'react'
import { cn } from '@/utils/cn'

interface GradientBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'blue' | 'purple' | 'chess' | 'sunset' | 'ocean'
  opacity?: 'light' | 'medium' | 'strong'
  animated?: boolean
  children?: React.ReactNode
}

const GradientBackground = React.forwardRef<HTMLDivElement, GradientBackgroundProps>(
  ({ className, variant = 'blue', opacity = 'medium', animated = false, children, ...props }, ref) => {
    const baseStyles = 'relative overflow-hidden'
    
    const variants = {
      blue: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600',
      purple: 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600',
      chess: 'bg-gradient-to-br from-gray-800 via-gray-900 to-black',
      sunset: 'bg-gradient-to-br from-orange-400 via-red-500 to-pink-600',
      ocean: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600'
    }
    
    const opacities = {
      light: 'opacity-30',
      medium: 'opacity-60',
      strong: 'opacity-90'
    }

    const animationStyles = animated ? 'animate-gradient-x bg-gradient-to-r bg-[length:200%_200%]' : ''

    return (
      <div
        className={cn(baseStyles, className)}
        ref={ref}
        {...props}
      >
        <div className={cn(variants[variant], opacities[opacity], animationStyles, 'absolute inset-0')} />
        {children && (
          <div className="relative z-10">
            {children}
          </div>
        )}
      </div>
    )
  }
)

GradientBackground.displayName = 'GradientBackground'

export default GradientBackground
