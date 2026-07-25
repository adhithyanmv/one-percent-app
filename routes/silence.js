const express = require("express");
const router = express.Router();
const SilenceSession = require("../models/SilenceSession");
const { todayISTString } = require("../utils/istTime");

const BASE_SECONDS = 120;
const STEP_SECONDS = 60;
const MAX_SECONDS = 1800;

async function computeTargetSeconds() {
  const completedCount = await SilenceSession.countDocuments({
    completed: true,
  });
  const target = BASE_SECONDS + Math.floor(completedCount / 7) * STEP_SECONDS;
  return Math.min(target, MAX_SECONDS);
}

router.get("/target", async (req, res) => {
  try {
    const target = await computeTargetSeconds();
    const completedCount = await SilenceSession.countDocuments({
      completed: true,
    });
    res.json({ targetSeconds: target, completedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { actualSeconds } = req.body;
    const targetSeconds = await computeTargetSeconds();
    const completed = actualSeconds >= targetSeconds;
    const session = await SilenceSession.create({
      targetSeconds,
      actualSeconds: actualSeconds || 0,
      completed,
      date: todayISTString(),
    });
    const newTarget = await computeTargetSeconds();
    res.status(201).json({ session, nextTargetSeconds: newTarget });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 200);
    const sessions = await SilenceSession.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
