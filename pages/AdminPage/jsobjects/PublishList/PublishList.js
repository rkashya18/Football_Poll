export default {
  // Builds ranked list from GetCurrentVotes + GetUsers
buildFullList() {
  const votes = GetVotesCurrent.data || [];
  const users = GetUsers.data || [];

  const gameId =
    Dropdown_Game?.selectedOptionValue ||
    Dropdown_Game?.selectedOptionValue ||
    "";

  if (!gameId) return [];

  // Map UserID -> Name
  const nameById = {};
  users.forEach(u => { nameById[u.UserID] = u.Name; });

  return votes
    // ✅ ONLY this game's votes
    .filter(v => v.GameID === gameId)
    // Eligible = In or Paid
    .filter(v => v.Choice === "In" || v.Choice === "Paid")
    .sort((a, b) => {
      const t = Number(a.VoteTime) - Number(b.VoteTime);
      if (t !== 0) return t;
      return Number(a.VoteOrder) - Number(b.VoteOrder);
    })
    .map((v, idx) => {
      const rank = idx + 1;
      const slot = rank <= 12 ? "PLAYING" : `WL-${rank - 12}`;
      const name = nameById[v.UserID] || "";
      const paidFlag = v.Choice === "Paid" ? "PAID" : "IN";

      return { rank, slot, name, userId: v.UserID, paidFlag };
    });
  },

  // Generates and downloads the TXT
  downloadTxt() {
    const gameId =
      Dropdown_Game?.selectedOptionValue ||
      Dropdown_Game?.selectedOptionValue ||
      "";

    if (!gameId) {
      showAlert("Select a game first", "warning");
      return;
    }

    const rows = this.buildFullList(); // ✅ FIXED

    if (!rows.length) {
      showAlert("No In/Paid votes found for this game", "warning");
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
      lines.push(
        `${String(r.rank).padStart(2, "0")} [${r.slot}] ${r.name} (${r.userId}) - ${r.paidFlag}`
      );
    });

    const text = lines.join("\n");
    const filename = `${gameId}_full_list_${publishedAt.replace(/[: ]/g, "-")}.txt`;

    download(text, filename, "text/plain");
    showAlert("TXT downloaded", "success");
  }
};
