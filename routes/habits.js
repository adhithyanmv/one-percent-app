const express = require("express");
const router = express.Router();
const Habit = require("../models/Habit");
const { todayISTString } = require("../utils/istTime");

function todayStr() {
  return todayISTString();
}

function serialize(habit) {
  const streak = habit.getStreak();
  return {
    id: habit._id,
    name: habit.name,
    type: habit.type,
    streak,
    longestStreak: Math.max(habit.longestStreak, streak),
    nextMilestone: habit.nextMilestone(streak),
    hitMilestoneToday: habit.hitMilestoneToday(streak),
    markedToday: habit.markedDates.includes(todayStr()),
    startDate: habit.startDate,
  };
}

// GET all habits
router.get("/", async (req, res) => {
  try {
    const habits = await Habit.find().sort({ createdAt: 1 });
    res.json(habits.map(serialize));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE a habit
router.post("/", async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !["good", "bad"].includes(type)) {
      return res
        .status(400)
        .json({ error: 'name and type ("good" or "bad") are required' });
    }
    const habit = await Habit.create({ name, type });
    res.status(201).json(serialize(habit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK a habit for today
// good habit -> marking means "I did it today" (builds streak)
// bad habit  -> marking means "I relapsed today" (resets streak to 0)
router.post("/:id/mark", async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ error: "Habit not found" });

    const today = todayStr();
    if (!habit.markedDates.includes(today)) {
      habit.markedDates.push(today);
    }
    const streak = habit.getStreak();
    habit.longestStreak = Math.max(habit.longestStreak, streak);
    await habit.save();
    res.json(serialize(habit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UNDO today's mark (in case of a mis-tap)
router.post("/:id/undo", async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ error: "Habit not found" });
    const today = todayStr();
    habit.markedDates = habit.markedDates.filter((d) => d !== today);
    await habit.save();
    res.json(serialize(habit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a habit
router.delete("/:id", async (req, res) => {
  try {
    await Habit.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
