export default {
  normalizeChoice(c) {
    return String(c ?? "").trim().toUpperCase();
  },

  selectedGame() {
    const gid = Dropdown_Game.selectedOptionValue;
    if (!gid) return null;
    return (GetGames.data || []).find(g => String(g.GameID) === String(gid)) || null;
  },

  disableReason() {
    const g = this.selectedGame();
    if (!g) return "Select a game";
    if (!appsmith.store.loggedInUserId) return "Login required";

    if (String(g.IsClosed).toUpperCase() === "TRUE") return "Poll is closed";

    // ✅ Reactive gate (updated every 1s by Countdown.tick())
    if (appsmith.store.pollIsOpen !== true) {
      // Optional: show the open time in the message
      if (g.PollOpenAt) {
        const m = moment(g.PollOpenAt, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", moment.ISO_8601], true);
        if (m.isValid()) return `Poll opens at ${m.format("ddd DD-MMM HH:mm")}`;
      }
      return "Poll not open yet";
    }

    return "";
  },

  myVoteRow() {
    const gid = String(Dropdown_Game.selectedOptionValue ?? "").trim();
    const uid = String(appsmith.store.loggedInUserId ?? "").trim();
    if (!gid || !uid) return null;

    return (GetVotesCurrent.data || []).find(v =>
      String(v.GameID) === gid && String(v.UserID) === uid
    ) || null;
  },

  myVoteRowIndex() {
    const row = this.myVoteRow();
    if (!row) return null;

    const n = parseInt(String(row.rowIndex ?? "").trim(), 10);
    return Number.isFinite(n) ? n : null;
  },

  async submit(choiceRaw) {
    const reason = this.disableReason();
    if (reason) {
      showAlert(reason, "warning");
      return;
    }

    const choice = this.normalizeChoice(choiceRaw);
    if (!["IN", "PAID", "DROPPING"].includes(choice)) {
      showAlert("Invalid choice", "error");
      return;
    }

    await storeValue("pendingChoice", choice);

    const existing = this.myVoteRow();

    if (!existing) {
      await InsertVoteCurrent.run();
      // instant highlight
      await storeValue("myCurrentChoice", choice);

      await VotesFetch.refresh();
      showAlert(`Voted: ${choice}`, "success");
      return;
    }

    const rowIndex = this.myVoteRowIndex();
    if (rowIndex === null) {
      showAlert("Could not locate your vote row to update.", "error");
      return;
    }

    await storeValue("voteRowIndex", rowIndex);
    await UpdateVoteCurrent.run();
    // instant highlight
    await storeValue("myCurrentChoice", choice);

    await VotesFetch.refresh();
    showAlert(`Updated to: ${choice}`, "success");
  }
};
