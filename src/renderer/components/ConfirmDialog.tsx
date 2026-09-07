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

export default function ConfirmDialog({ open, title, message, confirmText = 'Hapus', cancelText = 'Batal', danger = true, onConfirm, onCancel }: Props) {
  if (!open) return null
  return <Modal title={title} onClose={onCancel} maxWidth="max-w-sm" footer={<>
    <button autoFocus type="button" onClick={onCancel} className="min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold">{cancelText}</button>
    <button type="button" onClick={onConfirm} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98] ${danger ? 'bg-red-600' : 'bg-emerald-600'}`}>{confirmText}</button>
  </>}>
    <div className="flex items-start gap-3">
      <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${danger ? 'bg-red-100' : 'bg-emerald-100'}`}><AlertTriangle size={20} className={danger ? 'text-red-600' : 'text-emerald-600'}/></div>
      <p className="min-w-0 break-words text-sm leading-relaxed">{message}</p>
    </div>
  </Modal>
}
