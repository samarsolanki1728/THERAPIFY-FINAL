const express = require('express');
const WellnessSession = require('../models/WellnessSession');
const MoodCheckin = require('../models/MoodCheckin');

// Pass the existing Therapify auth middleware when mounting this router.
module.exports = function createWellnessRoutes(requireAuth) {
  if (typeof requireAuth !== 'function') throw new Error('Auth middleware is required');
  const router = express.Router();
  router.use(requireAuth);

  // Only the authenticated user's most recent completed check-in is read.
  // Raw questionnaire answers are never sent to YouTube or returned here.
  router.get('/recommendations', async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.id || req.user?._id;
      if (!userId) return res.status(401).json({ message: 'Authentication required' });
      const checkin = await MoodCheckin.findOne({ user: userId, completed: true })
        .sort({ updatedAt: -1, _id: -1 })
        .select('recommendations ageGroup reflection')
        .lean();
      if (!checkin) return res.json({ hasCheckin: false, recommendations: [] });
      const allowed = new Set(['breathing', 'grounding', 'mindfulness', 'journaling', 'movement', 'sleep']);
      const suggestions = (checkin.recommendations || [])
        .filter(item => item && allowed.has(item.id))
        .slice(0, 3)
        .map(item => ({ id: item.id, reason: String(item.reason || '').slice(0, 180) }));
      return res.json({ hasCheckin: true, recommendations: suggestions });
    } catch (err) {
      console.error('Wellness recommendation lookup failed:', err.message);
      return res.status(500).json({ message: 'Could not load recommendations' });
    }
  });

  router.post('/sessions', async (req, res) => {
    try {
      // Adapt this line if your auth middleware stores the user ID differently.
      const userId = req.user?.id || req.user?._id || req.user?.userId;
      if (!userId) return res.status(401).json({ message: 'Authentication required' });
      const { activityId, helpfulness } = req.body || {};
      if (activityId !== 'ucla-mindfulness' || !['helped', 'neutral', 'not_helpful'].includes(helpfulness)) {
        return res.status(400).json({ message: 'Invalid activity or feedback' });
      }
      const session = await WellnessSession.create({ user: userId, activityId, helpfulness });
      return res.status(201).json({ id: session._id, saved: true });
    } catch (err) {
      console.error('Wellness session save failed:', err.message);
      return res.status(500).json({ message: 'Could not save session' });
    }
  });

  router.get('/sessions', async (req, res) => {
    try {
      const userId = req.user?.id || req.user?._id || req.user?.userId;
      if (!userId) return res.status(401).json({ message: 'Authentication required' });
      const sessions = await WellnessSession.find({ user: userId }).sort({ createdAt: -1 }).limit(30).lean();
      return res.json(sessions);
    } catch (err) {
      return res.status(500).json({ message: 'Could not load sessions' });
    }
  });
  return router;
};