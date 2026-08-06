import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type {
  ClientCreateInput,
  ClientRecord,
  ClientRecordStatus,
  ClientType,
  ClientUpdateInput,
} from '@/domain/Client'

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: ClientRecord | null
  isPending?: boolean
  onSubmit: (input: ClientCreateInput | ClientUpdateInput) => void
}

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      {' '}
      *
    </span>
  )
}

function FieldError({ children }: { children: string }) {
  return (
    <p role="alert" className="mt-xs text-[11px] text-destructive">
      {children}
    </p>
  )
}

const clientTypeLabels: Record<ClientType, string> = {
  personal: 'Personal',
  family_member: 'Family Member',
  company: 'Company',
  business_unit: 'Business Unit',
  trust: 'Trust',
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  isPending,
  onSubmit,
}: ClientFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* sm:max-w-128 (numbered scale, = 32rem), not sm:max-w-lg — this app's
          --spacing-lg token shadows Tailwind's named max-w-lg scale; see
          ui/dialog.tsx. */}
      <DialogContent className="sm:max-w-128">
        {/* Rendered only while open, so every open (including switching
            between Add and Edit) mounts a fresh instance with state seeded
            straight from props — same fix as MerchantFormDialog/
            BankAccountFormDialog. */}
        {open && (
          <ClientFormBody
            client={client}
            isPending={isPending}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface ClientFormBodyProps {
  client: ClientRecord | null
  isPending?: boolean
  onSubmit: (input: ClientCreateInput | ClientUpdateInput) => void
  onCancel: () => void
}

function ClientFormBody({ client, isPending, onSubmit, onCancel }: ClientFormBodyProps) {
  const isEditMode = client !== null

  const [name, setName] = useState(client?.name ?? '')
  const [clientType, setClientType] = useState<ClientType>(client?.clientType ?? 'company')
  const [company, setCompany] = useState(client?.company ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [status, setStatus] = useState<ClientRecordStatus>(client?.status ?? 'active')
  const [notes, setNotes] = useState(client?.notes ?? '')
  const [submitted, setSubmitted] = useState(false)

  const nameError = name.trim().length === 0 ? 'Enter a client name.' : null
  const canSubmit = !nameError

  function handleSubmit() {
    setSubmitted(true)
    if (!canSubmit) return

    const shared = {
      name: name.trim(),
      company: company.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      status,
      notes: notes.trim() || null,
    }

    onSubmit(isEditMode ? shared : { ...shared, clientType })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditMode ? 'Edit Client' : 'Add Client'}</DialogTitle>
        <DialogDescription>
          {isEditMode
            ? 'Update this client. Fields marked with * are required.'
            : 'Register a new financial client. Fields marked with * are required.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <Label htmlFor="client-name">
              Client Name
              <RequiredMark />
            </Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              aria-required="true"
              aria-invalid={submitted && !!nameError}
              className={cn(submitted && nameError && 'border-destructive')}
            />
            {submitted && nameError && <FieldError>{nameError}</FieldError>}
          </div>
          <div>
            <Label htmlFor="client-type">Client Type</Label>
            <Select
              value={clientType}
              onValueChange={(v) => setClientType((v as ClientType) ?? 'company')}
              disabled={isEditMode}
            >
              <SelectTrigger id="client-type" className="w-full">
                <SelectValue placeholder="Client Type">
                  {(current: ClientType) => clientTypeLabels[current]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(clientTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="client-company">Company</Label>
          <Input
            id="client-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Acme Corp"
          />
        </div>

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <Label htmlFor="client-email">Email</Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. finance@acmecorp.in"
            />
          </div>
          <div>
            <Label htmlFor="client-phone">Phone</Label>
            <Input
              id="client-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="client-status">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus((v as ClientRecordStatus) ?? 'active')}
          >
            <SelectTrigger id="client-status" className="w-full">
              <SelectValue placeholder="Status">
                {(current: ClientRecordStatus) =>
                  current === 'active' ? 'Active' : current === 'pending' ? 'Pending' : 'Suspended'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="client-notes">Notes</Label>
          <Textarea
            id="client-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this client…"
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Saving…' : isEditMode ? 'Save Changes' : 'Add Client'}
        </Button>
      </DialogFooter>
    </>
  )
}
