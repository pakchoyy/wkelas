// The visual viewport shrinks when the mobile keyboard opens, unlike 100dvh
// on some browsers. Keep the dialog within that visible region.
export function modalViewport(height: number, offsetTop = 0) {
  const visibleHeight = Math.max(0, height)
  const gap = Math.min(16, visibleHeight / 4)
  return { top: Math.max(0, offsetTop) + visibleHeight / 2, maxHeight: Math.max(0, visibleHeight - gap * 2) }
}
