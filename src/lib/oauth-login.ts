export function createSingleFlight() {
  let running = false
  return async function runOnce<T>(action: () => Promise<T>): Promise<T | undefined> {
    if (running) return undefined
    running = true
    try {
      return await action()
    } finally {
      running = false
    }
  }
}

export function googleOAuthOptions(origin: string) {
  return {
    provider: 'google' as const,
    options: {
      redirectTo: `${origin}/`,
      queryParams: { prompt: 'select_account' },
    },
  }
}
