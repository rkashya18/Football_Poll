export default {
  async sendOtp() {
    const email = String(Dropdown_Email.selectedOptionValue || "")
      .trim()
      .toLowerCase();

    if (!email) {
      showAlert("Please select your email first.", "warning");
      return { ok: false, error: "Email missing" };
    }

    const res = await SendOtp.run();

    if (!res?.ok) {
      showAlert(res?.error || "Failed to send OTP", "error");
      return res || { ok: false, error: "Failed to send OTP" };
    }

    showAlert("An OTP has been sent to the email selected by you ! ", "success");
    return res;
  },

  // ✅ NEW: fetch & store games once post-login (Option B)
  async preloadGames() {
    try {
      const games = await GetGames.run(); // IMPORTANT: use return value, not GetGames.data
      await storeValue("games", Array.isArray(games) ? games : []);
      await storeValue("gamesLoadedAt", Date.now());
      return { ok: true, count: (games || []).length };
    } catch (e) {
      // ✅ If games already exist (cached or loaded elsewhere), don't show the warning
      const existing = appsmith.store.games;

      await storeValue("gamesLoadedAt", Date.now());

      if (Array.isArray(existing) && existing.length > 0) {
        return { ok: true, count: existing.length, source: "cache" };
      }

      // Otherwise, genuinely no games available → warn
      await storeValue("games", []);
      showAlert(
        "Logged in, but failed to load games. Please refresh once.",
        "warning"
      );
      return { ok: false, error: e?.message || "Failed to load games" };
    }
  },

  async verifyOtp() {
    const email = String(Dropdown_Email.selectedOptionValue || "")
      .trim()
      .toLowerCase();

    const otp = String(Input_Otp.text || "").trim();

    if (!email) {
      showAlert("Please select your email first.", "warning");
      return { ok: false, error: "Email missing" };
    }

    if (!otp || otp.length < 4) {
      showAlert("Please enter the OTP sent to your email.", "warning");
      return { ok: false, error: "OTP missing" };
    }

    const res = await VerifyOtp.run();

    if (!res?.ok) {
      showAlert(res?.error || "OTP verification failed", "error");
      return res || { ok: false, error: "OTP verification failed" };
    }

    // Store user identity
    await storeValue("loggedInEmail", email);
    await storeValue("loggedInUserId", res.user_id);
    await storeValue("loggedInUserName", res.name || "");
    await storeValue("isAdmin", !!res.isAdmin);
    await storeValue("role", res.isAdmin ? "admin" : "user");

    // Start session timestamps + isLoggedIn
    await PollAuth.startSession();

    // ✅ Preload games BEFORE navigating (Option B)
    await this.preloadGames();

    navigateTo("PlayerPollPage");
    return res;
  },

  async ensureSessionOrRedirect() {
    if (appsmith.store.isLoggedIn === true && appsmith.store.loggedInUserId) {
      return;
    }

    await storeValue("isLoggedIn", false);
    await storeValue("sessionStartedAt", null);
    await storeValue("lastActiveAt", null);

    await storeValue("loggedInEmail", null);
    await storeValue("loggedInUserId", null);
    await storeValue("loggedInUserName", null);
    await storeValue("isAdmin", false);
    await storeValue("role", null);

    // Optional: clear cached games on forced redirect
    await storeValue("games", []);
    await storeValue("gamesLoadedAt", null);

    navigateTo("LoginPage");
  },

  async logout() {
    await PollAuth.logout();

    // Optional: clear cached games on logout
    await storeValue("games", []);
    await storeValue("gamesLoadedAt", null);
  }
};
