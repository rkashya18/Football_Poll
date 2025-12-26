export default {
  isAdmin() {
    const users = GetUsers.data || [];
    const userId =
      Dropdown_User?.selectedOptionValue ||
      Dropdown_AdminUser?.selectedOptionValue ||
      "";

    if (!userId) return false;

    const user = users.find(u => u.UserID === userId);
    return user?.IsAdmin === "TRUE";
  }
};
