export default {
  isTruthy(v) {
    return v === true || v === "true" || v === 1 || v === "1";
  },

  sessionMaxAgeMs() {
    return 2 * 60 * 60 * 1000; // 2 hours
  },

  isSessionExpired() {
    const maxAge = this.sessionMaxAgeMs();
    const startedAt = Number(appsmith.store.sessionStartedAt || 0);
    const lastActiveAt = Number(appsmith.store.lastActiveAt || 0);
    if (!startedAt || !lastActiveAt) return true;

    const now = Date.now();
    return (now - startedAt) > maxAge || (now - lastActiveAt) > maxAge;
  },

  async touch() {
    if (this.isTruthy(appsmith.store.isLoggedIn)) {
      await storeValue("lastActiveAt", Date.now());
    }
  },

  async forceLogoutToLogin(message = "Please login again.") {
    await storeValue("isLoggedIn", false);
    await storeValue("sessionStartedAt", null);
    await storeValue("lastActiveAt", null);

    await storeValue("loggedInEmail", null);
    await storeValue("loggedInUserId", null);
    await storeValue("loggedInUserName", null);
    await storeValue("isAdmin", false);
    await storeValue("role", null);

    showAlert(message, "warning");
    navigateTo("LoginPage");
  },

  async guardAdmin() {
    const isLoggedIn = this.isTruthy(appsmith.store.isLoggedIn);
    const userId = String(appsmith.store.loggedInUserId || "").trim();

    if (!isLoggedIn || !userId) {
      navigateTo("LoginPage");
      return false;
    }

    if (this.isSessionExpired()) {
      await this.forceLogoutToLogin("Session expired. Please login again.");
      return false;
    }

    // must be admin
    if (appsmith.store.isAdmin !== true) {
      showAlert("Unauthorized: Admin access only.", "error");
      navigateTo("PlayerPollPage");
      return false;
    }

    await this.touch();
    return true;
  },

  async initAdminPage() {
    const ok = await this.guardAdmin();
    if (!ok) return;

    // now it's safe to fetch
    await GetUsers.run();
    await GetGames.run();
  }
};
