import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { ArrowRight, BookOpen, CalendarDays, Check, Heart, MessageCircle, NotebookPen, RefreshCw, Sparkles, Wind } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CORE_API, EVENTS_API, authHeaders, eventDate, requestJson } from '../lib/eventsApi';

const moods = [{ score: 1, label: 'Very low', face: '😔' }, { score: 2, label: 'Low', face: '🙁' }, { score: 3, label: 'Okay', face: '😐' }, { score: 4, label: 'Good', face: '🙂' }, { score: 5, label: 'Great', face: '😊' }];
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const button = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#496b52] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3d5d46] disabled:opacity-50';
function Card({ className = '', children }) { return <section className={`rounded-2xl border border-[#e8e9e2] bg-white p-5 shadow-sm sm:p-6 ${className}`}>{children}</section>; }

export default function Dashboard() {
  const token = localStorage.getItem('token');
  const [user] = useState(() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } });
  const [moodEntries, setMoodEntries] = useState([]);
  const [journals, setJournals] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const today = localDate(new Date());
  const loadCore = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    const results = await Promise.allSettled([
      requestJson(`${CORE_API}/api/moods`, { headers: authHeaders() }),
      requestJson(`${CORE_API}/api/journals`, { headers: authHeaders() })
    ]);
    if (results[0].status === 'fulfilled') {
      const entries = results[0].value.entries || []; setMoodEntries(entries);
      const entry = entries.find(item => item.dateStr === today);
      setSelectedMood(entry?.mood || null); setNote(entry?.note || '');
    }
    if (results[1].status === 'fulfilled') setJournals((results[1].value.entries || []).slice(0, 3));
    setError(results.filter(result => result.status === 'rejected').map(result => result.reason.message).join(' '));
    setLoading(false);
  }, [token, today]);
  const loadEvents = useCallback(async () => {
    if (!token) return;
    setEventsLoading(true); setEventsError('');
    try { const data = await requestJson(`${EVENTS_API}/mine`, { headers: authHeaders() }); setEnrollments(data.enrollments || []); }
    catch (err) { setEventsError(err.message); } finally { setEventsLoading(false); }
  }, [token]);
  useEffect(() => { loadCore(); }, [loadCore]);
  useEffect(() => { loadEvents(); }, [loadEvents]);
  const todayEntry = moodEntries.find(entry => entry.dateStr === today);
  const chartData = useMemo(() => {
    const byDate = new Map(moodEntries.map(entry => [entry.dateStr, entry.mood]));
    return Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); return { day: date.toLocaleDateString('en', { weekday: 'short' }), mood: byDate.get(localDate(date)) ?? null }; });
  }, [moodEntries]);
  const upcoming = useMemo(() => enrollments.filter(item => item.event && item.status !== 'cancelled' && new Date(item.event.endsAt) > new Date()).sort((a, b) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt)), [enrollments]);
  async function saveMood() {
    if (!selectedMood || saving) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const mood = moods.find(item => item.score === selectedMood);
      const data = await requestJson(`${CORE_API}/api/moods`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ mood: selectedMood, moodLabel: mood.label, emoji: mood.face, note, dateStr: today, emotions: todayEntry?.emotions || [] }) });
      setMoodEntries(previous => [data.entry, ...previous.filter(entry => entry.dateStr !== today)]);
      setSuccess('Your check-in is saved. Thank you for taking a moment for yourself.');
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  if (!token) return <Navigate to="/signin" state={{ from: '/dashboard' }} replace />;
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const suggested = selectedMood && selectedMood <= 2 ? 'ground' : selectedMood === 3 ? 'movement' : 'gratitude';
  return <main className="min-h-screen bg-[#f7f7f2] px-4 pb-16 pt-28 text-[#303a33] sm:px-6"><div className="mx-auto max-w-6xl">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm text-[#71806f]">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p><h1 className="font-display text-4xl">Welcome{firstName ? `, ${firstName}` : ' back'}</h1><p className="mt-3 text-sm text-[#68736a]">Take a moment for yourself today. There’s no right way to feel.</p></div><Link to="/journal?new=1" className={button}><NotebookPen size={16} /> Write a reflection</Link></header>
    {error && <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error} <button onClick={loadCore} className="ml-2 underline">Retry</button></div>}
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <Card><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-[#71806f]">A gentle check-in</p><h2 className="mt-2 text-xl font-semibold">How are you feeling today?</h2><p className="mt-1 text-sm text-[#788078]">Choose what feels closest. You can change it later.</p></div><Heart className="text-[#55725b]" /></div>
        {loading ? <p role="status" className="py-12 text-sm">Loading your check-in…</p> : <><div className="mt-6 grid grid-cols-5 gap-2" role="group" aria-label="Select today's mood">{moods.map(mood => <button key={mood.score} type="button" aria-pressed={selectedMood === mood.score} onClick={() => { setSelectedMood(mood.score); setSuccess(''); }} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border text-xs focus-visible:ring-2 focus-visible:ring-[#496b52] ${selectedMood === mood.score ? 'border-[#719075] bg-[#edf3eb]' : 'border-[#e8e9e2] hover:bg-[#f6f8f3]'}`}><span className="text-2xl" aria-hidden="true">{mood.face}</span>{mood.label}</button>)}</div>
          <label htmlFor="dashboard-note" className="mt-5 block text-sm font-medium">Anything you’d like to note? <span className="font-normal text-[#879087]">(optional)</span></label><textarea id="dashboard-note" value={note} onChange={event => setNote(event.target.value)} maxLength={500} rows={2} placeholder="A word or two about how you feel…" className="mt-2 w-full rounded-xl border border-[#e8e9e2] bg-[#fdfdfa] p-3 text-sm" /><button disabled={saving || !selectedMood} onClick={saveMood} className={`${button} mt-4`}>{saving ? 'Saving…' : todayEntry ? 'Update check-in' : 'Save check-in'} <ArrowRight size={15} /></button>{success && <p role="status" className="mt-3 flex gap-2 text-sm text-[#416a49]"><Check size={17} />{success}</p>}</>}
      </Card>
      <Card className="!bg-[#edf1e9]"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#61765f]"><Sparkles size={17} /> A little care for today</p><h2 className="mt-5 font-display text-3xl">Make room for a small pause.</h2><p className="mt-3 text-sm leading-7 text-[#647067]">{suggested === 'ground' ? 'Try a grounding exercise and gently notice what’s around you.' : suggested === 'movement' ? 'A few minutes of gentle movement might make a nice pause in your day.' : 'Take a moment to notice one small thing you appreciate today.'}</p><Link to={`/wellness?activity=${suggested}`} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-[#496b52]">Explore an activity <ArrowRight size={15} /></Link><p className="mt-4 text-xs text-[#788078]">A gentle suggestion, not a treatment or a promise.</p></Card>
      <Card><div className="mb-5 flex justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#71806f]">Your recent check-ins</p><h2 className="mt-2 text-lg font-semibold">Past seven days</h2></div><Link to="/mood" className="text-sm text-[#496b52] hover:underline">Mood history</Link></div>{loading ? <p className="py-16 text-center">Loading mood history…</p> : chartData.every(item => item.mood === null) ? <div className="rounded-xl bg-[#f8f9f5] py-16 text-center text-sm text-[#788078]">Your first check-in is a lovely place to begin.</div> : <div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ left: -25, right: 12, top: 12 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e9e2" /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} /><YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} axisLine={false} tickLine={false} /><Tooltip formatter={value => [moods.find(item => item.score === value)?.label || value, 'Mood']} /><Line type="monotone" dataKey="mood" stroke="#719075" strokeWidth={3} dot={{ r: 5 }} connectNulls={false} /></LineChart></ResponsiveContainer></div>}</Card>
      <Card><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Recent reflections</h2><BookOpen size={20} className="text-[#71806f]" /></div>{loading ? <p className="py-8 text-sm">Loading reflections…</p> : journals.length ? <div className="mt-4 divide-y divide-[#e8e9e2]">{journals.map(entry => <Link key={entry._id} to={`/journal?entry=${entry._id}`} className="block py-3 hover:text-[#496b52]"><p className="font-medium">{entry.title}</p><p className="mt-1 line-clamp-2 text-sm text-[#788078]">{entry.body}</p><p className="mt-2 text-xs text-[#879087]">{new Date(entry.createdAt).toLocaleDateString('en-IN')}</p></Link>)}</div> : <p className="my-8 text-sm text-[#788078]">A sentence, a thought, a feeling. Your space to reflect is ready.</p>}<Link to="/journal" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#496b52]">Open your journal <ArrowRight size={15} /></Link></Card>
      <Card className="lg:col-span-2"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#71806f]">Something to look forward to</p><h2 className="mt-2 text-xl font-semibold">Your upcoming events</h2></div><Link to="/events" className={button}>Discover events <CalendarDays size={16} /></Link></div>
        {eventsLoading ? <p role="status" className="py-8 text-sm">Loading your events…</p> : eventsError ? <div role="alert" className="mt-4 text-sm text-red-700">{eventsError}<button onClick={loadEvents} className="ml-3 inline-flex items-center gap-1 underline"><RefreshCw size={14} />Retry</button></div> : upcoming.length ? <div className="mt-5 grid gap-3 sm:grid-cols-3">{upcoming.slice(0, 3).map(item => <Link to="/events?tab=mine" key={item.id} className="rounded-xl border border-[#e8e9e2] p-4 hover:bg-[#f8f9f5]"><p className="text-xs text-[#71806f]">{item.event.isDemo ? 'Demo · ' : ''}{item.status === 'confirmed' ? 'Confirmed' : 'Registration incomplete'}</p><h3 className="mt-2 font-medium">{item.event.title}</h3><p className="mt-2 text-xs text-[#788078]">{eventDate(item.event.startsAt)}</p><p className="mt-1 text-xs text-[#788078]">{item.event.format}</p></Link>)}</div> : <p className="py-8 text-sm text-[#788078]">You haven’t enrolled in an upcoming event yet. Explore a session that feels right for you.</p>}<Link to="/events?tab=mine" className="mt-4 inline-block text-sm text-[#496b52] hover:underline">View all my events</Link>
      </Card>
    </div><div className="mt-6 flex flex-wrap gap-3">{[[MessageCircle, '/chat', 'Talk it through'], [Wind, '/wellness', 'Find a quiet moment'], [CalendarDays, '/events', 'Connect at an event']].map(([Icon, to, label]) => <Link key={to} to={to} className="inline-flex items-center gap-2 rounded-full border border-[#e8e9e2] bg-white px-4 py-3 text-sm text-[#496b52]"><Icon size={16} />{label}</Link>)}</div>
  </div></main>;
}
