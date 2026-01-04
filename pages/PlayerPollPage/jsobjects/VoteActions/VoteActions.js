export default {
  // -------------------------------
  // Helpers (Layer A)
  // -------------------------------
  normalize(v) {
    return String(v ?? "").trim();
  },

  isBlank(v) {
    return this.normalize(v).length === 0;
  },

  // Optional: if you want to restrict choices to a known set,
  // fill this array. If left empty, any non-blank choice is allowed.
  allowedChoices() {
    return []; // e.g. ["TEAM_A", "TEAM_B", "DRAW"]
  },

  isValidChoice(choice) {
    const c = this.normalize(choice);
    if (!c) return false;

    const allowed = this.allowedChoices();
    if (!Array.isArray(allowed) || allowed.length === 0) return true;

    return allowed.map(x => this.normalize(x)).includes(c);
  },

  // -------------------------------
  // Duplicate-safe: choose latest matching row from Votes_Current
  // -------------------------------
  latestVoteRow(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return null;

    // Prefer Sheets plugin rowIndex if present (reliable ordering)
    const withRowIndex = rows.filter(r => r && r.rowIndex != null && this.normalize(r.rowIndex) !== "");
    if (withRowIndex.length > 0) {
      return withRowIndex.reduce((best, r) =>
        Number(r.rowIndex) > Number(best.rowIndex) ? r : best
      );
    }

    // Next preference: VoteOrder numeric
    const withOrder = rows.filter(r => r && r.VoteOrder != null && this.normalize(r.VoteOrder) !== "");
    if (withOrder.length > 0) {
      return withOrder.reduce((best, r) =>
        Number(r.VoteOrder) > Number(best.VoteOrder) ? r : best
      );
    }

    // Fallback: last match
    return rows[rows.length - 1];
  },

  // -------------------------------
  // Existing logic (unchanged, but uses normalize for safety)
  // -------------------------------
  selectedGame() {
    const gid = this.normalize(Dropdown_Game.selectedOptionValue);
    return (GetGames.data || []).find(g => String(g.GameID) === String(gid)) || null;
  },

  parsePollOpenAt(raw) {
    const s = this.normalize(raw);
    if (!s) return null;

    const mStrict = moment(
      s,
      [
        "YYYY-MM-DD HH:mm:ss",
        "YYYY-MM-DD HH:mm",
        "YYYY-MM-DD HH:mm:ss.S",
        "YYYY-MM-DD HH:mm:ss.SSS",
        "DD/MM/YYYY HH:mm:ss",
        "DD/MM/YYYY HH:mm",
        "MM/DD/YYYY HH:mm:ss",
        "MM/DD/YYYY HH:mm",
        "MM/DD/YYYY h:mm:ss A",
        "MM/DD/YYYY h:mm A",
        moment.ISO_8601
      ],
      true
    );

    if (mStrict.isValid()) return mStrict;

    const mLoose = moment(s);
    if (mLoose.isValid()) return mLoose;

    return null;
  },

  canVoteNow() {
    // keep your tick dependency
    appsmith.store.nowTick;

    const g = this.selectedGame();
    if (!g) return false;

    if (String(g.IsClosed).toUpperCase() === "TRUE") return false;

    const openAt = this.parsePollOpenAt(g.PollOpenAt);
    if (!openAt) return false;

    return moment().isSameOrAfter(openAt);
  },

  disableReason() {
    const g = this.selectedGame();
    if (!g) return "Select a game";
    if (this.isBlank(Dropdown_User.selectedOptionValue)) return "Select your name";
    if (String(g.IsClosed).toUpperCase() === "TRUE") return "Poll is closed";

    // Keep your existing message format
    if (moment().isBefore(moment(g.PollOpenAt))) {
      return `Poll opens at ${moment(g.PollOpenAt).format("ddd DD-MMM HH:mm")}`;
    }
    return "";
  },

  // -------------------------------
  // UPDATED: returns latest row (handles duplicates)
  // -------------------------------
  myVote() {
    const gid = this.normalize(Dropdown_Game.selectedOptionValue);
    const uid = this.normalize(Dropdown_User.selectedOptionValue);
    if (!gid || !uid) return null;

    const matches = (GetVotesCurrent.data || []).filter(v =>
      String(v.GameID) === String(gid) && String(v.UserID) === String(uid)
    );

    return this.latestVoteRow(matches);
  },

  // -------------------------------
  // UPDATED: returns rowIndex for that latest row
  // -------------------------------
  myVoteRowIndex() {
    const gid = this.normalize(Dropdown_Game.selectedOptionValue);
    const uid = this.normalize(Dropdown_User.selectedOptionValue);
    if (!gid || !uid) return null;

    const all = (GetVotesCurrent.data || []);
    const matches = all.filter(v =>
      String(v.GameID) === String(gid) && String(v.UserID) === String(uid)
    );

    const latest = this.latestVoteRow(matches);
    if (!latest) return null;

    // Preferred: rowIndex returned by Sheets plugin
    if (latest.rowIndex) return latest.rowIndex;

    // Fallback: approximate position in current dataset (header row = 1)
    const idx = all.findIndex(v => v === latest);
    return idx < 0 ? null : idx + 2;
  },

  // -------------------------------
  // USER SELECTION COOLDOWN (30s)
  // Prevent changing name quickly (proxy voting)
  // -------------------------------
  userLockKey() {
    return "userSelectLockUntil";
  },

  isUserLocked() {
    const until = Number(appsmith.store[this.userLockKey()] || 0);
    return Date.now() < until;
  },

  lockUserFor30s() {
    storeValue(this.userLockKey(), Date.now() + 30 * 1000);
  },

  // -------------------------------
  // Vote casting (Layer A)
  // -------------------------------
  async castVote(newChoice) {
    const gid = this.normalize(Dropdown_Game.selectedOptionValue);
    const uid = this.normalize(Dropdown_User.selectedOptionValue);
    const choice = this.normalize(newChoice);

    // Hard block: required fields
    if (!gid || !uid) {
      showAlert("Select game and your name first.", "warning");
      return;
    }

    // Hard block: choice must be non-blank (prevents blank rows)
    if (!choice) {
      showAlert("Invalid choice. Please vote again.", "warning");
      return;
    }

    // Optional allowlist check (defaults to allowing any non-blank)
    if (!this.isValidChoice(choice)) {
      showAlert("Invalid choice. Please vote again.", "warning");
      return;
    }

    // Respect poll timing/closed checks
    if (!this.canVoteNow()) {
      showAlert(this.disableReason(), "warning");
      return;
    }

    const existing = this.myVote();

    // Store a trimmed pending choice (used by queries)
    await storeValue("pendingChoice", choice);

    // Extra safety: ensure pendingChoice is valid before writing
    if (!this.isValidChoice(appsmith.store.pendingChoice)) {
      showAlert("Vote not captured correctly. Please try again.", "error");
      return;
    }

    // First-time vote -> insert
    if (!existing) {
      await InsertVoteCurrent.run();
      await GetVotesCurrent.run();
      this.lockUserFor30s(); // lock name AFTER successful vote
      showAlert(`Voted: ${choice}`, "success");
      return;
    }

    // Same choice -> do nothing
    // NOTE: existing is now the *latest* row, so this won't false-trigger due to duplicates
    if (this.normalize(existing.Choice) === choice) {
      showAlert(`Already: ${choice}`, "info");
      return;
    }

    // Change -> update + history
    const rowIndex = this.myVoteRowIndex();
    if (rowIndex === null) {
      showAlert("Could not locate your vote row to update.", "error");
      return;
    }

    await storeValue("voteRowIndex", rowIndex);
    await storeValue("oldChoice", this.normalize(existing.Choice));

    // Extra safety (again) before update/history
    if (!this.isValidChoice(appsmith.store.pendingChoice)) {
      showAlert("Vote not captured correctly. Please try again.", "error");
      return;
    }

    await UpdateVoteCurrent.run();
    await InsertVoteHistory.run();

    await GetVotesCurrent.run();
    this.lockUserFor30s(); // lock name AFTER successful vote change
    showAlert(`Changed to: ${choice}`, "success");
  }
};
