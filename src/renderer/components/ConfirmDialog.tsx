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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: danger ? '#fee2e2' : '#d1fae5' }}
            >
              <AlertTriangle size={20} style={{ color: danger ? '#dc2626' : '#16a34a' }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold">{title}</h3>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-light)' }}>
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 flex gap-3 justify-end border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-semibold border transition-all duration-200"
            style={{ borderColor: 'var(--border)' }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]"
            style={{ background: danger ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
