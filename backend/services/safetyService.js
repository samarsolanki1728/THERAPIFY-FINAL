const { normalize } = require('../config/mentalHealthTopics');
const RESOURCES = 'If you are in immediate danger, contact your local emergency services. In India, call **112** for an emergency or **14416 (Tele-MANAS)** for mental-health support.';
const urgentReply = "I'm concerned about your safety. " + RESOURCES + " If you can do so safely, move away from anything you could use to hurt yourself and reach someone you trust who can stay with you. Are you safe right now?";
const sensitiveReply = "Thank you for telling me. You deserve support with this, and you don't have to manage it alone. " + RESOURCES + " Are you safe right now?";
const result = (category, level, reply = null) => ({ category, level, requiresSafetyHandling: category !== 'none', isCrisis: level === 'urgent' || category === 'self_harm' && level === 'sensitive', intercept: Boolean(reply), reply });

function checkMessageSafety(message, history = []) {
  if (typeof message !== 'string' || !message.trim()) return result('none', 'none');
  const text = normalize(message);
  const prior = Array.isArray(history) ? history.slice(-4) : [];
  const lastAI = [...prior].reverse().find(item => item?.role === 'ai');
  const safetyFollowup = lastAI?.awaitingSafetyCheck || (lastAI?.isCrisis && /are you safe (?:right now|in this moment)/i.test(lastAI.text || ''));
  if (safetyFollowup && /^(?:no|not safe|i'm not safe|i am not safe)[.! ]*$/.test(text)) {
    if (lastAI.safetyCategory === 'abuse') return result('abuse', 'urgent', "I'm sorry you're in this situation. If you are in immediate danger, contact emergency services if you can do so safely, or move to a safer place and contact someone you trust. " + RESOURCES + ' Can you reach someone safe now?');
    if (lastAI.safetyCategory === 'acute_distress') return result('acute_distress', 'urgent', "Please seek urgent in-person help now if you may be in danger or your symptoms feel severe. If possible, ask someone you trust to stay with you and contact local emergency services. " + RESOURCES);
    return result('self_harm', 'urgent', urgentReply);
  }
  if (safetyFollowup && /^(?:yes|i'm safe|i am safe|yes i'm safe|yes i am safe)[.! ]*$/.test(text)) return result(lastAI.safetyCategory || 'self_harm', 'sensitive', "I'm glad you're safe right now. If possible, stay connected with someone you trust and consider professional support. What would help you feel supported for the next few minutes?");
  const educational = /^(?:what (?:is|are|does)|define|explain|tell me about|how (?:can|do) (?:people|someone)|what's the difference)\b/.test(text);
  const historicalOrNegated = /\b(?:used to|last year|years ago|in the past|no longer|not suicidal|not having suicidal|not thinking (?:about|of) (?:suicide|self harm))\b/.test(text);
  const currentOverride = /\b(?:but now|right now|today|tonight|about to)\b/.test(text);
  const imminent = /\b(?:i (?:want|plan|intend) to|i'm going to|i am going to|i'm about to|i am about to) (?:kill myself|end my life|hurt myself|harm myself|commit suicide)\b/.test(text) ||
    /\b(?:i (?:have|already) (?:taken an overdose|overdosed)|i've (?:taken an overdose|overdosed)|i took (?:an overdose|too many pills)|i am not safe|i'm not safe|i can't keep myself safe|i cannot keep myself safe)\b/.test(text) ||
    /\b(?:someone|he|she|my partner|my father|my mother) (?:is|are) (?:attacking|hurting|threatening to kill) me\b/.test(text);
  if (imminent && (!historicalOrNegated || currentOverride)) return result('immediate_danger', 'urgent', urgentReply);
  const selfHarm = /\b(?:self harm|self injury|suicid(?:e|al)|kill myself|hurt myself|harm myself|end my life|want to die|don't want to live|do not want to live|better off dead|ending it all|cut myself|hang myself|slit my wrists?|can't go on|cannot go on)\b/.test(text);
  if (selfHarm) {
    if (historicalOrNegated && !currentOverride) return result('self_harm', 'historical');
    if (educational && !/\b(?:myself|i want|i plan|i am|i'm|my friend|my partner)\b/.test(text)) return result('self_harm', 'educational');
    return { ...result('self_harm', 'sensitive', sensitiveReply), awaitingSafetyCheck: true };
  }
  const abuse = /\b(?:abuse|abused|abusive|domestic violence|sexual assault|assaulted|rape|raped|neglect|neglected|hits me|hit me|hurts me|forced me|coerced)\b/.test(text);
  if (abuse) {
    if (educational || !/\b(?:i|i'm|me|my|we|our|friend|partner)\b/.test(text)) return result('abuse', 'educational');
    return { ...result('abuse', 'sensitive', "What happened is not your fault. If it's safe, contact someone you trust or a local support service; you don't need to confront the person hurting you. " + RESOURCES + " Are you somewhere safe right now?"), awaitingSafetyCheck: true };
  }
  if (/\b(?:panic attack|panic symptoms|dissociation|dissociating|severe distress)\b/.test(text)) {
    if (educational || !/\b(?:i|i'm|me|my|right now|help)\b/.test(text)) return result('acute_distress', 'educational');
    return { ...result('acute_distress', 'sensitive', "That sounds frightening. If you can, sit somewhere safe and notice where you are and a few things around you; breathe comfortably without forcing it or holding your breath. If you have new or severe chest pain, trouble breathing, fainting, or immediate danger, seek urgent medical help rather than assuming it is anxiety. Is someone you trust nearby?"), awaitingSafetyCheck: true };
  }
  if (/\b(?:crisis|safety planning|emergency support|professional help|risk detection)\b/.test(text)) return result('safety_support', 'educational');
  return result('none', 'none');
}
module.exports = { checkMessageSafety, RESOURCES, urgentReply, sensitiveReply };
