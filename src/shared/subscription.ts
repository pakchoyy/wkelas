export type AccountPlan = 'free' | 'pro'
export type MonetizationMode = 'free-development' | 'freemium'

// Tetap gratis sampai Pak Choy memutuskan fitur dan harga Pro sudah siap.
export const MONETIZATION_MODE: MonetizationMode = 'free-development'

export function effectivePlan(storedPlan: AccountPlan | null | undefined): AccountPlan {
  return MONETIZATION_MODE === 'free-development' ? 'pro' : storedPlan || 'free'
}

export function isFeatureAvailable(_feature: string, storedPlan?: AccountPlan | null) {
  return effectivePlan(storedPlan) === 'pro'
}
