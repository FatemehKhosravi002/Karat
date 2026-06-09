const Auth = {
  ACCESS_KEY: "karat_access",
  REFRESH_KEY: "karat_refresh",

  getAccess() {
    return localStorage.getItem(this.ACCESS_KEY);
  },

  getRefresh() {
    return localStorage.getItem(this.REFRESH_KEY);
  },

  setTokens(access, refresh) {
    localStorage.setItem(this.ACCESS_KEY, access);
    if (refresh) localStorage.setItem(this.REFRESH_KEY, refresh);
  },

  clear() {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  },

  isLoggedIn() {
    return Boolean(this.getAccess() && this.getRefresh());
  },

  async login(username, password) {
    const res = await fetch("/account/token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "ورود ناموفق بود");
    this.setTokens(data.access, data.refresh);
    return data;
  },

  async register(name, username, password) {
    const res = await fetch("/account/register/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = Object.values(data).flat().join(" ") || "ثبت‌نام ناموفق بود";
      throw new Error(msg);
    }
    return data;
  },

  async refresh() {
    const refresh = this.getRefresh();
    if (!refresh) throw new Error("no refresh token");

    const res = await fetch("/account/token/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    const data = await res.json();
    if (!res.ok) {
      this.clear();
      throw new Error("session expired");
    }

    this.setTokens(data.access, data.refresh || refresh);
    return data.access;
  },

  logout() {
    this.clear();
    window.location.href = "/login/";
  },

  async api(url, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    let access = this.getAccess();
    if (access) headers.Authorization = `Bearer ${access}`;

    let res = await fetch(url, { ...options, headers });

    if (res.status === 401 && this.getRefresh()) {
      try {
        access = await this.refresh();
        headers.Authorization = `Bearer ${access}`;
        res = await fetch(url, { ...options, headers });
      } catch {
        this.logout();
        throw new Error("session expired");
      }
    }

    return res;
  },
};