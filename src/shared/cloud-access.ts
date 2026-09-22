export const CLOUD_PILOT_EMAIL = 'choiruddin2410@gmail.com'

const PILOT_EMAILS = new Set([CLOUD_PILOT_EMAIL])

export function normalizeEmail(email?: string | null) {
  return String(email || '').trim().toLowerCase()
}

export function isCloudPilotAllowed(email?: string | null) {
  return PILOT_EMAILS.has(normalizeEmail(email))
}

export function cloudPilotMessage() {
  return `Uji coba sinkron cloud sementara hanya untuk ${CLOUD_PILOT_EMAIL}. Gunakan email itu atau masuk Mode Demo.`
}
