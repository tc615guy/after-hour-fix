"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

type Props = {
  projectId?: string
}

export default function MobileNav({ projectId }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Open menu">
          ☰
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Menu</DialogTitle>
        </DialogHeader>
        <Separator />
        <nav className="p-2">
          <Link href="/dashboard" onClick={() => setOpen(false)} className="block px-3 py-3 rounded hover:bg-gray-50">
            Dashboard
          </Link>
          {projectId && (
            <Link
              href={`/projects/${projectId}/settings`}
              onClick={() => setOpen(false)}
              className="block px-3 py-3 rounded hover:bg-gray-50"
            >
              Settings
            </Link>
          )}
          <Link href="/auth/logout" onClick={() => setOpen(false)} className="block px-3 py-3 rounded hover:bg-gray-50">
            Logout
          </Link>
        </nav>
      </DialogContent>
    </Dialog>
  )
}

