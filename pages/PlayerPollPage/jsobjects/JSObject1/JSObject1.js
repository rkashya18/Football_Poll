export default {
  async test() {
    await storeValue("oldChoice", "IN");
    await storeValue("pendingChoice", "PAID");
    return await InsertVoteHistory.run();
  }
};
