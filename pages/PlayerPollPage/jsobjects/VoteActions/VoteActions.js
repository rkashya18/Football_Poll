export default {
  // Helper to normalize text
  normalizeChoice(c) {
    return String(c ?? "").trim().toUpperCase();
  },

  // Helper to find the selected game
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

    // UI check (loose check), real check happens in submit
    if (appsmith.store.pollIsOpen !== true) {
      if (g.PollOpenAt) {
        const m = moment(g.PollOpenAt);
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
    return (GetVotesCurrent.data || []).find(v => String(v.GameID) === gid && String(v.UserID) === uid) || null;
  },

  getChoiceFromRow(row) {
    if (!row) return "";
    const raw = row.Choice ?? row.Vote ?? row.Option ?? "";
    return this.normalizeChoice(raw);
  },

  myVoteRowIndex() {
    const row = this.myVoteRow();
    if (!row) return null;
    const n = parseInt(String(row.rowIndex ?? "").trim(), 10);
    return Number.isFinite(n) ? n : null;
  },

  canSelectPaid() {
    const baseReason = this.disableReason();
    if (baseReason) return false;
    const current = this.normalizeChoice(appsmith.store.myCurrentChoice || "");
    const effective = current || this.getChoiceFromRow(this.myVoteRow());
    return effective === "IN";
  },

  async submit(choiceRaw) {
    try { await AutoRefreshVotes.stop(); } catch (e) {}
    await storeValue("isSubmittingVote", true);

    try {
      const reason = this.disableReason();
      if (reason) { showAlert(reason, "warning"); return; }

      const choice = this.normalizeChoice(choiceRaw);
      if (!["IN", "PAID", "DROPPING"].includes(choice)) { showAlert("Invalid choice", "error"); return; }

      if (choice === "PAID" && !this.canSelectPaid()) {
        showAlert("Please choose IN first.", "warning"); return;
      }

      // --- SECURITY FIX: RAW SERVER TIME ---
      
      // 1. Fetch time
      await GetServerTime.run();
      
      if (!GetServerTime.data || !GetServerTime.data.datetime) {
        showAlert("Connection Error: Could not verify time.", "error");
        return;
      }

      // 2. Extract Raw String (Bypassing Moment.js formatting)
      // API returns ISO like: "2026-01-22T15:30:00.123456+05:30"
      // We take the first 19 chars: "2026-01-22T15:30:00"
      // And replace 'T' with ' ' -> "2026-01-22 15:30:00"
      const rawIso = GetServerTime.data.datetime;
      const cleanServerTime = rawIso.substring(0, 19).replace("T", " ");
      
      // 3. Strict Check: Is Poll Open?
      const game = this.selectedGame();
      // We parse strictly for comparison only
      const serverMoment = moment(rawIso); 
      
      if (game && game.PollOpenAt) {
         const openAt = moment(game.PollOpenAt);
         if (openAt.isValid() && serverMoment.isBefore(openAt)) {
             showAlert("Poll is not open yet (Server Verified).", "error");
             await storeValue("pollIsOpen", false);
             return;
         }
      }

      // 4. Store the RAW string. 
      // This string comes 100% from the server URL, your phone cannot touch it.
      await storeValue("verifiedVoteTime", cleanServerTime);
      await storeValue("verifiedVoteTimestamp", serverMoment.valueOf()); 
      
      // --- END SECURITY FIX ---

      const existing = this.myVoteRow();
      const oldChoice = this.getChoiceFromRow(existing);

      await storeValue("oldChoice", oldChoice);
      await storeValue("pendingChoice", choice);

      if (oldChoice && oldChoice === choice) return;

      if (!existing) {
        await InsertVoteCurrent.run(); 
        try { await InsertVoteHistory.run(); } catch (e) {}
        
        await storeValue("myCurrentChoice", choice);
        await new Promise(r => setTimeout(r, 600));
        await VotesFetch.refresh();
        showAlert(`Voted: ${choice}`, "success");
        return;
      }

      const rowIndex = this.myVoteRowIndex();
      if (rowIndex === null) { showAlert("Error finding row.", "error"); return; }

      await storeValue("voteRowIndex", rowIndex);
      await UpdateVoteCurrent.run(); 
      try { await InsertVoteHistory.run(); } catch (e) {}

      await storeValue("myCurrentChoice", choice);
      await new Promise(r => setTimeout(r, 600));
      await VotesFetch.refresh();
      showAlert(`Updated to: ${choice}`, "success");

    } catch (error) {
       console.error(error);
       showAlert("Error: " + error.message, "error");
    } finally {
      await storeValue("isSubmittingVote", false);
      try { await AutoRefreshVotes.start(); } catch (e) {}
    }
  }
};