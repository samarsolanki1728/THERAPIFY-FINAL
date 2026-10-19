import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Activity, ArrowRight, CalendarDays, CheckCircle2, Clock3, Copy, ExternalLink, Heart, MapPin, RefreshCw, Search, ShieldCheck, Sparkles, Users, Video, Wind } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../app/components/ui/dialog';
import { EVENTS_API, authHeaders, downloadCalendar, eventDate, eventPrice, requestJson } from '../lib/eventsApi';

const categories = ['All Events', 'Mindfulness', 'Meditation', 'Stress Management', 'Anxiety Support', 'Emotional Wellness', 'Self-Care', 'Yoga', 'Expert Workshops'];
const art = ['from-secondary to-background', 'from-primary/15 to-card', 'from-accent/15 to-card', 'from-secondary/70 to-card', 'from-primary/10 to-background', 'from-accent/10 to-background'];
const icons = [Sparkles, Wind, Heart, Activity, CalendarDays, Users];
const primary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50';
const secondary = 'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground hover:bg-secondary/60 disabled:opacity-50';
function EventArt({ index = 0, className = '' }) { const Icon = icons[index % icons.length]; return <div className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${art[index % art.length]} ${className}`}><span className="absolute -right-7 -top-12 h-40 w-40 rounded-full border border-white/70" /><span className="absolute -bottom-14 -left-8 h-36 w-36 rounded-full border border-white/70" /><span className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/80 bg-card/60 text-primary"><Icon size={29} strokeWidth={1.7} /></span></div>; }
let checkoutPromise;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutPromise) checkoutPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    const timeout = setTimeout(() => { script.remove(); reject(new Error('Checkout timed out. Retry from My events.')); }, 15000);
    script.onload = () => { clearTimeout(timeout); resolve(); }; script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('Could not load checkout. Retry from My events.')); };
    document.body.appendChild(script);
  }).catch(error => { checkoutPromise = null; throw error; });
  return checkoutPromise;
}

export default function Events() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const tab = params.get('tab') === 'mine' ? 'mine' : 'discover';
  const [events, setEvents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [search, setSearch] = useState(''); const [category, setCategory] = useState('All Events');
  const [format, setFormat] = useState('All formats'); const [sort, setSort] = useState('upcoming');
  const [page, setPage] = useState(1); const [pages, setPages] = useState(0); const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true); const [myLoading, setMyLoading] = useState(Boolean(token));
  const [listError, setListError] = useState(''); const [mineError, setMineError] = useState('');
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null); const [confirmation, setConfirmation] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null); const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0); const [detailLoading, setDetailLoading] = useState(false);
  const requestVersion = useRef(0);
  const refresh = () => { setReload(value => value + 1); loadMine(); };
  const loadMine = useCallback(async () => {
    if (!token) { setEnrollments([]); setMyLoading(false); return; }
    setMyLoading(true); setMineError('');
    try { const data = await requestJson(`${EVENTS_API}/mine`, { headers: authHeaders() }); setEnrollments(data.enrollments || []); if (data.paymentCheckPending) setMineError('Some payment checks are still pending. Please refresh shortly.'); }
    catch (err) { setMineError(err.message); } finally { setMyLoading(false); }
  }, [token]);
  useEffect(() => { loadMine(); }, [loadMine]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setListError('');
    const timer = setTimeout(async () => {
      const query = new URLSearchParams({ q: search, sort, page: String(page), limit: '12' });
      if (category !== 'All Events') query.set('category', category);
      if (format !== 'All formats') query.set('format', format);
      try { const data = await requestJson(`${EVENTS_API}?${query}`, { signal: controller.signal }); setEvents(data.events || []); setPages(data.pages || 0); setTotal(data.total || 0); }
      catch (err) { if (err.name !== 'AbortError') setListError(err.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, sort, page, category, format, reload]);
  useEffect(() => {
    const slug = params.get('event');
    if (!slug) { setSelected(null); setDetailLoading(false); return; }
    const controller = new AbortController(); setDetailLoading(true); setError('');
    requestJson(`${EVENTS_API}/${encodeURIComponent(slug)}`, { signal: controller.signal }).then(data => setSelected(data.event)).catch(err => { if (err.name !== 'AbortError') setError(err.message); }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [params]);
  function closeDetails() { requestVersion.current++; setSelected(null); setParams(previous => { const next = new URLSearchParams(previous); next.delete('event'); return next; }, { replace: true }); }
  function openDetails(event) { setError(''); setNotice(''); setSelected(event); setParams(previous => { const next = new URLSearchParams(previous); next.set('event', event.slug); return next; }); }
  function startEnrollment(event) { setError(''); if (!token) { navigate('/signin', { state: { from: `/events?event=${encodeURIComponent(event.slug)}` } }); return; } closeDetails(); setConfirmation(event); }
  function synced(row) { if (row) setEnrollments(current => [row, ...current.filter(item => item.event._id !== row.event._id)]); }
  function showPaymentResult(row) { synced(row); setNotice(row.paymentStatus === 'refund_requested' ? 'Payment received, but a place is no longer available. A refund was requested; please contact the organizer.' : 'Payment verified. Your place is confirmed.'); refresh(); }
  async function enroll(event) {
    if (saving) return; setSaving(true); setError(''); setNotice('');
    try {
      const data = await requestJson(`${EVENTS_API}/${event._id}/enroll`, { method: 'POST', headers: authHeaders(), body: '{}' }); synced(data.enrollment);
      if (data.checkout) {
        await loadCheckout();
        const checkout = new window.Razorpay({ key: data.checkout.keyId, order_id: data.checkout.orderId, amount: data.checkout.amount, currency: data.checkout.currency, name: 'Therapify', description: event.title,
          handler: async payment => { try { const verified = await requestJson(`${EVENTS_API}/${event._id}/verify-payment`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payment) }); showPaymentResult(verified.enrollment); } catch (err) { setError(err.message); loadMine(); } finally { setSaving(false); } },
          modal: { ondismiss: () => { setSaving(false); setNotice('Checkout closed. Refresh My events to check your payment or resume checkout.'); loadMine(); } }, theme: { color: '#5B8A87' }
        });
        checkout.on('payment.failed', () => { setError('Payment was not completed. You can retry from My events.'); });
        setConfirmation(null); checkout.open(); return;
      }
      setConfirmation(null); setNotice(event.isDemo ? 'Demo enrollment saved. This listing does not include a live session.' : 'You’re enrolled. We’ve saved your place.'); refresh();
    } catch (err) { setError(err.message); loadMine(); } setSaving(false);
  }
  async function cancel() {
    setSaving(true); setError('');
    try { const data = await requestJson(`${EVENTS_API}/${cancelTarget.event._id}/cancel`, { method: 'POST', headers: authHeaders(), body: '{}' }); synced(data.enrollment); setNotice(data.message || 'Enrollment cancelled.'); setCancelTarget(null); refresh(); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function copyEvent(event) { try { await navigator.clipboard.writeText(`${window.location.origin}/events?event=${encodeURIComponent(event.slug)}`); setNotice('Event link copied.'); } catch { setError('Could not copy the link. You can copy the event URL from your address bar.'); } }
  function enrollmentFor(event) { return enrollments.find(item => item.event?._id === event._id); }
  function enrollmentButton(event) {
    const row = enrollmentFor(event);
    if (row?.status === 'confirmed') return <Link to="/events?tab=mine" onClick={closeDetails} className={secondary}><CheckCircle2 size={16} /> View enrollment</Link>;
    if (row?.paymentStatus === 'refund_requested') return <span className="text-sm text-muted-foreground">Refund requested</span>;
    const closed = new Date(event.startsAt) <= new Date();
    return <button className={primary} onClick={() => startEnrollment(event)} disabled={saving || closed || (!event.spotsRemaining && row?.status !== 'pending') || !event.paymentAvailable}>{closed ? 'Enrollment closed' : !event.paymentAvailable ? 'Paid booking unavailable' : !event.spotsRemaining && row?.status !== 'pending' ? 'Fully booked' : row?.status === 'pending' ? 'Resume checkout' : 'Enroll now'} <ArrowRight size={15} /></button>;
  }

  return <main className="events-page min-h-screen bg-background pb-16 pt-28 text-foreground"><div className="review-container">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary"><Sparkles size={14} /> Moments of connection</p><h1 className="font-display text-4xl sm:text-5xl">A little time for your wellbeing.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">Discover gentle practices, shared experiences, and space to grow. Find an event that feels right for you.</p></div><span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={17} /> At your pace. On your terms.</span></header>
    <div className="events-tabs mb-6 flex gap-2 border-b border-border pb-3" aria-label="Event views">{[['discover', 'Discover events'], ['mine', 'My events']].map(([value, label]) => <button key={value} onClick={() => { setParams(value === 'mine' ? { tab: 'mine' } : {}); setError(''); }} aria-pressed={tab === value} className={tab === value ? primary : secondary}>{label}</button>)}</div>
    {error && !confirmation && !cancelTarget && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="mb-5 rounded-xl bg-primary/10 p-4 text-sm text-primary">{notice}</p>}
    {tab === 'discover' ? <>
      <div className="events-filters mb-5 flex flex-wrap gap-3"><label className="flex min-w-48 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-4"><Search size={17} className="text-muted-foreground" /><input aria-label="Search events" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search for a moment of calm…" className="w-full bg-transparent py-3 text-sm outline-none" /></label><select aria-label="Event format" value={format} onChange={event => { setFormat(event.target.value); setPage(1); }} className="rounded-xl border border-border bg-card px-4 py-3 text-sm">{['All formats', 'Online', 'In person'].map(value => <option key={value}>{value}</option>)}</select><select aria-label="Sort events" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }} className="rounded-xl border border-border bg-card px-4 py-3 text-sm"><option value="upcoming">Soonest first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></div>
      <div className="mb-7 flex flex-wrap gap-2" role="group" aria-label="Event category">{categories.map(value => <button key={value} aria-pressed={category === value} onClick={() => { setCategory(value); setPage(1); }} className={`rounded-full border px-3.5 py-2 text-xs transition ${category === value ? 'border-primary/40 bg-secondary/50 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-secondary/60'}`}>{value}</button>)}</div>
      {loading ? <div role="status" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(value => <div key={value} className="h-80 animate-pulse rounded-2xl bg-secondary/50" />)}<span className="sr-only">Loading events</span></div> : listError ? <div role="alert" className="rounded-2xl border border-border bg-card p-10 text-center"><p className="mb-4 text-sm">{listError}</p><button onClick={() => setReload(value => value + 1)} className={secondary}><RefreshCw size={16} />Retry</button></div> : !events.length ? <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center"><CalendarDays className="mx-auto mb-4 text-primary" size={32} /><h2 className="text-xl font-medium">No events to show just yet</h2><p className="mt-2 text-sm text-muted-foreground">Try another category or check back for new sessions.</p><button onClick={() => { setSearch(''); setCategory('All Events'); setFormat('All formats'); setPage(1); }} className={`${secondary} mt-5`}>Clear filters</button></div> : <><p className="mb-4 text-xs text-muted-foreground">{total} upcoming {total === 1 ? 'event' : 'events'}</p><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{events.map((event, index) => <article key={event._id} className="events-card flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40"><button aria-label={`View ${event.title}`} onClick={() => openDetails(event)} className="block w-full"><EventArt index={index} className="h-40" /></button><div className="flex flex-1 flex-col p-5"><div className="flex justify-between gap-2 text-xs"><span className="text-primary">{event.category}</span><span className="font-semibold text-primary">{eventPrice(event.pricePaise)}</span></div><h2 className="mt-3 font-display text-xl"><button onClick={() => openDetails(event)} className="text-left hover:text-primary">{event.title}</button></h2><p className="mt-2 min-h-10 text-sm leading-6 text-muted-foreground">{event.shortDescription}</p><p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays size={14} />{eventDate(event.startsAt)}</p><p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">{event.format === 'Online' ? <Video size={14} /> : <MapPin size={14} />}{event.format} · {event.spotsRemaining} places left</p>{event.isDemo && <p className="mt-3 text-xs text-amber-800">Demo event · no live session</p>}<div className="mt-auto flex flex-wrap items-center gap-2 pt-5">{enrollmentButton(event)}<button onClick={() => openDetails(event)} className="px-2 py-2 text-sm text-primary underline">Details</button></div></div></article>)}</div>{pages > 1 && <div className="mt-7 flex items-center justify-center gap-4"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className={secondary}>Previous</button><span className="text-sm">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(value => value + 1)} className={secondary}>Next</button></div>}</>}
    </> : <section><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-2xl">Your moments of connection</h2>{token && <button disabled={myLoading || saving} onClick={loadMine} className={secondary}><RefreshCw size={15} />Refresh</button>}</div>{!token ? <div className="rounded-2xl bg-card p-10 text-center"><p className="mb-5 text-sm text-muted-foreground">Sign in to see your enrolled events.</p><button onClick={() => navigate('/signin', { state: { from: '/events?tab=mine' } })} className={primary}>Sign in</button></div> : <>{mineError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{mineError}</p>}{myLoading ? <p role="status" className="py-12 text-center">Loading your events…</p> : !enrollments.length ? <div className="rounded-2xl bg-card p-12 text-center"><CalendarDays size={32} className="mx-auto mb-4 text-primary" /><h3 className="font-display text-2xl">Your next small step starts here.</h3><p className="mt-3 text-sm text-muted-foreground">Explore an event and save a place for yourself.</p><button onClick={() => setParams({})} className={`${primary} mt-6`}>Discover events <ArrowRight size={15} /></button></div> : <div className="space-y-4">{enrollments.slice().sort((a, b) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt)).map(item => <article key={item.id} className="flex flex-wrap justify-between gap-5 rounded-2xl border border-border bg-card p-6"><div><p className="text-xs font-medium text-muted-foreground">{item.paymentStatus === 'refund_requested' ? 'Refund requested — awaiting organizer' : item.status === 'pending' ? 'Payment pending' : item.status === 'cancelled' ? 'Cancelled' : new Date(item.event.endsAt) < new Date() ? 'Past event' : 'Confirmed'}{item.event.isDemo ? ' · Demo event' : ''}</p><h3 className="mt-2 font-display text-xl">{item.event.title}</h3><p className="mt-2 text-sm text-muted-foreground">{eventDate(item.event.startsAt)} · {item.event.format}</p><p className="mt-2 text-xs text-muted-foreground">Reference: {item.reference}</p></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => openDetails(item.event)} className={secondary}>Details</button>{item.status === 'confirmed' && <><button onClick={() => downloadCalendar(item)} className={secondary}><CalendarDays size={15} />Calendar</button>{item.event.joinUrl && new Date(item.event.endsAt) > new Date() && <a href={item.event.joinUrl} target="_blank" rel="noopener noreferrer" className={primary}>Join session <ExternalLink size={15} /></a>}{new Date(item.event.startsAt) > new Date() && <button disabled={saving} onClick={() => { setError(''); setCancelTarget(item); }} className="px-3 py-2 text-sm text-destructive underline">Cancel enrollment</button>}</>}{item.status === 'pending' && new Date(item.event.startsAt) > new Date() && <button disabled={saving} onClick={() => startEnrollment(item.event)} className={primary}>Resume checkout</button>}</div></article>)}</div>}</>}</section>}
    <p className="mt-12 text-center text-xs leading-6 text-muted-foreground">Choose what feels comfortable. Wellness events support everyday wellbeing and do not replace professional care.</p>
  </div>
    <Dialog open={Boolean(selected) || detailLoading} onOpenChange={open => { if (!open) closeDetails(); }}><DialogContent className="events-dialog z-[70] max-h-[90vh] overflow-y-auto rounded-3xl bg-card sm:max-w-2xl"><DialogTitle className="font-display text-2xl">{selected?.title || 'Event details'}</DialogTitle><DialogDescription>{selected?.shortDescription || 'Loading event details…'}</DialogDescription>{selected && <><EventArt className="h-36 rounded-xl" /><div className="flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-2"><CalendarDays size={16} />{eventDate(selected.startsAt)}</span><span className="flex items-center gap-2"><Clock3 size={16} />{Math.round((Date.parse(selected.endsAt) - Date.parse(selected.startsAt)) / 60000)} min</span><span>{eventPrice(selected.pricePaise)}</span></div><p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{selected.description}</p><p className="text-sm">Hosted by {selected.host}</p><p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin size={16} />{selected.venue}</p>{selected.agenda?.length > 0 && <div><h3 className="mb-2 font-medium">What to expect</h3><ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">{selected.agenda.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}{selected.isDemo && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">This is a demo listing. Enrollment is for trying the app; no real session is scheduled.</p>}<div className="mt-2 flex flex-wrap gap-3">{enrollmentButton(selected)}<button onClick={() => copyEvent(selected)} className={secondary}><Copy size={15} />Copy link</button></div></>}</DialogContent></Dialog>
    <Dialog open={Boolean(confirmation)} onOpenChange={open => { if (!open && !saving) { setConfirmation(null); setError(''); } }}><DialogContent className="events-dialog z-[70] rounded-3xl bg-card"><DialogTitle className="font-display text-2xl">Save your place</DialogTitle><DialogDescription>Review your event before enrolling.</DialogDescription>{confirmation && <><h3 className="font-medium">{confirmation.title}</h3><p className="text-sm text-muted-foreground">{eventDate(confirmation.startsAt)} · {confirmation.format}</p><p className="text-xl font-medium">{eventPrice(confirmation.pricePaise)}</p><p className="text-sm text-muted-foreground">{confirmation.isDemo ? 'This is a demo enrollment, with no real session.' : confirmation.pricePaise ? 'Your place is confirmed after payment is verified. Cancellation requests require organizer review for refunds.' : 'Your place will be confirmed immediately. You can cancel before the event starts.'}</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={saving} onClick={() => enroll(confirmation)} className={primary}>{saving ? 'Please wait…' : confirmation.pricePaise ? 'Continue to secure checkout' : 'Confirm enrollment'} <ArrowRight size={16} /></button></>}</DialogContent></Dialog>
    <Dialog open={Boolean(cancelTarget)} onOpenChange={open => { if (!open && !saving) { setCancelTarget(null); setError(''); } }}><DialogContent className="events-dialog z-[70] rounded-3xl"><DialogTitle>Cancel your enrollment?</DialogTitle><DialogDescription>{cancelTarget?.paymentStatus === 'paid' ? 'Your place will be released and a refund requested. Refunds are processed by the organizer, not immediately by this app.' : 'Your place will be released so someone else can join.'}</DialogDescription>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={saving} onClick={cancel} className={primary}>{saving ? 'Cancelling…' : 'Confirm cancellation'}</button></DialogContent></Dialog>
  </main>;
}
