export default {
  async guard() {
    const ok = appsmith.store.isLoggedIn === true && !!appsmith.store.loggedInUserId;
    if (!ok) {
      navigateTo("LoginPage");
      return;
    }
  },

  async logout() {
    await storeValue("isLoggedIn", false);
    await storeValue("loggedInEmail", null);
    await storeValue("loggedInUserId", null);
    await storeValue("loggedInUserName", null);
    await storeValue("isAdmin", false);
    await storeValue("role", null);
		await storeValue("sessionStartedAt", Date.now());


    showAlert("Logged out successfully.", "success");
    navigateTo("LoginPage");
  }
};
