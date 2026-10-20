export const EVENTS_API = `${(import.meta.env.VITE_EVENTS_API_URL || 'http://localhost:5002').replace(/\/$/, '')}/api/events`;
export const CORE_API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
export async function requestJson(url, options = {}) {
  let response;
  try {
    const timeout = AbortSignal.timeout(25000);
    response = await fetch(url, { ...options, signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout });
  }
  catch (error) { if (error.name === 'AbortError') throw error; throw new Error(error.name === 'TimeoutError' ? 'The request timed out. Refresh to check its status before trying again.' : 'Could not connect. Please check that the service is running and try again.'); }
  let data;
  try { data = await response.json(); }
  catch { throw new Error(`The service returned an unreadable response (${response.status}). Please retry.`); }
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status}). Please try again.`);
    error.status = response.status;
    if (response.status === 401 && options.headers?.Authorization === `Bearer ${localStorage.getItem('token')}`) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-change'));
    }
    throw error;
  }
  return data;
}
export function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` };
}
export const eventDate = value => new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const eventPrice = value => value === 0 ? 'Free' : `₹${(value / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export function downloadCalendar(enrollment) {
  const event = enrollment.event;
  const stamp = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const escape = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Therapify//Events//EN', 'BEGIN:VEVENT',
    `UID:${enrollment.reference}@therapify`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(event.startsAt)}`, `DTEND:${stamp(event.endsAt)}`,
    `SUMMARY:${escape(event.title)}`, `DESCRIPTION:${escape(event.shortDescription)}`, `LOCATION:${escape(event.venue)}`, 'END:VEVENT', 'END:VCALENDAR'];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${event.slug}.ics`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
