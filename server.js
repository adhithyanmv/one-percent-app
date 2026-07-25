require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const habitRoutes = require("./routes/habits");
const routineRoutes = require("./routes/routine");
const routineItemRoutes = require("./routes/routineItems");
const urgeRoutes = require("./routes/urges");
const reframeRoutes = require("./routes/reframes");
const silenceRoutes = require("./routes/silence");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/habits", habitRoutes);
app.use("/api/routine", routineRoutes);
app.use("/api/routine-items", routineItemRoutes);
app.use("/api/urges", urgeRoutes);
app.use("/api/reframes", reframeRoutes);
app.use("/api/silence", silenceRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

if (!MONGODB_URI) {
  console.error(
    "Missing MONGODB_URI in .env — copy .env.example to .env and add your MongoDB Atlas connection string.",
  );
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
    app.listen(PORT, () =>
      console.log(`1% running at http://localhost:${PORT}`),
    );
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
