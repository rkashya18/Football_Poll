export default {
  interval: null,

  start() {
    if (this.interval) return;

    this.interval = setInterval(() => {
      storeValue("nowTick", Date.now());
      GetGames.run(); // 🔑 refresh games every tick
    }, 5000);
  },

  stop() {
    clearInterval(this.interval);
    this.interval = null;
  }
}
