export function nowISO(): string {
  return new Date().toISOString()
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
