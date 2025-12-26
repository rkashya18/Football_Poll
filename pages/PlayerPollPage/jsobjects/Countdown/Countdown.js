export default {
  intervalId: null,

  start() {
    this.stop();

    this.intervalId = setInterval(() => {
      const gameId = Dropdown_Game.selectedOptionValue;
      if (!gameId) {
        storeValue("pollCountdownText", "");
        return;
      }

      const game = (GetGames.data || []).find(g => g.GameID === gameId);
      if (!game || !game.PollOpenAt) {
        storeValue("pollCountdownText", "");
        return;
      }

      const openAt = moment(game.PollOpenAt, "YYYY-MM-DD HH:mm:ss");
      const now = moment();
      const diffMs = openAt.diff(now);

      if (diffMs <= 0) {
        storeValue("pollCountdownText", "Poll is open");
        this.stop();
        return;
      }

      const dur = moment.duration(diffMs);
      const hh = String(Math.floor(dur.asHours())).padStart(2, "0");
      const mm = String(dur.minutes()).padStart(2, "0");
      const ss = String(dur.seconds()).padStart(2, "0");

      storeValue("pollCountdownText", `Poll opens in ${hh}hrs:${mm}min:${ss}sec`);
    }, 1000);
  },

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};
