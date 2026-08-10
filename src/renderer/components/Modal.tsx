import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}

export default function Modal({ title, onClose, children, footer, maxWidth = 'max-w-lg' }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className={`w-full ${maxWidth} rounded-2xl flex flex-col max-h-[90vh]`}
        style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t flex-shrink-0 flex gap-3 justify-end" style={{ borderColor: 'var(--border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
