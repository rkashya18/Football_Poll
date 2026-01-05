export default {
  // Call this on PlayerPollPage onPageLoad
  async guard() {
    // Basic gate: must be logged in and must have a userId
    const ok = appsmith.store.isLoggedIn === true && !!appsmith.store.loggedInUserId;
    if (!ok) {
      navigateTo("LoginPage");
      return;
    }

    // Optional: force the dropdown selection to the logged-in user (safety)
    // This is helpful even if the dropdown is disabled.
    if (Dropdown_User) {
      await Dropdown_User.setSelectedOption(appsmith.store.loggedInUserId);
    }
  },

  // Bind this to your Logout button onClick
  async logout() {
    await storeValue("isLoggedIn", false);
    await storeValue("loggedInEmail", null);
    await storeValue("loggedInUserId", null);
    await storeValue("loggedInUserName", null);
    await storeValue("isAdmin", false);
    await storeValue("role", null);

    showAlert("Logged out successfully.", "success");
    navigateTo("LoginPage");
  }
};
