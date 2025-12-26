export default {
  intervalId: null,

  start() {
    if (this.intervalId) return;

    // update a store value every second so bindings re-evaluate
    this.intervalId = setInterval(() => {
      storeValue("nowTick", Date.now());
    }, 500);
  },

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};
