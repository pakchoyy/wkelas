import { db } from './db'
import { reminderSummary } from '../shared/task-reminder'
import { todayISO } from '../shared/utils'

const PREF = 'bgy-task-reminder'
const LAST = 'bgy-task-reminder-last'

export const reminderSupported = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
export function reminderEnabled() {
  try { return localStorage.getItem(PREF) === 'on' && Notification.permission === 'granted' } catch { return false }
}

export async function enableReminder(): Promise<'on' | 'denied' | 'unsupported'> {
  if (!reminderSupported()) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'
  localStorage.setItem(PREF, 'on')
  localStorage.removeItem(LAST)
  await notifyDueTasks()
  return 'on'
}

export function disableReminder() {
  try { localStorage.removeItem(PREF) } catch {}
}

// Satu notifikasi per hari, dikirim saat aplikasi dibuka atau kembali tampil.
export async function notifyDueTasks() {
  if (!reminderSupported() || !reminderEnabled()) return
  const today = todayISO()
  if (localStorage.getItem(LAST) === today) return
  const summary = reminderSummary(await db.todo.toArray(), today)
  localStorage.setItem(LAST, today)
  if (!summary) return
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(summary.title, { body: summary.body, tag: 'bgy-tugas', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url: '/#/aktivitas/todo' } })
}
