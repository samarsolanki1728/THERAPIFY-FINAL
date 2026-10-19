
const wellnessCatalog = require("../../shared/wellnessCatalog.json");

function getWellnessActivities() {
  return wellnessCatalog;
}

function getActivityById(id) {
  return wellnessCatalog.find(
    (activity) => activity.id === id
  ) || null;
}

function getActivitiesForMood(moodScore) {
  const recommendations = {
    1: ["ground", "scan", "breath"],
    2: ["breath", "ground", "sleep"],
    3: ["morning", "scan", "movement"],
    4: ["gratitude", "movement", "morning"],
    5: ["gratitude", "morning", "movement"]
  };

  const ids = recommendations[Number(moodScore)] || [];

  return ids
    .map((id) => getActivityById(id))
    .filter(Boolean);
}

module.exports = {
  getWellnessActivities,
  getActivityById,
  getActivitiesForMood
};
