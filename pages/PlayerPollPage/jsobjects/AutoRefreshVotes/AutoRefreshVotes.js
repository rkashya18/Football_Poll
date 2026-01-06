export default {
  intervalId: null,

  start() {
    this.stop();

    // run once immediately
    VotesFetch.refresh();

    this.intervalId = setInterval(() => {
      if (!Dropdown_Game.selectedOptionValue) return;
      VotesFetch.refresh();
    }, 1000);
  },

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};
