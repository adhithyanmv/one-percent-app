const mongoose = require("mongoose");
const { todayISTString } = require("../utils/istTime");

const MILESTONES = [3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 365];

const habitSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ["good", "bad"], required: true },
  // For "good" habits: dates (YYYY-MM-DD) the user marked as done.
  // For "bad" habits: dates (YYYY-MM-DD) the user marked as a relapse/slip.
  markedDates: { type: [String], default: [] },
  startDate: { type: String, default: () => todayISTString() },
  longestStreak: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

function daysBetween(a, b) {
  const d1 = new Date(a + "T00:00:00Z");
  const d2 = new Date(b + "T00:00:00Z");
  return Math.round((d2 - d1) / 86400000);
}

// Computes the current streak for a habit as of "today" (YYYY-MM-DD).
habitSchema.methods.getStreak = function (today) {
  today = today || todayISTString();

  if (this.type === "bad") {
    // Streak = days clean since the most recent relapse (or since start date if none).
    const sorted = [...this.markedDates].sort();
    const lastRelapse = sorted.length
      ? sorted[sorted.length - 1]
      : this.startDate;
    return Math.max(0, daysBetween(lastRelapse, today));
  }

  // Good habit: consecutive days ending today (or yesterday, so it doesn't
  // zero out at midnight before the user has had a chance to check in today).
  const doneSet = new Set(this.markedDates);
  let streak = 0;
  let cursor = doneSet.has(today)
    ? today
    : new Date(new Date(today + "T00:00:00Z").getTime() - 86400000)
        .toISOString()
        .slice(0, 10);
  while (doneSet.has(cursor)) {
    streak += 1;
    cursor = new Date(new Date(cursor + "T00:00:00Z").getTime() - 86400000)
      .toISOString()
      .slice(0, 10);
  }
  return streak;
};

habitSchema.methods.nextMilestone = function (currentStreak) {
  return MILESTONES.find((m) => m > currentStreak) || null;
};

habitSchema.methods.hitMilestoneToday = function (currentStreak) {
  return MILESTONES.includes(currentStreak);
};

module.exports = mongoose.model("Habit", habitSchema);
module.exports.MILESTONES = MILESTONES;
