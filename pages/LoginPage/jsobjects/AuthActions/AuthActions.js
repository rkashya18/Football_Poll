export default {
  async sendOtp() {
    const email = String(Dropdown_Email.selectedOptionValue || "").trim().toLowerCase();
    if (!email) {
      showAlert("Please select your email first.", "warning");
      return;
    }

    // SendOtp should be an API query pointing to the Cloudflare Worker URL
    // Body: x-www-form-urlencoded { action: "sendOtp", email: ... }
    const res = await SendOtp.run();

    // Your GAS returns a generic ok:true even if email isn't registered (by design)
    if (!res?.ok) {
      showAlert(res?.error || "Failed to send OTP", "error");
      return;
    }

    showAlert("If this email is registered, an OTP has been sent.", "success");
  },

  async verifyOtp() {
    const email = String(Dropdown_Email.selectedOptionValue || "").trim().toLowerCase();
    const otp = String(Input_Otp.text || "").trim();

    if (!email) {
      showAlert("Please select your email first.", "warning");
      return;
    }

    if (!otp || otp.length < 4) {
      showAlert("Please enter the OTP sent to your email.", "warning");
      return;
    }

    // VerifyOtp should be an API query pointing to the Cloudflare Worker URL
    // Body: x-www-form-urlencoded { action: "verifyOtp", email: ..., otp: ... }
    const res = await VerifyOtp.run();

    if (!res?.ok) {
      showAlert(res?.error || "OTP verification failed", "error");
      return;
    }

    // ✅ Store login state (Worker/GAS flow returns user_id, name, isAdmin)
    await storeValue("isLoggedIn", true);
    await storeValue("loggedInEmail", email);
    await storeValue("loggedInUserId", res.user_id);
    await storeValue("loggedInUserName", res.name || "");
    await storeValue("isAdmin", !!res.isAdmin);

    // Optional: for compatibility with existing code expecting "role"
    await storeValue("role", res.isAdmin ? "admin" : "user");

    // ✅ Redirect after successful login
    navigateTo("PlayerPollPage");
  },

  async ensureSessionOrRedirect() {
    // In the Worker + GAS OTP pattern (as you shared),
    // we are NOT using sessions/me. We just gate by isLoggedIn.
    if (appsmith.store.isLoggedIn === true && appsmith.store.loggedInUserId) {
      return;
    }

    // Clear any partial state + redirect
    await storeValue("isLoggedIn", false);
    await storeValue("loggedInEmail", null);
    await storeValue("loggedInUserId", null);
    await storeValue("loggedInUserName", null);
    await storeValue("isAdmin", false);
    await storeValue("role", null);

    navigateTo("LoginPage");
  },

  async logout() {
    await storeValue("isLoggedIn", false);
    await storeValue("loggedInEmail", null);
    await storeValue("loggedInUserId", null);
    await storeValue("loggedInUserName", null);
    await storeValue("isAdmin", false);
    await storeValue("role", null);

    navigateTo("LoginPage");
    showAlert("Logged out.", "success");
  }
};
