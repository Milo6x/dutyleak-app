'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import CSVImport from './csv-import'
import { CloudArrowUpIcon } from '@heroicons/react/24/outline'

interface CSVImportDialogProps {
  onImportComplete?: (jobId: string) => void
  trigger?: React.ReactNode
}

export default function CSVImportDialog({ onImportComplete, trigger }: CSVImportDialogProps) {
  const [open, setOpen] = useState(false)

  const handleImportComplete = (jobId: string) => {
    onImportComplete?.(jobId)
    setOpen(false)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <CloudArrowUpIcon className="h-4 w-4" />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import products into your catalog.
          </DialogDescription>
        </DialogHeader>
        <CSVImport 
          onImportComplete={handleImportComplete}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  )
}