import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}

export default function Modal({ title, onClose, children, footer, maxWidth = 'max-w-md' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    dialog.showModal()
    return () => { dialog.close() }
  }, [])
  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose() }} className={`m-auto w-[calc(100%_-_2rem)] ${maxWidth} max-h-[calc(100dvh_-_2rem)] overflow-y-auto overscroll-contain rounded-2xl border-0 p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm`}>
      <div className="flex min-w-0 w-full flex-col rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <h3 id={titleId} className="break-words text-sm font-bold">{title}</h3>
          <button type="button" aria-label="Tutup dialog" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"><X size={18}/></button>
        </div>
        <div className="min-w-0 p-4">{children}</div>
        {footer && <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>{footer}</div>}
      </div>
    </dialog>
  )
}
