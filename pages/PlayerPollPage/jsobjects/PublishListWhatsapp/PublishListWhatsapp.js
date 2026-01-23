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
    const rows = this.buildRows(gameId);

    if (!rows.length) {
      showAlert("No votes found", "warning");
      return;
    }

    const publishedAt = moment().format("DD-MMM HH:mm");
    
    const lines = [];
    // Plain text header
    lines.push(`*Football Poll List*`);
    lines.push(`Game: ${gameId}`);
    lines.push(`Time: ${publishedAt}`);
    lines.push(""); 

    rows.forEach(r => {
      const rankStr = String(r.rank).padStart(2, "0");
      const slotDisplay = r.slot === "PLAYING" ? "" : ` [${r.slot}]`;
      
      // Plain text row: "01. *Shashi* - IN"
      lines.push(`${rankStr}. *${r.userId}*${slotDisplay} - ${r.paidFlag}`);
    });

    lines.push("");
    lines.push("_Generated via Football App_");

    const finalMsg = lines.join("\n");
    const encodedMsg = encodeURIComponent(finalMsg);

    navigateTo(`https://wa.me/?text=${encodedMsg}`, {}, 'NEW_WINDOW');
  }
};