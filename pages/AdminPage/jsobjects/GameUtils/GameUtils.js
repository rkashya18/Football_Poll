export default {
  // Monday 5:00 PM IST immediately before the game date.
  // For games on Monday, use the previous Monday (7 days earlier).
  monday5pmBeforeGameIST(gameDate) {
    const d = new Date(gameDate);
    d.setHours(0, 0, 0, 0);

    const day = d.getDay(); // Sun=0, Mon=1, ... Sat=6
    const offsetToMonday = (day === 0) ? 6 : (day - 1);

    // Monday of the SAME week as the game date
    const mondaySameWeek = new Date(d);
    mondaySameWeek.setDate(d.getDate() - offsetToMonday);

    // If the game itself is on Monday, "preceding Monday" should be the previous week
    if (day === 1) {
      mondaySameWeek.setDate(mondaySameWeek.getDate() - 7);
    }

    mondaySameWeek.setHours(17, 0, 0, 0); // 5 PM
    return mondaySameWeek;
  },

  pollOpenAt(gameDate) {
    const raw = RadioGroup_PollDay.selectedOptionValue ?? "";
    const mode = String(raw).trim().toUpperCase();

    if (mode === "NOW" || mode === "OPEN NOW" || mode === "OPEN_POLL_NOW") {
      return new Date();
    }

    if (mode === "MON_5PM" || mode.includes("MONDAY")) {
      return this.monday5pmBeforeGameIST(gameDate);
    }

    // Safe default
    return this.monday5pmBeforeGameIST(gameDate);
  },

  gameId(gameDate) {
    const d = new Date(gameDate);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `G${yyyy}${mm}${dd}`;
  },

  // Sheet row number helper (human sheet row, header assumed on row 1)
  gameRowNumber(gamesData, gameId) {
    const idx = (gamesData || []).findIndex(
      r => String(r.GameID) === String(gameId)
    );
    if (idx < 0) return null;
    return idx + 2;
  }
};
