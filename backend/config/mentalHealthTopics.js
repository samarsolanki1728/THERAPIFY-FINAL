// Product vocabulary: topic coverage, not diagnoses or a clinical risk score.
const topicGroups = {
  emotions: 'Happy, Sad, Angry, Anxious, Stressed, Depressed, Lonely, Frustrated, Overwhelmed, Confused, Irritated, Guilty, Ashamed, Hopeless, Helpless, Fearful, Insecure, Jealous, Disappointed, Nervous, Worried, Exhausted, Numb, Empty, Restless, Peaceful, Calm, Grateful, Motivated, Confident, Optimistic, Content, Excited, Relieved, Loved, Rejected, Worthless, Burned Out',
  conditions: 'Anxiety, Depression, Bipolar Disorder, OCD, PTSD, ADHD, Panic Disorder, Social Anxiety, Generalized Anxiety Disorder, GAD, Phobias, Eating Disorders, Insomnia, Substance Use Disorder, Personality Disorders, Schizophrenia, Adjustment Disorder, Seasonal Affective Disorder, Health Anxiety',
  concerns: 'Overthinking, Rumination, Negative Thoughts, Intrusive Thoughts, Self-Doubt, Low Self-Esteem, Perfectionism, Procrastination, Emotional Instability, Mood Swings, Social Isolation, Fear of Failure, Fear of Rejection, Imposter Syndrome, Trust Issues, Attachment Issues, People-Pleasing, Emotional Dependency, Relationship Anxiety, Lack of Motivation, Concentration Problems',
  challenges: 'Academic Stress, Exam Anxiety, Work Pressure, Career Uncertainty, Financial Stress, Family Conflict, Relationship Problems, Breakups, Friendship Issues, Peer Pressure, Bullying, Loneliness, Grief, Bereavement, Loss, Trauma, Homesickness, Social Pressure, Burnout, Sleep Deprivation, Life Transitions',
  therapy: 'Cognitive Behavioral Therapy, CBT, Dialectical Behavior Therapy, DBT, Acceptance and Commitment Therapy, ACT, Mindfulness-Based Therapy, Psychotherapy, Talk Therapy, Interpersonal Therapy, IPT, Solution-Focused Therapy, Behavioral Activation, Cognitive Restructuring, Exposure Therapy, Motivational Interviewing, Psychoeducation, Reflective Listening, Validation, Grounding, Guided Imagery',
  wellness: 'Meditation, Mindfulness, Deep Breathing, Box Breathing, Progressive Muscle Relaxation, Journaling, Gratitude Practice, Positive Affirmations, Visualization, Body Scan, Yoga, Physical Exercise, Sleep Hygiene, Self-Care, Emotional Regulation, Stress Management, Time Management, Healthy Boundaries, Self-Compassion, Relaxation, Coping Skills, Digital Detox',
  indicators: 'Mood Tracking, Emotional Triggers, Emotional Patterns, Behavioral Changes, Withdrawal, Avoidance, Irritability, Crying, Fatigue, Appetite Changes, Sleep Disturbances, Loss of Interest, Emotional Exhaustion, Excessive Worry, Racing Thoughts, Panic Symptoms, Difficulty Concentrating, Motivation Changes, Social Engagement',
  recovery: 'Resilience, Emotional Intelligence, Self-Awareness, Self-Acceptance, Self-Love, Personal Growth, Healthy Relationships, Emotional Balance, Psychological Flexibility, Self-Confidence, Purpose, Motivation, Hope, Recovery, Coping Capacity, Gratitude, Life Satisfaction',
  safety: 'Self-Harm, Suicidal Thoughts, Suicidal Ideation, Suicide Risk, Crisis, Abuse, Domestic Violence, Emotional Abuse, Physical Abuse, Sexual Abuse, Neglect, Panic Attack, Dissociation, Severe Distress, Safety Planning, Emergency Support, Professional Help',
  product: 'Sentiment Analysis, Emotion Detection, Mood Classification, Emotional Trend Analysis, Stress Detection, Journal Analysis, Conversation Context, Personalized Recommendations, Weekly Reflection, Behavioral Pattern Recognition, Mood Forecasting, Context Awareness, Long-Term Memory, Empathetic Responses, Risk Detection, Privacy Consent, Data Minimization'
};
for (const key of Object.keys(topicGroups)) topicGroups[key] = topicGroups[key].split(', ');
const normalize = text => String(text || '').normalize('NFKC').replace(/[’‘]/g, "'").replace(/[‐‑–—-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const terms = Object.values(topicGroups).flat().map(normalize);
function matchesTopic(text) {
  const normalized = ` ${normalize(text).replace(/[^\p{L}\p{N}' ]/gu, ' ')} `;
  return terms.some(term => normalized.includes(` ${term} `));
}
module.exports = { topicGroups, normalize, matchesTopic };
