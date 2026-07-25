const mongoose = require('mongoose');

const routineItemSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  period: { type: String, enum: ['day', 'night'], required: true }, // 'day' = daily checklist, 'night' = manifestations
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RoutineItem', routineItemSchema);
