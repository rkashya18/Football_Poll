export default {
  async refresh() {
    const gid = Dropdown_Game.selectedOptionValue;
    if (!gid) {
      await storeValue("myCurrentChoice", "");
      await storeValue("votesTableData", []);
      await storeValue("votesTableHash", "");
      return;
    }

    await GetVotesCurrent.run();
    await VotesModel.syncToStore();
  }
};
