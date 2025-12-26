export default {
  async createGameSafely() {
    await CheckExistingGames.run();

    if ((CheckExistingGames.data || []).length > 0) {
      showAlert("A game already exists for this date.", "error");
      return;
    }

    await CreateGame.run();
    showAlert("Game created", "success");
    GetGames.run(); // optional refresh
  }
};
