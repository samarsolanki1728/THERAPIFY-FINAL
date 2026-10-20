const { randomInt } = require('node:crypto');
const { checkMessageSafety } = require('./safetyService');
const { checkTopicScope } = require('./scopeService');

function detectChatIntent(message, history = []) {
  const safety = checkMessageSafety(message, history);
  if (safety.intercept) return { intent: 'safety', safety };
  const scope = checkTopicScope(message, history);
  if (!scope.inScope) return { intent: 'unrelated', scope };
  return { intent: scope.intent || 'emotional_support', scope };
}

function variedReply(options, history = []) {
  const recent = new Set(history.filter(item => item?.role === 'ai').slice(-6).map(item => item.text));
  const available = options.filter(text => !recent.has(text));
  // When every variant has appeared recently, still avoid consecutive repeats.
  const choices = available.length ? available : options.filter(text => text !== history.at(-1)?.text);
  return choices[randomInt(choices.length)] || options[0];
}

function greetingReply(message, history = []) {
  const time = message.toLowerCase().match(/good (morning|afternoon|evening)/)?.[1];
  if (time) return variedReply([
    `Good ${time}! How's your day going?`,
    `Good ${time}! What would you like to chat about?`,
    `Good ${time}! Anything on your mind today?`
  ], history);
  if (/how are you|how.s it going|what.s up/i.test(message)) return variedReply([
    "I'm here and ready to chat! How's your day going?",
    "Ready to listen or just chat for a bit. How are you doing?",
    "Thanks for asking! What's been happening in your day?"
  ], history);
  return variedReply([
    "Hi! How's your day going?",
    "Hello! What would you like to chat about?",
    "Hey! Anything on your mind today?"
  ], history);
}

module.exports = { detectChatIntent, greetingReply, variedReply };
