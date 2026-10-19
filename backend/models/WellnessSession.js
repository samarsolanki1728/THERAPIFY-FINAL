const mongoose = require('mongoose');

const wellnessSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  activityId: { type: String, enum: ['ucla-mindfulness'], required: true },
  helpfulness: { type: String, enum: ['helped', 'neutral', 'not_helpful'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('WellnessSession', wellnessSessionSchema);