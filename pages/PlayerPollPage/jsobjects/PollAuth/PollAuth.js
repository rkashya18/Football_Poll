export default {
  // 2 hours in ms
  sessionMaxAgeMs() {
    return 2 * 60 * 60 * 1000;
  },

  // Update last-activity timestamp
  async touch() {
    await storeValue("lastActiveAt", Date.now());
  },

  // Determine whether the session is expired due to inactivity
  isSessionExpired() {
    const now = Date.now();
    const last = Number(appsmith.store.lastActiveAt || 0);

    // If lastActiveAt isn't set but user is logged in, treat session as expired
    // after maxAge from sessionStartedAt (fallback), else force re-login.
    const started = Number(appsmith.store.sessionStartedAt || 0);

    const maxAge = this.sessionMaxAgeMs();

    if (!last && started) return (now - started) > maxAge;
    if (!last && !started) return true;

    return (now - last) > maxAge;
  },

  // Optional: call this once on page load to enforce expiry even when the user stays idle
  startSessionWatcher() {
    // Avoid multiple intervals if the user navigates away/back
    if (window.__pollSessionWatcherStarted) return;
    window.__pollSessionWatcherStarted = true;

    setInterval(() => {
      const ok = appsmith.store.isLoggedIn === true && !!appsmith.store.loggedInUserId;
      if (!ok) return;

      if (this.isSessionExpired()) {
        // Use logout() to clear store keys and redirect
        this.logout(true); // silent logout due to timeout
      }
    }, 60 * 1000); // check every 1 minute
  },

  async guard() {
    const ok = appsmith.store.isLoggedIn === true && !!appsmith.store.loggedInUserId;
    if (!ok) {
      navigateTo("LoginPage");
      return;
    }

    // Enforce inactivity timeout
    if (this.isSessionExpired()) {
      await this.logout(true); // silent logout due to timeout
      return;
    }

    // Mark activity whenever guard runs
    await this.touch();
  },

  /**
   * @param {boolean} silent - if true, don't show "Logged out successfully"
   *                           and instead show timeout message.
   */
  async logout(silent = false) {
    await storeValue("isLoggedIn", false);
    await storeValue("loggedInEmail", null);
    await storeValue("loggedInUserId", null);
    await storeValue("loggedInUserName", null);
    await storeValue("isAdmin", false);
    await storeValue("role", null);

    // Fix: on logout, timestamps should be cleared (not set to Date.now()).
    // Setting to Date.now() can make expiry logic behave oddly.
    await storeValue("sessionStartedAt", null);
    await storeValue("lastActiveAt", null);

    if (silent) {
      showAlert("Session expired due to inactivity.", "warning");
    } else {
      showAlert("Logged out successfully.", "success");
    }

    navigateTo("LoginPage");
  }
};
