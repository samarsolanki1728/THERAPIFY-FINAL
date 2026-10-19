import { Link } from 'react-router';
import { ArrowRight, MessageCircle, TrendingUp, BookOpen, Wind, Shield, CalendarDays, Heart, Moon, Check } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

const paths = [
  { icon: MessageCircle, title: 'Talk it through', description: 'A supportive conversation when your thoughts need somewhere to go.', to: '/chat', label: 'Open AI chat' },
  { icon: TrendingUp, title: 'Notice your patterns', description: 'A quick daily check-in. A clearer picture of how you feel over time.', to: '/mood', label: 'Track your mood' },
  { icon: BookOpen, title: 'Make room to reflect', description: 'Put the day into words in your own personal journal.', to: '/journal', label: 'Open your journal' },
  { icon: Wind, title: 'Take a small pause', description: 'Simple practices for grounding, breathing, and everyday self-care.', to: '/wellness', label: 'Explore practices' }
];

export default function LandingLayout({ user, formattedDate, greetingText, moodsList, selectedMood, handleSelectMood, saving, error, successMsg, hasWeekData, weekData, insightMessage }) {
  return <main className="landing-review">
    <section className="landing-hero review-container">
      <div className="hero-intro">
        <p className="review-eyebrow"><span /> EVERYDAY CARE, AT YOUR PACE</p>
        <h1 className="font-display">A quieter mind.<br /><em>More room for you.</em></h1>
        <p className="hero-description">A place to talk, understand how you feel, and build small habits that fit your life. Start wherever feels right today.</p>
        <div className="review-actions"><Link to="/dashboard" className="review-button primary">Go to Dashboard <ArrowRight size={17} /></Link><Link to="/chat" className="review-button secondary"><MessageCircle size={17} /> Talk it through</Link></div>
        <p className="hero-privacy"><Shield size={15} /><span>You choose what to share. <Link to="/privacy">How privacy works</Link></span></p>
        <div className="hero-shortcuts"><Link to="/mood"><TrendingUp size={17} /> Track a mood <ArrowRight size={14} /></Link><Link to="/journal"><BookOpen size={17} /> Write a reflection <ArrowRight size={14} /></Link></div>
      </div>
      <div className="hero-workspace">
        <div className="workspace-top"><span><span className="status-dot" /> YOUR DAILY SPACE</span><span>{formattedDate}</span></div>
        <div className="daily-card">
          <div className="daily-heading"><div><p>{greetingText}</p><h2 className="font-display">How are you feeling?</h2></div><Heart size={24} strokeWidth={1.4} /></div>
          <p className="daily-caption">Take a moment. There is no right answer.</p>
          <div className="daily-moods" role="group" aria-label="Today's mood">{moodsList.map(mood => <button key={mood.value} type="button" aria-pressed={selectedMood === mood.value} disabled={saving} onClick={() => handleSelectMood(mood.value)}><span aria-hidden="true">{mood.emoji}</span><span>{mood.label}</span></button>)}</div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{successMsg && <p role="status" className="text-sm text-primary">{successMsg}</p>}
          <div className="daily-trends"><div className="daily-trends-title"><span>Your week at a glance</span><Link to="/mood">View mood history <ArrowRight size={13} /></Link></div>
            {hasWeekData ? <ResponsiveContainer width="100%" height={98}><LineChart data={weekData}><XAxis dataKey="day" tick={{fontSize:10}} axisLine={false} tickLine={false}/><YAxis hide domain={[1,5]}/><Tooltip/><Line type="monotone" dataKey="mood" stroke="var(--primary)" strokeWidth={2} connectNulls={false} dot={{r:3}}/></LineChart></ResponsiveContainer> : <div className="daily-empty"><TrendingUp size={25} strokeWidth={1.3}/><div><strong>Your story starts with one check-in.</strong><p>{user ? 'Log a mood to begin building your personal history.' : 'Sign in to save your moods and see your own patterns.'}</p></div></div>}
          </div>
          <p className="daily-note"><Shield size={14}/>{user ? insightMessage : 'Your check-ins stay connected to your own account.'}</p>
        </div>
        <Link to="/journal?new=1" className="workspace-journal"><BookOpen size={21} strokeWidth={1.5}/><div><strong>A thought worth keeping?</strong><span>Give it a little space in your journal.</span></div><ArrowRight size={18}/></Link>
      </div>
    </section>

    <section id="features" className="review-features review-container">
      <div className="review-section-heading"><div><p className="review-eyebrow">FIND YOUR STARTING POINT</p><h2 className="font-display">What would help today?</h2></div><p>No routine to get right.<br />Just choose what you need.</p></div>
      <div className="review-paths">{paths.map(({icon:Icon,...item},i)=><Link to={item.to} key={item.to} className="review-path"><div className="path-top"><Icon size={23} strokeWidth={1.5}/><span>0{i+1}</span></div><h3 className="font-display">{item.title}</h3><p>{item.description}</p><span className="path-link">{item.label}<ArrowRight size={16}/></span></Link>)}</div>
    </section>

    <section id="how" className="review-how review-container"><div><p className="review-eyebrow">A SIMPLE WAY TO BEGIN</p><h2 className="font-display">Small steps.<br /><em>Your own rhythm.</em></h2></div><ol>{[{title:'Make yourself at home',text:'Create your account and choose a place to begin.'},{title:'Check in with yourself',text:'Talk, write, or take a pause. A few minutes is enough.'},{title:'Come back when you need',text:'Return to your reflections and notice what feels helpful.'}].map((step,i)=><li key={step.title}><span>0{i+1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol></section>

    <section className="review-discover review-container"><div className="practice-panel"><p className="review-eyebrow">MAKE TIME FOR A PAUSE</p><h2 className="font-display">A little care, within reach.</h2><p>Explore gentle practices in the wellness library.</p><div className="practice-list">{[{icon:Wind,title:'Guided breathing',detail:'A moment to slow down',id:'breath'},{icon:Heart,title:'Grounding practice',detail:'Reconnect with the present',id:'ground'},{icon:Moon,title:'Gratitude pause',detail:'Notice a small good thing',id:'gratitude'}].map(({icon:Icon,...p})=><Link key={p.id} to={`/wellness?activity=${p.id}`}><Icon size={20}/><div><strong>{p.title}</strong><span>{p.detail}</span></div><ArrowRight size={17}/></Link>)}</div></div><div className="community-panel"><CalendarDays size={30} strokeWidth={1.3}/><p className="review-eyebrow">SPACE FOR CONNECTION</p><h2 className="font-display">You can make<br />time together.</h2><p>Discover wellness events and shared experiences. Find something that fits your interests and your pace.</p><Link to="/events" className="review-button secondary">Browse events <ArrowRight size={17}/></Link><p className="community-footnote">Explore the details before deciding what feels right.</p></div></section>

    <section className="review-final review-container"><div><p className="review-eyebrow">WHENEVER YOU ARE READY</p><h2 className="font-display">Your next moment starts here.</h2><p>A check-in, a conversation, a little room to breathe.</p></div><Link to={user ? '/dashboard' : '/register'} className="review-button primary">{user ? 'Go to Dashboard' : 'Create your account'}<ArrowRight size={18}/></Link></section>
  </main>;
}
