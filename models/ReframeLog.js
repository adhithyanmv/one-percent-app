const mongoose = require("mongoose");

const reframeLogSchema = new mongoose.Schema({
  trigger: { type: String, required: true, trim: true },
  automaticThought: { type: String, required: true, trim: true },
  distortion: { type: String, default: "" },
  reframe: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ReframeLog", reframeLogSchema);
