const { checkTopicScope } = require('./scopeService');
const cleanText = (value, limit) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, limit) : '';
const array = value => Array.isArray(value) ? value : [];

function sanitizeHistory(history) {
  const valid = array(history).filter(item => item && ['user', 'ai'].includes(item.role) && typeof item.text === 'string');
  const filtered = valid.filter((item, index) => !item.outOfScope && !(item.role === 'user' && valid[index + 1]?.outOfScope));
  const selected = []; let remaining = 18000;
  for (const item of filtered.slice(-20).reverse()) {
    const text = cleanText(item.text, Math.min(3000, remaining));
    if (!text) continue;
    selected.unshift({ role: item.role, text, isCrisis: item.isCrisis === true,
      safetyCategory: typeof item.safetyCategory === 'string' ? item.safetyCategory.slice(0, 40) : null,
      awaitingSafetyCheck: item.awaitingSafetyCheck === true });
    remaining -= text.length; if (remaining <= 0) break;
  }
  return selected;
}
function sanitizeWellnessContext(context) {
  const source = context && typeof context === 'object' ? context : {};
  return {
    moodEntries: array(source.moodEntries).slice(0, 7).map(entry => ({
      date: cleanText(entry?.date, 10), moodScore: Number.isFinite(entry?.moodScore) ? entry.moodScore : null,
      moodLabel: cleanText(entry?.moodLabel, 50), emotions: array(entry?.emotions).slice(0, 8).map(value => cleanText(value, 40)),
      note: cleanText(entry?.note, 300), answers: array(entry?.answers).slice(0, 6).map(answer => ({ question: cleanText(answer?.question, 160), answer: cleanText(answer?.answer, 200) }))
    })),
    recentChatThemes: array(source.recentChatThemes).slice(0, 3).map(entry => ({ date: cleanText(entry?.date, 30), conversationTitle: cleanText(entry?.conversationTitle, 100), recentUserNotes: array(entry?.recentUserNotes).slice(-3).map(value => cleanText(value, 300)) })),
    journalThemes: array(source.journalThemes).slice(0, 3).map(entry => ({ date: cleanText(entry?.date, 30), title: cleanText(entry?.title, 100), mood: cleanText(entry?.mood, 60), snippet: cleanText(entry?.snippet, 400) }))
  };
}
function safeName(value) {
  const name = cleanText(value, 60);
  return /^[\p{L}\p{M}][\p{L}\p{M} '\-]{0,59}$/u.test(name) ? name : '';
}
function buildMemory(history, context = {}) {
  const prior = array(history).filter(item => item?.role === 'user' && typeof item.text === 'string' && checkTopicScope(item.text).inScope);
  const excerpts = prior.slice(0, -10).filter(item => /\b(?:my name is|call me|i prefer|please don't|do not suggest|don't suggest|just listen|my (?:partner|family|job)|i work|i live)\b/i.test(item.text)).slice(-6).map(item => cleanText(item.text, 220));
  let name = safeName(context.name);
  for (const item of prior) {
    const match = item.text.match(/\b(?:my name is|please call me|call me)\s+([\p{L}\p{M}][\p{L}\p{M}'-]*(?: [\p{L}\p{M}][\p{L}\p{M}'-]*){0,2})(?=[.!?,\n]|$)/iu);
    if (match) name = safeName(match[1]);
  }
  return {
    profileName: name || null,
    earlierUserExcerpts: excerpts,
    personalizationEnabled: context.contextConsent === true,
    wellnessContext: context.contextConsent === true ? sanitizeWellnessContext(context.wellnessContext) : null
  };
}
function contextTexts(context) {
  const data = sanitizeWellnessContext(context);
  return [
    ...data.moodEntries.flatMap(entry => [entry.note, ...entry.answers.map(answer => answer.answer)]),
    ...data.recentChatThemes.flatMap(entry => entry.recentUserNotes),
    ...data.journalThemes.map(entry => entry.snippet)
  ].filter(Boolean);
}
module.exports = { cleanText, sanitizeHistory, sanitizeWellnessContext, buildMemory, contextTexts };
