const profileKey = (user) => `crm_profile_${user?.type === "employee" ? `employee_${user.id}` : "director"}`;

export function readProfile(user) {
  try {
    const saved = JSON.parse(localStorage.getItem(profileKey(user)) || "null");
    if (saved && typeof saved === "object") {
      const profile = { ...saved };
      delete profile.avatar;
      if ("avatar" in saved) {
        try { localStorage.setItem(profileKey(user), JSON.stringify(profile)); } catch { /* The initials still work. */ }
      }
      return profile;
    }
  } catch { /* Keep the default profile if storage is unavailable. */ }
  const nameParts = String(user?.name || "").trim().split(/\s+/);
  return {
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" "),
    phone: "",
    email: "",
    position: user?.type === "director" ? "Direktor" : user?.role || "",
  };
}

export function saveProfile(user, profile) {
  const withoutImage = { ...profile };
  delete withoutImage.avatar;
  localStorage.setItem(profileKey(user), JSON.stringify(withoutImage));
}

export function profileName(profile, user) {
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || user?.name || "Foydalanuvchi";
}

export function profileInitials(profile, user) {
  return [profile?.firstName?.[0], profile?.lastName?.[0]].filter(Boolean).join("").toUpperCase()
    || String(user?.name || "U").slice(0, 2).toUpperCase();
}
