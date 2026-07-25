const express = require('express');
const router = express.Router();
const RoutineItem = require('../models/RoutineItem');

// GET items, optionally filtered by period ('day' | 'night')
router.get('/', async (req, res) => {
  try {
    const { period } = req.query;
    const filter = period ? { period } : {};
    const items = await RoutineItem.find(filter).sort({ order: 1, createdAt: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE an item
router.post('/', async (req, res) => {
  try {
    const { text, period } = req.body;
    if (!text || !['day', 'night'].includes(period)) {
      return res.status(400).json({ error: 'text and period ("day" or "night") are required' });
    }
    const count = await RoutineItem.countDocuments({ period });
    const item = await RoutineItem.create({ text, period, order: count });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an item
router.delete('/:id', async (req, res) => {
  try {
    await RoutineItem.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
