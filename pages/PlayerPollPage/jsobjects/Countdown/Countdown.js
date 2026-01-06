export default {
  intervalId: null,

  parseOpenAt(raw) {
    if (raw === null || raw === undefined || raw === "") return null;

    const s = String(raw).trim();

    const m = moment(
      s,
      [
        "YYYY-MM-DD HH:mm:ss",
        "YYYY-MM-DD HH:mm",
        "DD-MMM-YYYY HH:mm:ss",
        "DD-MMM-YYYY HH:mm",
        "MM/DD/YYYY HH:mm:ss",
        "MM/DD/YYYY HH:mm",
        moment.ISO_8601
      ],
      true
    );

    if (m.isValid()) return m;

    const m2 = moment(s);
    return m2.isValid() ? m2 : null;
  },

  async tick() {
    const gameId = Dropdown_Game.selectedOptionValue;

    if (!gameId) {
      await storeValue("pollCountdownText", "");
      await storeValue("pollIsOpen", false);
      return;
    }

    const game = (GetGames.data || []).find(g => String(g.GameID) === String(gameId));

    if (!game || !game.PollOpenAt) {
      await storeValue("pollCountdownText", "");
      await storeValue("pollIsOpen", false);
      return;
    }

    const openAt = this.parseOpenAt(game.PollOpenAt);
    if (!openAt) {
      await storeValue("pollCountdownText", "Poll open time not available");
      await storeValue("pollIsOpen", false);
      return;
    }

    const now = moment();
    const diffMs = openAt.diff(now);

    // ✅ Reactive flag that drives buttons
    const isOpen = diffMs <= 0;
    if ((appsmith.store.pollIsOpen === true) !== isOpen) {
      await storeValue("pollIsOpen", isOpen);
    }

    if (isOpen) {
      await storeValue("pollCountdownText", "Poll is open");
      return;
    }

    const dur = moment.duration(diffMs);
    const hh = String(Math.floor(dur.asHours())).padStart(2, "0");
    const mm = String(dur.minutes()).padStart(2, "0");
    const ss = String(dur.seconds()).padStart(2, "0");

    await storeValue("pollCountdownText", `Poll opens in ${hh}hrs:${mm}min:${ss}sec`);
  },

  start() {
    this.stop();

    // run immediately
    this.tick();

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  },

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};
