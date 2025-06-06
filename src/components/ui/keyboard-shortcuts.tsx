'use client'

import React, { useState, useEffect } from 'react'
import { Command, X, Search, Home, Package, FileText, BarChart3, Settings, Zap, CheckCircle, Building2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { useRouter } from 'next/navigation'

interface Shortcut {
  key: string
  description: string
  action: () => void
  category: 'navigation' | 'actions' | 'general'
}

interface KeyboardShortcutsProps {
  className?: string
}

export function KeyboardShortcuts({ className }: KeyboardShortcutsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const shortcuts: Shortcut[] = [
    // Navigation
    { key: '⌘ + K', description: 'Open search', action: () => {}, category: 'general' },
    { key: '⌘ + /', description: 'Show keyboard shortcuts', action: () => setIsOpen(true), category: 'general' },
    { key: 'G then D', description: 'Go to Dashboard', action: () => router.push('/dashboard'), category: 'navigation' },
    { key: 'G then P', description: 'Go to Products', action: () => router.push('/products'), category: 'navigation' },
    { key: 'G then C', description: 'Go to Classification', action: () => router.push('/classification'), category: 'navigation' },
    { key: 'G then L', description: 'Go to Landed Cost', action: () => router.push('/landed-cost'), category: 'navigation' },
    { key: 'G then O', description: 'Go to Optimization', action: () => router.push('/optimization'), category: 'navigation' },
    { key: 'G then A', description: 'Go to Analytics', action: () => router.push('/analytics'), category: 'navigation' },
    { key: 'G then R', description: 'Go to Review Queue', action: () => router.push('/review-queue'), category: 'navigation' },
    { key: 'G then S', description: 'Go to Settings', action: () => router.push('/settings'), category: 'navigation' },
    
    // Actions
    { key: 'N', description: 'New product', action: () => router.push('/products/new'), category: 'actions' },
    { key: 'U', description: 'Upload data', action: () => router.push('/data-pipeline'), category: 'actions' },
    { key: 'R', description: 'Refresh page', action: () => window.location.reload(), category: 'actions' },
    
    // General
    { key: 'ESC', description: 'Close dialogs/modals', action: () => {}, category: 'general' },
    { key: '?', description: 'Show help', action: () => setIsOpen(true), category: 'general' },
  ]

  const categorizedShortcuts = {
    navigation: shortcuts.filter(s => s.category === 'navigation'),
    actions: shortcuts.filter(s => s.category === 'actions'),
    general: shortcuts.filter(s => s.category === 'general'),
  }

  // Global keyboard handler
  useEffect(() => {
    let gPressed = false
    let gTimer: NodeJS.Timeout

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Handle Cmd/Ctrl + / to show shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setIsOpen(true)
        return
      }

      // Handle ? to show shortcuts
      if (e.key === '?' && !e.shiftKey) {
        e.preventDefault()
        setIsOpen(true)
        return
      }

      // Handle ESC to close shortcuts
      if (e.key === 'Escape') {
        setIsOpen(false)
        return
      }

      // Handle G + letter combinations
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        gPressed = true
        clearTimeout(gTimer)
        gTimer = setTimeout(() => {
          gPressed = false
        }, 1000) // Reset after 1 second
        return
      }

      if (gPressed) {
        e.preventDefault()
        switch (e.key.toLowerCase()) {
          case 'd':
            router.push('/dashboard')
            break
          case 'p':
            router.push('/products')
            break
          case 'c':
            router.push('/classification')
            break
          case 'o':
            router.push('/optimization')
            break
          case 'a':
            router.push('/analytics')
            break
          case 'r':
            router.push('/review-queue')
            break
          case 's':
            router.push('/settings')
            break
        }
        gPressed = false
        return
      }

      // Handle single key shortcuts
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault()
            router.push('/products/new')
            break
          case 'u':
            e.preventDefault()
            router.push('/data-pipeline')
            break
          case 'r':
            if (e.shiftKey) {
              e.preventDefault()
              window.location.reload()
            }
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(gTimer)
    }
  }, [router])

  const categoryIcons = {
    navigation: <Home className="h-4 w-4" />,
    actions: <Zap className="h-4 w-4" />,
    general: <Command className="h-4 w-4" />,
  }

  const categoryLabels = {
    navigation: 'Navigation',
    actions: 'Actions',
    general: 'General',
  }

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn("text-muted-foreground", className)}
        title="Keyboard shortcuts (⌘ + /)"
      >
        <Command className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl border max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Command className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {Object.entries(categorizedShortcuts).map(([category, shortcuts]) => (
              <div key={category}>
                <div className="flex items-center space-x-2 mb-3">
                  {categoryIcons[category as keyof typeof categoryIcons]}
                  <h3 className="font-medium text-gray-900">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h3>
                </div>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                      <span className="text-sm text-gray-700">{shortcut.description}</span>
                      <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono bg-gray-100 text-gray-600 rounded border">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Press <kbd className="bg-white px-1 rounded border">ESC</kbd> to close</span>
              <span>Press <kbd className="bg-white px-1 rounded border">?</kbd> to reopen</span>
            </div>
            <div className="text-right">
              <p>More shortcuts coming soon!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcuts