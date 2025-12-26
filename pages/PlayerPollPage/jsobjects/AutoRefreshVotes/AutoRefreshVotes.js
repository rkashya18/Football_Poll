export default {
  intervalId: null,

  start() {
    if (this.intervalId) return; // already running

    this.intervalId = setInterval(() => {
      if (Dropdown_Game.selectedOptionValue) {
        GetVotesCurrent.run();
      }
    }, 5000);
  },

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};
