export default {
  /* -----------------------------
     Helpers
  ----------------------------- */

  normalizeChoice(c) {
    return String(c ?? "").trim().toUpperCase();
  },

  // Convert VoteTime from Sheets into epoch milliseconds
  toVoteTimeMs(vt) {
    if (vt === null || vt === undefined || vt === "") return NaN;

    const s = String(vt).trim();

    // Epoch numbers (seconds or ms)
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      return s.length >= 13 ? n : n * 1000;
    }

    // Datetime strings
    const m = moment(
      s,
      ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", moment.ISO_8601],
      true
    );
    if (m.isValid()) return m.valueOf();

    // Fallback (non-strict)
    const m2 = moment(s);
    return m2.isValid() ? m2.valueOf() : NaN;
  },

  // ✅ IST display with milliseconds: DD-MMM-YYYY HH.mm.ss.SSS
  // Uses the same proven correction approach: subtract 330 minutes.
  formatISTWithMs(ms) {
    if (!Number.isFinite(ms)) return "";
    return moment(ms)
      .subtract(330, "minutes")
      .format("DD-MMM-YYYY HH.mm.ss.SSS");
  },

  /* -----------------------------
     Current user vote
  ----------------------------- */

  getMyCurrentChoice() {
    const gid = String(Dropdown_Game.selectedOptionValue ?? "").trim();
    const uid = String(appsmith.store.loggedInUserId ?? "").trim();
    if (!gid || !uid) return "";

    const row = (GetVotesCurrent.data || []).find(v =>
      String(v.GameID) === gid && String(v.UserID) === uid
    );

    const choice = row ? this.normalizeChoice(row.Choice) : "";
    return ["IN", "PAID", "DROPPING"].includes(choice) ? choice : "";
  },

  /* -----------------------------
     Hash helper (anti-blink)
  ----------------------------- */

  hash(obj) {
    try {
      return JSON.stringify(obj);
    } catch (e) {
      return String(Date.now());
    }
  },

  /* -----------------------------
     Build table data
  ----------------------------- */

  buildTableData() {
    const gid = Dropdown_Game.selectedOptionValue;
    if (!gid) return [];

    const usersById = Object.fromEntries(
      (GetUsers.data || []).map(u => [String(u.UserID), u])
    );

    const votes = (GetVotesCurrent.data || [])
      .filter(v => String(v.GameID) === String(gid));

    const eligible = votes.filter(v => {
      const c = this.normalizeChoice(v.Choice);
      return c === "IN" || c === "PAID";
    });

    const others = votes.filter(v => {
      const c = this.normalizeChoice(v.Choice);
      return !(c === "IN" || c === "PAID");
    });

    const rankedEligible = eligible
      .sort((a, b) => {
        const ta = this.toVoteTimeMs(a.VoteTime);
        const tb = this.toVoteTimeMs(b.VoteTime);
        if (ta !== tb) return ta - tb;
        return Number(a.VoteOrder || 0) - Number(b.VoteOrder || 0);
      })
      .map((v, i) => {
        const pos = i + 1;
        const slot = pos <= 12 ? String(pos) : `WL-${pos - 12}`;
        const u = usersById[String(v.UserID)] || {};
        const baseMs = this.toVoteTimeMs(v.VoteTime);

        return {
          Rank: pos,
          Slot: slot,
          UserID: String(v.UserID),
          Name: u.Name || "",
          Status: this.normalizeChoice(v.Choice),

          // ✅ what users will see (IST + milliseconds)
          VoteTime: this.formatISTWithMs(baseMs),

          // keep numeric for sorting/debug (hide this column in the table)
          VoteTimeMs: baseMs
        };
      });

    const mappedOthers = others.map(v => {
      const u = usersById[String(v.UserID)] || {};
      const baseMs = this.toVoteTimeMs(v.VoteTime);

      return {
        Rank: "",
        Slot: "",
        UserID: String(v.UserID),
        Name: u.Name || "",
        Status: this.normalizeChoice(v.Choice) || "",

        VoteTime: this.formatISTWithMs(baseMs),
        VoteTimeMs: baseMs
      };
    });

    return [...rankedEligible, ...mappedOthers];
  },

  /* -----------------------------
     Sync into store
  ----------------------------- */

  async syncToStore() {
    const myChoice = this.getMyCurrentChoice();

    if ((appsmith.store.myCurrentChoice || "") !== myChoice) {
      await storeValue("myCurrentChoice", myChoice);
    }

    const tableData = this.buildTableData();
    const newHash = this.hash(tableData);
    const oldHash = appsmith.store.votesTableHash || "";

    if (newHash !== oldHash) {
      await storeValue("votesTableData", tableData);
      await storeValue("votesTableHash", newHash);
    }

    // Return debug info (optional, helpful)
    return {
      rows: tableData.length,
      myCurrentChoice: myChoice,
      sampleRow: tableData[0] || null
    };
  }
};
