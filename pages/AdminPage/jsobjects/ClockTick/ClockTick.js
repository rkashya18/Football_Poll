export default {
  interval: null,

  start() {
    if (this.interval) return;

    this.interval = setInterval(() => {
      storeValue("nowTick", Date.now());
      // ✅ removed: GetGames.run();
    }, 1000);
  },

  stop() {
    clearInterval(this.interval);
    this.interval = null;
  }
}
