// All "today" and time-window logic in this app is anchored to India Standard
// Time (Asia/Kolkata, UTC+5:30, no DST) regardless of what timezone the
// server/host (Render, etc.) or MongoDB Atlas cluster is actually running in.
const IST_TZ = "Asia/Kolkata";

function getISTParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const map = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });
  return {
    dateStr: `${map.year}-${map.month}-${map.day}`,
    hour: parseInt(map.hour, 10),
    minute: parseInt(map.minute, 10),
  };
}

function todayISTString(date = new Date()) {
  return getISTParts(date).dateStr;
}

function stepISTDateString(dateStr, deltaDays) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function morningWindowOpen() {
  return getISTParts().hour < 11;
}

function nightWindowOpen() {
  return getISTParts().hour >= 21;
}

module.exports = {
  getISTParts,
  todayISTString,
  stepISTDateString,
  morningWindowOpen,
  nightWindowOpen,
};
