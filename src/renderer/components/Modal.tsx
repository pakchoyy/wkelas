import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}

export default function Modal({ title, onClose, children, footer, maxWidth = 'max-w-lg' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    dialog.showModal()
    return () => { dialog.close() }
  }, [])
  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }} className={`m-auto w-[calc(100%_-_2rem)] ${maxWidth} max-h-[90dvh] overflow-hidden rounded-2xl border-0 p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm`}>

      <div
        className="w-full rounded-2xl flex flex-col max-h-[90dvh]"
        style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h3 id={titleId} className="text-sm font-bold break-words">{title}</h3>
          <button type="button" aria-label="Tutup dialog" onClick={onClose} className="grid size-11 shrink-0 place-items-center hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t flex-shrink-0 flex flex-wrap gap-3 justify-end" style={{ borderColor: 'var(--border)' }}>
            {footer}
          </div>
        )}
      </div>
    </dialog>
  )
}
