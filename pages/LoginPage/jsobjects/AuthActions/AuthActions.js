export default {
  async sendOtp() {
    const email = String(Dropdown_Email.selectedOptionValue || "")
      .trim()
      .toLowerCase();

    if (!email) {
      showAlert("Please select your email first.", "warning");
      return { ok: false, error: "Email missing" };
    }

    // SendOtp is your API query pointing to the Worker URL
    const res = await SendOtp.run();

    if (!res?.ok) {
      showAlert(res?.error || "Failed to send OTP", "error");
      return res || { ok: false, error: "Failed to send OTP" };
    }

    showAlert("If this email is registered, an OTP has been sent.", "success");
    return res;
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

    // VerifyOtp is your API query pointing to the Worker URL
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

    // ✅ Start session timestamps + isLoggedIn (your new PollAuth)
    await PollAuth.startSession();

    navigateTo("PlayerPollPage");
    return res;
  },

  async ensureSessionOrRedirect() {
    if (appsmith.store.isLoggedIn === true && appsmith.store.loggedInUserId) {
      return;
    }

    // Clear any partial state + redirect
    await storeValue("isLoggedIn", false);
    await storeValue("sessionStartedAt", null);
    await storeValue("lastActiveAt", null);

    await storeValue("loggedInEmail", null);
    await storeValue("loggedInUserId", null);
    await storeValue("loggedInUserName", null);
    await storeValue("isAdmin", false);
    await storeValue("role", null);

    navigateTo("LoginPage");
  },

  async logout() {
    // Use PollAuth for consistency
    await PollAuth.logout();
  }
};
