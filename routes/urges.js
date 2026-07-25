const express = require("express");
const router = express.Router();
const UrgeLog = require("../models/UrgeLog");
const { todayISTString, stepISTDateString } = require("../utils/istTime");

router.post("/", async (req, res) => {
  try {
    const { trigger, context, intensity } = req.body;
    if (!intensity || intensity < 1 || intensity > 10) {
      return res.status(400).json({ error: "intensity (1-10) is required" });
    }
    const entry = await UrgeLog.create({
      trigger: trigger || "",
      context: Array.isArray(context) ? context : [],
      intensity,
      outcome: "pending",
      date: todayISTString(),
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/outcome", async (req, res) => {
  try {
    const { outcome } = req.body;
    if (!["surfed", "acted"].includes(outcome)) {
      return res
        .status(400)
        .json({ error: 'outcome must be "surfed" or "acted"' });
    }
    const entry = await UrgeLog.findByIdAndUpdate(
      req.params.id,
      { outcome },
      { new: true },
    );
    if (!entry) return res.status(404).json({ error: "Urge log not found" });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 200);
    const entries = await UrgeLog.find().sort({ createdAt: -1 }).limit(limit);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const since = stepISTDateString(todayISTString(), -29);
    const entries = await UrgeLog.find({ date: { $gte: since } });

    const total = entries.length;
    const surfed = entries.filter((e) => e.outcome === "surfed").length;
    const acted = entries.filter((e) => e.outcome === "acted").length;
    const surfRate = total ? Math.round((surfed / total) * 100) : null;

    const byDate = {};
    entries.forEach((e) => {
      byDate[e.date] = (byDate[e.date] || 0) + 1;
    });

    const triggerCounts = {};
    entries.forEach((e) => {
      const key = (e.trigger || "unspecified").toLowerCase().trim();
      triggerCounts[key] = (triggerCounts[key] || 0) + 1;
    });
    const topTriggers = Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([trigger, count]) => ({ trigger, count }));

    const hourCounts = new Array(24).fill(0);
    entries.forEach((e) => {
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        hour12: false,
      });
      const hour = parseInt(fmt.format(new Date(e.createdAt)), 10);
      hourCounts[hour] += 1;
    });

    res.json({
      total,
      surfed,
      acted,
      surfRate,
      byDate,
      topTriggers,
      hourCounts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
