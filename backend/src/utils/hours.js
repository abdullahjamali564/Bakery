export function isBranchOpen(hours, timeZone = 'UTC', now = new Date()) {
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const current = Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
  const [openHour, openMinute] = hours.open.split(':').map(Number);
  const [closeHour, closeMinute] = hours.close.split(':').map(Number);
  const opening = openHour * 60 + openMinute;
  const closing = closeHour * 60 + closeMinute;
  return closing > opening ? current >= opening && current < closing : current >= opening || current < closing;
}
