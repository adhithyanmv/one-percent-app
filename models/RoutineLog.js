const mongoose = require("mongoose");

const routineLogSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  morningCompleted: { type: Boolean, default: false },
  dayItemsDone: { type: [String], default: [] }, // RoutineItem ids checked off today
  dayCompleted: { type: Boolean, default: false },
  nightItemsDone: { type: [String], default: [] }, // manifestation ids affirmed tonight
  nightCheckIn: {
    completed: { type: Boolean, default: false },
    wins: { type: String, default: "" },
    tempted: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  dailyCheck: {
    sleepHours: { type: Number, default: null },
    exercised: { type: Boolean, default: false },
    hydrated: { type: Boolean, default: false },
    submitted: { type: Boolean, default: false },
  },
});

module.exports = mongoose.model("RoutineLog", routineLogSchema);
