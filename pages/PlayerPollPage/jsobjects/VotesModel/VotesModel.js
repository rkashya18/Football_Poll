export default {
  // 1. Helper to clean up text
  normalizeChoice(c) {
    return String(c ?? "").trim().toUpperCase();
  },

  // 2. Helper for sorting (Rank 1 vs Rank 2)
  toVoteTimeMs(vt) {
    if (!vt) return NaN;
    if (typeof vt === 'number') return vt;
    const s = String(vt).trim();
    // Try to parse standard formats
    const m = moment(s, ["YYYY-MM-DD HH:mm:ss", moment.ISO_8601], true);
    return m.isValid() ? m.valueOf() : NaN;
  },

  // 3. Build the List
  buildTableData() {
    const gid = Dropdown_Game.selectedOptionValue;
    if (!gid) return [];

    // Get Users and Votes
    const usersById = Object.fromEntries(
      (GetUsers.data || []).map(u => [String(u.UserID), u])
    );
    const votes = (GetVotesCurrent.data || []).filter(v => String(v.GameID) === String(gid));

    // Separate Eligible vs Others
    const eligible = votes.filter(v => {
      const c = this.normalizeChoice(v.Choice);
      return c === "IN" || c === "PAID";
    });
    const others = votes.filter(v => {
      const c = this.normalizeChoice(v.Choice);
      return !(c === "IN" || c === "PAID");
    });

    // Sort and Format Eligible
    const rankedEligible = eligible
      .sort((a, b) => {
        const ta = this.toVoteTimeMs(a.VoteTime);
        const tb = this.toVoteTimeMs(b.VoteTime);
        if (ta !== tb) return ta - tb;
        return Number(a.VoteOrder || 0) - Number(b.VoteOrder || 0);
      })
      .map((v, i) => {
        const pos = i + 1;
        const u = usersById[String(v.UserID)] || {};
        
        // --- SIMPLE DISPLAY LOGIC ---
        // If it's a string, just show it. If it's a date, un-shift it.
        let displayTime = "";
        if (v.VoteTime) {
             if (typeof v.VoteTime === 'string') {
                 displayTime = v.VoteTime.replace("T", " ").replace("Z", "").substring(0, 19);
             } else {
                 displayTime = moment(v.VoteTime).utc().format("YYYY-MM-DD HH:mm:ss");
             }
        }
        // ----------------------------

        return {
          Rank: pos,
          Slot: pos <= 12 ? String(pos) : `WL-${pos - 12}`,
          UserID: String(v.UserID),
          Name: u.Name || "",
          Status: this.normalizeChoice(v.Choice),
          VoteTime: displayTime ? (displayTime + " IST") : "", 
          VoteTimeMs: this.toVoteTimeMs(v.VoteTime)
        };
      });

    // Format Others (Waitlist/Dropping)
    const mappedOthers = others.map(v => {
      const u = usersById[String(v.UserID)] || {};
      
      let displayTime = "";
      if (v.VoteTime) {
           if (typeof v.VoteTime === 'string') {
               displayTime = v.VoteTime.replace("T", " ").replace("Z", "").substring(0, 19);
           } else {
               displayTime = moment(v.VoteTime).utc().format("YYYY-MM-DD HH:mm:ss");
           }
      }

      return {
        Rank: "",
        Slot: "",
        UserID: String(v.UserID),
        Name: u.Name || "",
        Status: this.normalizeChoice(v.Choice),
        VoteTime: displayTime ? (displayTime + " IST") : "",
        VoteTimeMs: this.toVoteTimeMs(v.VoteTime)
      };
    });

    return [...rankedEligible, ...mappedOthers];
  },

  // 4. Force Write to Store (No Hashing, No Checks)
  async syncToStore() {
    const tableData = this.buildTableData();
    
    // Always write the data. Never skip.
    await storeValue("votesTableData", tableData);
    
    // Update myChoice for the buttons
    const myChoice = this.getMyCurrentChoice();
    await storeValue("myCurrentChoice", myChoice);
  },

  // Helper for buttons
  getMyCurrentChoice() {
    const gid = String(Dropdown_Game.selectedOptionValue ?? "").trim();
    const uid = String(appsmith.store.loggedInUserId ?? "").trim();
    const row = (GetVotesCurrent.data || []).find(v => String(v.GameID) === gid && String(v.UserID) === uid);
    const choice = row ? this.normalizeChoice(row.Choice) : "";
    return ["IN", "PAID", "DROPPING"].includes(choice) ? choice : "";
  }
};