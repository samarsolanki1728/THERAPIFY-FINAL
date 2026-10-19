import { createStore } from './store.js';
const store = createStore();
const definitions = [
  ['mindful-mornings', 'Mindful mornings', 'Mindfulness', 'A little space to breathe, notice, and begin again.', 'Online'],
  ['quiet-mind', 'A quieter mind', 'Meditation', 'Explore a gentle guided meditation at your own pace.', 'Online'],
  ['everyday-stress', 'Making room for rest', 'Stress Management', 'Reflect on everyday pressure and build a small rest ritual.', 'In person'],
  ['gentle-movement', 'Stretch, breathe, reset', 'Yoga', 'A comfortable movement break with room to pause.', 'Online'],
  ['self-care-circle', 'Your self-care circle', 'Self-Care', 'Make a simple plan for the things that help you feel supported.', 'In person'],
  ['emotional-check-in', 'Understanding your feelings', 'Emotional Wellness', 'Practice naming emotions through guided reflection.', 'Online']
];
let added = 0;
for (const [index, [slug, title, category, shortDescription, format]] of definitions.entries()) {
  const id = `demo-${slug}`;
  if (store.event(id)) continue;
  const starts = new Date(); starts.setDate(starts.getDate() + index + 2); starts.setHours(18, 0, 0, 0);
  store.putEvent({ _id: id, slug, title, category, shortDescription, format,
    description: `${shortDescription} This is a demonstration listing for trying the Therapify events experience. No live session or real booking is provided.`,
    host: 'Therapify demo host', venue: format === 'Online' ? 'Online — demonstration only' : 'Demo wellness space — no physical venue',
    startsAt: starts.toISOString(), endsAt: new Date(starts.getTime() + 45 * 60000).toISOString(),
    pricePaise: 0, capacity: 30, isDemo: true, agenda: ['Welcome and settle in', 'Guided practice', 'Time for reflection'] });
  added++;
}
store.close(); console.log(`Added ${added} clearly labelled demo events. Existing records were preserved.`);
