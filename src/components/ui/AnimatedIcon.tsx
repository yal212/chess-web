'use client'

import React from 'react'
import { cn } from '@/utils/cn'
import { LucideIcon } from 'lucide-react'

interface AnimatedIconProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  animation?: 'none' | 'bounce' | 'pulse' | 'spin' | 'float' | 'glow'
  color?: 'blue' | 'purple' | 'green' | 'red' | 'yellow' | 'gray' | 'white'
  background?: boolean
  backgroundVariant?: 'solid' | 'gradient' | 'outline'
}

const AnimatedIcon = React.forwardRef<HTMLDivElement, AnimatedIconProps>(
  ({ 
    className, 
    icon: Icon, 
    size = 'md', 
    animation = 'none', 
    color = 'blue', 
    background = false,
    backgroundVariant = 'solid',
    ...props 
  }, ref) => {
    const sizes = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
      '2xl': 'h-16 w-16'
    }
    
    const colors = {
      blue: 'text-blue-600',
      purple: 'text-purple-600',
      green: 'text-green-600',
      red: 'text-red-600',
      yellow: 'text-yellow-600',
      gray: 'text-gray-600',
      white: 'text-white'
    }
    
    const animations = {
      none: '',
      bounce: 'animate-bounce',
      pulse: 'animate-pulse',
      spin: 'animate-spin',
      float: 'animate-pulse hover:animate-bounce',
      glow: 'animate-pulse drop-shadow-lg'
    }

    const backgroundSizes = {
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-4',
      xl: 'p-6',
      '2xl': 'p-8'
    }

    const backgroundStyles = background ? {
      solid: `${backgroundSizes[size]} rounded-full bg-${color.replace('text-', '')}-100`,
      gradient: `${backgroundSizes[size]} rounded-full bg-gradient-to-br from-${color.replace('text-', '')}-100 to-${color.replace('text-', '')}-200`,
      outline: `${backgroundSizes[size]} rounded-full border-2 border-${color.replace('text-', '')}-200`
    }[backgroundVariant] : ''

    return (
      <div
        className={cn(
          'inline-flex items-center justify-center',
          backgroundStyles,
          className
        )}
        ref={ref}
        {...props}
      >
        <Icon
          className={cn(
            sizes[size],
            colors[color],
            animations[animation]
          )}
          aria-hidden="true"
        />
      </div>
    )
  }
)

AnimatedIcon.displayName = 'AnimatedIcon'

export default AnimatedIcon
