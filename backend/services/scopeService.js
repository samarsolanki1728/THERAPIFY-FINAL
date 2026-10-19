const { normalize, matchesTopic } = require('../config/mentalHealthTopics');
const SCOPE_REPLY = "I can help with emotions, mental health, relationships, and coping, but I can't provide code, homework answers, or unrelated information. If this task is causing stress, we can talk about that.";
const explicitNonSupport = [
  /\b(?:write|generate|create|build|debug|fix|explain|show|give|provide|teach|implement|convert|translate)\b.{0,100}\b(?:code|coding|program|script|algorithm|sql|html|css|javascript|typescript|python|java|c\+\+|react component|api endpoint|pseudocode)\b/,
  /\b(?:code|program|script|algorithm)\b.{0,70}\b(?:for me|in python|in java|in javascript|example|snippet|implementation)\b/,
  /\b(?:solve|calculate|compute|differentiate|integrate|factorize)\b.{0,60}(?:\d|\b(?:equation|math|integral|derivative|algebra|homework)\b)/,
  /\b(?:answer|solve|do|complete|write|help with|help me with|help me solve)\b.{0,70}\b(?:homework|assignment|exam questions?|math problems?|essay|dissertation|research paper|problem set)\b/,
  /\b(?:explain|teach|summarize|describe|what is|what are|tell me about)\b.{0,60}\b(?:photosynthesis|newton|calculus|algebra|trigonometry|chemical reaction|world war|programming|data structures|sorting algorithm|stock prices?|election results?|cricket scores?)\b/,
  /\b(?:weather forecast|capital of|president of|prime minister of|recipe for|football scores?|cricket scores?|celebrity gossip)\b/,
  /\b(?:ignore|override|forget|bypass)\b.{0,60}\b(?:instructions|system prompt|rules|restrictions|boundaries|safety)\b/,
  /\b(?:reveal|print|show|repeat)\b.{0,50}\b(?:system prompt|developer instructions|api key|secret key)\b/,
  /(?:\x60\x60\x60|\bconsole\.log\s*\(|\bdef\s+\w+\s*\(|\bSELECT\s+.+\s+FROM\b)/i,
  /^\s*\d+(?:\.\d+)?\s*[+*/=×÷-]\s*\d+/
];
const supportLanguage = /\b(?:feel(?:ing|s)?|emotion(?:al|s)?|stress(?:ed|ful)?|worr(?:y|ies|ied)|fear|panic|sleep|relationship|partner|breakup|bull(?:y|ied|ying)|therap(?:y|ist)|counsel(?:ing|ling|lor)|mental health|wellbeing|well being|wellness|coping|self esteem|breathe|burnt out|burned out|sadness|anger|griev(?:ing|e)|anxious|motivated|hurt|upset|cry|tired|lonely|struggling)\b/;
const conversation = /^(?:hi|hello|hey|thanks|thank you|yes|no|maybe|okay|ok|please|i don't know|i do not know|tell me more|go on|why|how so|that helps|not really|a little|what should i do|what can i do|what is my name|who am i)[.!? ]*$/;
const memoryRequest = /\b(?:my name is|call me|what(?:'s| is) my name|remember (?:me|my name|what|our)|what did (?:i|we)|earlier|last time|previous (?:chat|conversation)|forget (?:that|what i)|stop suggesting|don't suggest|do not suggest|just listen|no (?:advice|exercises)|privacy|consent|therapify)\b/;
function checkTopicScope(message, history = []) {
  const text = normalize(message);
  if (!text || explicitNonSupport.some(pattern => pattern.test(text))) return { inScope: false, reply: SCOPE_REPLY };
  if (matchesTopic(text) || supportLanguage.test(text) || conversation.test(text) || memoryRequest.test(text)) return { inScope: true };
  if (/\b(?:can|could|would) (?:we|i) (?:talk|chat|speak)\b/.test(text)) return { inScope: true };
  // Short follow-ups need not repeat a topic keyword. The model also classifies
  // the requested task before answering, so earlier support cannot license code.
  if (/\b(?:i|i'm|i've|my|me|we|our)\b/.test(text) && !/\b(?:write|generate|calculate|solve|code|homework|assignment)\b/.test(text)) return { inScope: true };
  const prior = Array.isArray(history) ? history.slice(-8).filter(item => item?.role === 'user' && typeof item.text === 'string') : [];
  if (text.length <= 240 && prior.some(item => matchesTopic(item.text) || supportLanguage.test(normalize(item.text))) && !/^(?:who|where|when|what)\b.*\b(?:invented|discovered|won|capital|president)\b/.test(text)) return { inScope: true };
  return { inScope: false, reply: SCOPE_REPLY };
}
module.exports = { checkTopicScope, SCOPE_REPLY };
