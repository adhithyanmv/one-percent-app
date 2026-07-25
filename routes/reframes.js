const express = require("express");
const router = express.Router();
const ReframeLog = require("../models/ReframeLog");
const { todayISTString } = require("../utils/istTime");

router.post("/", async (req, res) => {
  try {
    const { trigger, automaticThought, distortion, reframe } = req.body;
    if (!trigger || !automaticThought || !reframe) {
      return res
        .status(400)
        .json({ error: "trigger, automaticThought, and reframe are required" });
    }
    const entry = await ReframeLog.create({
      trigger,
      automaticThought,
      distortion: distortion || "",
      reframe,
      date: todayISTString(),
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 200);
    const entries = await ReframeLog.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await ReframeLog.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
