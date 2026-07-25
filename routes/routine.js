const express = require("express");
const router = express.Router();
const RoutineLog = require("../models/RoutineLog");
const {
  todayISTString,
  stepISTDateString,
  getISTParts,
  morningWindowOpen,
  nightWindowOpen,
} = require("../utils/istTime");

function todayStr() {
  return todayISTString();
}

async function getOrCreateToday() {
  const date = todayStr();
  let log = await RoutineLog.findOne({ date });
  if (!log) log = await RoutineLog.create({ date });
  return log;
}

router.get("/today", async (req, res) => {
  try {
    const log = await getOrCreateToday();
    const parts = getISTParts();
    res.json({
      ...log.toObject(),
      window: {
        hour: parts.hour,
        minute: parts.minute,
        morningAllowed: morningWindowOpen(),
        nightAllowed: nightWindowOpen(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/morning/complete", async (req, res) => {
  try {
    const log = await getOrCreateToday();
    if (!log.morningCompleted && !morningWindowOpen()) {
      return res.status(403).json({
        error:
          "Morning ritual is only available until 11:00 AM IST. Come back tomorrow morning.",
      });
    }
    log.morningCompleted = true;
    await log.save();
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/day/toggle", async (req, res) => {
  try {
    const { itemId } = req.body;
    const log = await getOrCreateToday();
    const idx = log.dayItemsDone.indexOf(itemId);
    if (idx >= 0) log.dayItemsDone.splice(idx, 1);
    else log.dayItemsDone.push(itemId);
    await log.save();
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/day/complete", async (req, res) => {
  try {
    const log = await getOrCreateToday();
    log.dayCompleted = true;
    await log.save();
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/night/toggle", async (req, res) => {
  try {
    const { itemId } = req.body;
    const log = await getOrCreateToday();
    const idx = log.nightItemsDone.indexOf(itemId);
    if (idx >= 0) log.nightItemsDone.splice(idx, 1);
    else log.nightItemsDone.push(itemId);
    await log.save();
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/night", async (req, res) => {
  try {
    const { wins, tempted, notes } = req.body;
    const log = await getOrCreateToday();
    const alreadyDone = !!(log.nightCheckIn && log.nightCheckIn.completed);
    if (!alreadyDone && !nightWindowOpen()) {
      return res
        .status(403)
        .json({ error: "Night routine opens at 9:00 PM IST." });
    }
    log.nightCheckIn = {
      completed: true,
      wins: wins || "",
      tempted: !!tempted,
      notes: notes || "",
    };
    await log.save();
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/daily-check", async (req, res) => {
  try {
    const { sleepHours, exercised, hydrated } = req.body;
    const log = await getOrCreateToday();
    log.dailyCheck = {
      sleepHours:
        sleepHours === undefined || sleepHours === null || sleepHours === ""
          ? null
          : Number(sleepHours),
      exercised: !!exercised,
      hydrated: !!hydrated,
      submitted: true,
    };
    await log.save();
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/streak", async (req, res) => {
  try {
    const logs = await RoutineLog.find({ morningCompleted: true }).select(
      "date -_id",
    );
    const doneSet = new Set(logs.map((l) => l.date));
    let streak = 0;
    let d = todayStr();
    if (!doneSet.has(d)) d = stepISTDateString(d, -1);
    while (doneSet.has(d)) {
      streak += 1;
      d = stepISTDateString(d, -1);
    }
    res.json({ streak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const logs = await RoutineLog.find();
    const map = new Map(logs.map((l) => [l.date, l]));

    function totalWhere(pred) {
      return logs.filter(pred).length;
    }

    function currentStreak(pred) {
      let streak = 0;
      let d = todayStr();
      if (!pred(map.get(d))) d = stepISTDateString(d, -1);
      while (pred(map.get(d))) {
        streak += 1;
        d = stepISTDateString(d, -1);
      }
      return streak;
    }

    const morningPred = (l) => !!(l && l.morningCompleted);
    const dayPred = (l) => !!(l && l.dayCompleted);
    const nightPred = (l) =>
      !!(l && l.nightCheckIn && l.nightCheckIn.completed);

    res.json({
      morningTotal: totalWhere(morningPred),
      dayTotal: totalWhere(dayPred),
      nightTotal: totalWhere(nightPred),
      morningStreak: currentStreak(morningPred),
      dayStreak: currentStreak(dayPred),
      nightStreak: currentStreak(nightPred),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const UrgeLog = require("../models/UrgeLog");
const ReframeLog = require("../models/ReframeLog");
const SilenceSession = require("../models/SilenceSession");

router.get("/insights", async (req, res) => {
  try {
    const since = stepISTDateString(todayStr(), -29);

    const [urges, reframes, silenceSessions, logs] = await Promise.all([
      UrgeLog.find({ date: { $gte: since } }),
      ReframeLog.countDocuments({ date: { $gte: since } }),
      SilenceSession.find({ date: { $gte: since } }),
      RoutineLog.find({ date: { $gte: since } }),
    ]);

    const sleepByDate = {};
    logs.forEach((l) => {
      if (l.dailyCheck && l.dailyCheck.sleepHours != null)
        sleepByDate[l.date] = l.dailyCheck.sleepHours;
    });

    const withSleep = urges.filter((u) => sleepByDate[u.date] != null);
    const wellRested = withSleep.filter((u) => sleepByDate[u.date] >= 7);
    const underslept = withSleep.filter((u) => sleepByDate[u.date] < 7);

    function avgIntensity(arr) {
      if (!arr.length) return null;
      return (
        Math.round(
          (arr.reduce((sum, u) => sum + u.intensity, 0) / arr.length) * 10,
        ) / 10
      );
    }

    const exercisedDates = new Set(
      logs
        .filter((l) => l.dailyCheck && l.dailyCheck.exercised)
        .map((l) => l.date),
    );
    const onExerciseDays = urges.filter((u) => exercisedDates.has(u.date));
    const onNonExerciseDays = urges.filter((u) => !exercisedDates.has(u.date));

    const silenceMinutesTotal = Math.round(
      silenceSessions.reduce((sum, s) => sum + s.actualSeconds, 0) / 60,
    );

    res.json({
      urgeTotal: urges.length,
      urgeSurfRate: urges.length
        ? Math.round(
            (urges.filter((u) => u.outcome === "surfed").length /
              urges.length) *
              100,
          )
        : null,
      avgIntensityWellRested: avgIntensity(wellRested),
      avgIntensityUnderslept: avgIntensity(underslept),
      avgIntensityExerciseDays: avgIntensity(onExerciseDays),
      avgIntensityNonExerciseDays: avgIntensity(onNonExerciseDays),
      reframeCount: reframes,
      silenceSessionsCompleted: silenceSessions.filter((s) => s.completed)
        .length,
      silenceMinutesTotal,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
