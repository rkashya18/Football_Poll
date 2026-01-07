export default {
  async load() {
    await GetGames.run();

    // retry once if empty
    if (!GetGames.data || GetGames.data.length === 0) {
      await GetGames.run();
    }
  }
}