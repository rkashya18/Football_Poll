export default {
  // 1. Helper: Time Sorting
  toVoteTimeMs(vt) {
    if (!vt) return NaN;
    const s = String(vt).trim();
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      return s.length >= 13 ? n : n * 1000;
    }
    const m = moment(s, ["YYYY-MM-DD HH:mm:ss", moment.ISO_8601], true);
    return m.isValid() ? m.valueOf() : NaN;
  },

  // 2. Helper: Build List
  buildRows(gameId) {
    const votes = GetVotesCurrent.data || [];
    return votes
      .filter(v => String(v.GameID) === String(gameId))
      .filter(v => ["IN", "PAID"].includes(String(v.Choice || "").trim().toUpperCase()))
      .sort((a, b) => {
        const ta = this.toVoteTimeMs(a.VoteTime);
        const tb = this.toVoteTimeMs(b.VoteTime);
        if (ta !== tb) return ta - tb;
        return Number(a.VoteOrder || 0) - Number(b.VoteOrder || 0);
      })
      .map((v, idx) => {
        const rank = idx + 1;
        const slot = rank <= 12 ? "PLAYING" : `WL-${rank - 12}`;
        const choice = String(v.Choice || "").trim().toUpperCase();
        return {
          rank,
          slot,
          userId: String(v.UserID || "Unknown"), 
          paidFlag: choice === "PAID" ? "PAID" : "IN"
        };
      });
  },

  // 3. Action: Share to WhatsApp
  async share() {
    const gameId = Dropdown_Game?.selectedOptionValue || "";
    if (!gameId) {
      showAlert("Select a game first", "warning");
      return;
    }

    await GetVotesCurrent.run();
    
    // Find Game Details
    const game = (GetGames.data || []).find(g => String(g.GameID) === String(gameId)) || {};
    
    // Date
    const rawDate = game.Date || game.GameDate || "";
    let gameDateStr = "";
    if (rawDate) {
        const mDate = moment(rawDate);
        gameDateStr = mDate.isValid() ? mDate.format("ddd, DD-MMM") : rawDate;
    }

    // Venue
    const venue = game.Venue || game.Location || "TBD";

    // Time
    let gameTime = game.Time || game.GameTime || game.StartTime || "";
    const mTime = moment(gameTime, ["HH:mm:ss", "HH:mm"], true);
    if (mTime.isValid()) {
        gameTime = mTime.format("h:mm a");
    }

    const rows = this.buildRows(gameId);
    if (!rows.length) {
      showAlert("No votes found", "warning");
      return;
    }

    const publishedAt = moment().format("DD-MMM h:mm a");
    
    const lines = [];
    lines.push(`*Football Poll List*`);
    lines.push(`Game: ${gameId}`);
    
    if (gameDateStr) lines.push(`Date: ${gameDateStr}`);
    if (gameTime)    lines.push(`Time: ${gameTime}`);
    if (venue)       lines.push(`Venue: ${venue}`);
    
    lines.push(`List published at: ${publishedAt}`);
    lines.push(""); 

    rows.forEach(r => {
      const rankStr = String(r.rank).padStart(2, "0");
      const slotDisplay = r.slot === "PLAYING" ? "" : ` [${r.slot}]`;
      
      // ✅ CHANGED: Only show text if PAID. If IN, show nothing.
      const statusSuffix = r.paidFlag === "PAID" ? " - PAID" : "";

      // Output: "01. *Shashi*" OR "02. *Ajay* - PAID"
      lines.push(`${rankStr}. *${r.userId}*${slotDisplay}${statusSuffix}`);
    });

    lines.push("");
    lines.push("_Generated via Football App_");

    const finalMsg = lines.join("\n");
    const encodedMsg = encodeURIComponent(finalMsg);

    navigateTo(`https://wa.me/?text=${encodedMsg}`, {}, 'NEW_WINDOW');
  }
};