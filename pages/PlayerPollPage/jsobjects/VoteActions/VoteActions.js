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

    if (appsmith.store.pollIsOpen !== true) {
      if (g.PollOpenAt) {
        const m = moment(
          g.PollOpenAt,
          ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", moment.ISO_8601],
          true
        );
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

  getChoiceFromRow(row) {
    if (!row) return "";

    const raw =
      row.Choice ??
      row.choice ??
      row.Status ??
      row.status ??
      row.Vote ??
      row.vote ??
      row.Option ??
      row.option ??
      row.NewChoice ??
      row.newChoice ??
      "";

    return this.normalizeChoice(raw);
  },

  myVoteRowIndex() {
    const row = this.myVoteRow();
    if (!row) return null;

    const n = parseInt(String(row.rowIndex ?? "").trim(), 10);
    return Number.isFinite(n) ? n : null;
  },

  // ✅ NEW: PAID allowed only if user is currently IN
  canSelectPaid() {
    // If poll isn't open / other reasons, no
    const baseReason = this.disableReason();
    if (baseReason) return false;

    // Prefer store highlight if available, else derive from current vote row
    const current = this.normalizeChoice(appsmith.store.myCurrentChoice || "");
    const effective = current || this.getChoiceFromRow(this.myVoteRow());

    return effective === "IN";
  },

  async submit(choiceRaw) {
    // ✅ MIN CHANGE: stop background refresh while we submit
    try { await AutoRefreshVotes.stop(); } catch (e) {}
    await storeValue("isSubmittingVote", true);

    try {
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

      // ✅ gate PAID selection until user is IN
      if (choice === "PAID" && !this.canSelectPaid()) {
        showAlert("Please choose IN first. Then you can mark PAID.", "warning");
        return;
      }

      const existing = this.myVoteRow();
      const oldChoice = this.getChoiceFromRow(existing);

      await storeValue("oldChoice", oldChoice);
      await storeValue("pendingChoice", choice);

      // If no change, nothing to do (finally will restart polling)
      if (oldChoice && oldChoice === choice) return;

      if (!existing) {
        await InsertVoteCurrent.run();

        try {
          await InsertVoteHistory.run();
        } catch (e) {
          showAlert(`InsertVoteHistory failed: ${e?.message || e}`, "error");
        }

        await storeValue("myCurrentChoice", choice);

        // ✅ MIN CHANGE: small delay avoids stale read right after write
        await new Promise(r => setTimeout(r, 600));
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

      try {
        await InsertVoteHistory.run();
      } catch (e) {
        showAlert(`InsertVoteHistory failed: ${e?.message || e}`, "error");
      }

      await storeValue("myCurrentChoice", choice);

      // ✅ MIN CHANGE: small delay avoids stale read right after write
      await new Promise(r => setTimeout(r, 600));
      await VotesFetch.refresh();

      showAlert(`Updated to: ${choice}`, "success");
    } finally {
      // ✅ MIN CHANGE: always restart polling and clear flag
      await storeValue("isSubmittingVote", false);
      try { await AutoRefreshVotes.start(); } catch (e) {}
    }
  }
};
