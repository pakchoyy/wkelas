import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  return <Modal title={title} onClose={onCancel} maxWidth="max-w-sm" footer={<>
    <button autoFocus type="button" onClick={onCancel} className="min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold">{cancelText}</button>
    <button type="button" onClick={onConfirm} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-white ${danger ? 'bg-red-600' : 'bg-emerald-600'}`}>{confirmText}</button>
  </>}><div className="flex items-start gap-3"><AlertTriangle size={24} className={`shrink-0 ${danger ? 'text-red-600' : 'text-emerald-600'}`}/><p className="text-sm leading-relaxed break-words">{message}</p></div></Modal>
}
