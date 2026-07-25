const mongoose = require("mongoose");

const urgeLogSchema = new mongoose.Schema({
  trigger: { type: String, default: "" },
  context: { type: [String], default: [] }, // e.g. ['alone', 'bored', 'phone-in-hand', 'stressed']
  intensity: { type: Number, min: 1, max: 10, required: true },
  outcome: {
    type: String,
    enum: ["surfed", "acted", "pending"],
    default: "pending",
  },
  date: { type: String, required: true }, // IST calendar date, YYYY-MM-DD
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UrgeLog", urgeLogSchema);
