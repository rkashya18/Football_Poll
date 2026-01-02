export default {
  // Convert VoteTime into milliseconds for stable sorting
  // Supports:
  // - Unix seconds (10 digits)
  // - Unix milliseconds (13 digits)
  // - "YYYY-MM-DD HH:mm:ss"
  // - ISO strings
  toVoteTimeMs(vt) {
    if (vt === null || vt === undefined || vt === "") return NaN;

    const s = String(vt).trim();

    // numeric timestamp
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      return s.length >= 13 ? n : n * 1000;
    }

    // datetime string
    const m = moment(s, ["YYYY-MM-DD HH:mm:ss", moment.ISO_8601], true);
    return m.isValid() ? m.valueOf() : NaN;
  },

  buildFullList(gameIdOverride) {
    const votes = GetVotesCurrent.data || [];
    const users = GetUsers.data || [];

    const gameId =
      gameIdOverride ||
      Dropdown_Game?.selectedOptionValue ||
      "";

    if (!gameId) return [];

    // Map UserID -> Name
    const nameById = {};
    users.forEach(u => {
      nameById[String(u.UserID)] = u.Name;
    });

    return votes
      .filter(v => String(v.GameID) === String(gameId))
      // ✅ FIX: case-insensitive IN/PAID
      .filter(v => {
        const c = String(v.Choice || "").trim().toUpperCase();
        return ["IN", "PAID"].includes(c);
      })
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
          name: nameById[String(v.UserID)] || "", // keep name if available
          userId: String(v.UserID),
          paidFlag: choice === "PAID" ? "PAID" : "IN"
        };
      });
  },

  // Generates and downloads the TXT
  async downloadTxt() {
    const gameId =
      Dropdown_Game?.selectedOptionValue ||
      "";

    if (!gameId) {
      showAlert("Select a game first", "warning");
      return;
    }

    // ✅ Ensure we publish latest votes
    await GetVotesCurrent.run();

    const rows = this.buildFullList(gameId);

    if (!rows.length) {
      showAlert("No IN/PAID votes found for this game", "warning");
      return;
    }

    const publishedAt = moment().format("YYYY-MM-DD HH:mm:ss");

    const lines = [];
    lines.push(`GameID: ${gameId}`);
    lines.push(`PublishedAt: ${publishedAt}`);
    lines.push("");
    lines.push("FULL LIST (PLAYING + WAITLIST)");
    lines.push("------------------------------");

    rows.forEach(r => {
      // Keeps your old format:
      // 01 [PLAYING] Name (UserID) - PAID/IN
      const who = r.name ? `${r.name} (${r.userId})` : r.userId;
      lines.push(`${String(r.rank).padStart(2, "0")} [${r.slot}] ${who} - ${r.paidFlag}`);
    });

    const text = lines.join("\n");
    const filename = `${gameId}_full_list_${publishedAt.replace(/[: ]/g, "-")}.txt`;

    download(text, filename, "text/plain");
    showAlert("TXT downloaded", "success");
  }
};
