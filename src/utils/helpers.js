export function getTodayFormatted() {
  const today = new Date()
  return today.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
}
