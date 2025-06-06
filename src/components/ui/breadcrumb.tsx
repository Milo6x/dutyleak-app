import React from 'react'
import Link from 'next/link'
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  showHome?: boolean
}

export function Breadcrumb({ items, className, showHome = true }: BreadcrumbProps) {
  const allItems = showHome 
    ? [{ label: 'Home', href: '/dashboard' }, ...items]
    : items

  return (
    <nav className={cn('flex', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1
          const isHome = showHome && index === 0
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
              )}
              
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors flex items-center"
                >
                  {isHome && <HomeIcon className="h-4 w-4 mr-1" />}
                  {item.label}
                </Link>
              ) : (
                <span 
                  className={cn(
                    'text-sm font-medium flex items-center',
                    isLast 
                      ? 'text-gray-900' 
                      : 'text-gray-500'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {isHome && <HomeIcon className="h-4 w-4 mr-1" />}
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumb