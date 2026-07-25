const mongoose = require("mongoose");

const silenceSessionSchema = new mongoose.Schema({
  targetSeconds: { type: Number, required: true },
  completed: { type: Boolean, default: false },
  actualSeconds: { type: Number, default: 0 },
  date: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SilenceSession", silenceSessionSchema);
