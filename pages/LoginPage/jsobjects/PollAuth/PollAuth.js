export default {
  sessionMaxAgeMs() {
    return 2 * 60 * 60 * 1000; // 2 hours
  },

  isTruthy(v) {
    return v === true || v === "true" || v === 1 || v === "1";
  },

  async startSession() {
    await storeValue("isLoggedIn", true);
    await storeValue("sessionStartedAt", Date.now());
    await storeValue("lastActiveAt", Date.now());
  },

  async touch() {
    if (this.isTruthy(appsmith.store.isLoggedIn)) {
      await storeValue("lastActiveAt", Date.now());
    }
  },

  isSessionExpired() {
    const maxAge = this.sessionMaxAgeMs();

    const startedAt = Number(appsmith.store.sessionStartedAt || 0);
    const lastActiveAt = Number(appsmith.store.lastActiveAt || 0);

    if (!startedAt || !lastActiveAt) return true;

    const now = Date.now();
    const age = now - startedAt;
    const idle = now - lastActiveAt;

    return age > maxAge || idle > maxAge;
  },

  async guard() {
    try {
      const isLoggedIn = this.isTruthy(appsmith.store.isLoggedIn);
      const userId = String(appsmith.store.loggedInUserId ?? "").trim();

      if (!isLoggedIn || !userId) {
        navigateTo("LoginPage");
        return;
      }

      if (this.isSessionExpired()) {
        showAlert("Session expired. Please login again.", "warning");
        await this.logout(false);
        return;
      }

      await this.touch();
    } catch (e) {
      navigateTo("LoginPage");
    }
  },

  async logout(showSuccessAlert = true) {
    try { AutoRefreshVotes.stop(); } catch (e) {}
    try { Countdown.stop(); } catch (e) {}

    await storeValue("isLoggedIn", false);
    await storeValue("sessionStartedAt", null);
    await storeValue("lastActiveAt", null);

    await storeValue("loggedInEmail", null);
    await storeValue("loggedInUserId", null);
    await storeValue("loggedInUserName", null);
    await storeValue("isAdmin", false);
    await storeValue("role", null);

    await storeValue("pollCountdownText", "");
    await storeValue("pollIsOpen", false);
    await storeValue("myCurrentChoice", "");

    await storeValue("votesTableData", []);
    await storeValue("votesTableHash", "");

    if (showSuccessAlert) {
      showAlert("Logged out successfully.", "success");
    }

    navigateTo("LoginPage");
  }
};
