export default {
  selectedGame() {
    const gid = Dropdown_Game.selectedOptionValue;
    return (GetGames.data || []).find(g => String(g.GameID) === String(gid)) || null;
  },

  parsePollOpenAt(raw) {
    const s = String(raw || "").trim();
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
    if (!Dropdown_User.selectedOptionValue) return "Select your name";
    if (String(g.IsClosed).toUpperCase() === "TRUE") return "Poll is closed";
    if (moment().isBefore(moment(g.PollOpenAt))) {
      return `Poll opens at ${moment(g.PollOpenAt).format("ddd DD-MMM HH:mm")}`;
    }
    return "";
  },

  myVote() {
    const gid = Dropdown_Game.selectedOptionValue;
    const uid = Dropdown_User.selectedOptionValue;
    if (!gid || !uid) return null;

    return (GetVotesCurrent.data || []).find(v =>
      String(v.GameID) === String(gid) && String(v.UserID) === String(uid)
    ) || null;
  },

  myVoteRowIndex() {
		
  const gid = Dropdown_Game.selectedOptionValue;
  const uid = Dropdown_User.selectedOptionValue;
  if (!gid || !uid) return null;

  const row = (GetVotesCurrent.data || []).find(
    v => String(v.GameID) === String(gid) && String(v.UserID) === String(uid)
  );
  if (!row) return null;

  // Preferred: use rowIndex returned by Appsmith Sheets plugin
  if (row.rowIndex) return row.rowIndex;

  // Fallback: if rowIndex isn't present, approximate assuming header row = 1
  const idx = (GetVotesCurrent.data || []).findIndex(
    v => String(v.GameID) === String(gid) && String(v.UserID) === String(uid)
  );
  return idx < 0 ? null : idx + 2;
},


  // -------------------------------
  // USER SELECTION COOLDOWN (30s)
  // Prevent changing name quickly (proxy voting)
  // -------------------------------
  userLockKey() {
    // Global lock for the device/session (simplest)
    return "userSelectLockUntil";
  },

  isUserLocked() {
    const until = Number(appsmith.store[this.userLockKey()] || 0);
    return Date.now() < until;
  },

  lockUserFor30s() {
    storeValue(this.userLockKey(), Date.now() + 30 * 1000);
  },

  async castVote(newChoice) {
    if (!Dropdown_Game.selectedOptionValue || !Dropdown_User.selectedOptionValue) {
      showAlert("Select game and your name first.", "warning");
      return;
    }

    if (!this.canVoteNow()) {
      showAlert(this.disableReason(), "warning");
      return;
    }

    const existing = this.myVote();

    // store pending choice for the queries
    await storeValue("pendingChoice", newChoice);

    // First-time vote -> insert
    if (!existing) {
      await InsertVoteCurrent.run();
      await GetVotesCurrent.run();
			this.lockUserFor30s(); // ✅ lock name AFTER successful vote
      showAlert(`Voted: ${newChoice}`, "success");
      return;
    }

    // Same choice -> do nothing
    if (String(existing.Choice) === String(newChoice)) {
      showAlert(`Already: ${newChoice}`, "info");
      return;
    }

    // Change -> update + history
    const rowIndex = this.myVoteRowIndex();
    if (rowIndex === null) {
      showAlert("Could not locate your vote row to update.", "error");
      return;
    }

    await storeValue("voteRowIndex", rowIndex);
    await storeValue("oldChoice", existing.Choice);

    await UpdateVoteCurrent.run();
    await InsertVoteHistory.run();

    await GetVotesCurrent.run();
		this.lockUserFor30s(); // ✅ lock name AFTER successful vote change
    showAlert(`Changed to: ${newChoice}`, "success");
  }
};
