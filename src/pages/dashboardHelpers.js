export const fmt = (n) => {
  if (n === null || n === undefined) {
    return "0";
  }

  if (n >= 1000000) {
    return (n / 1000000).toFixed(1) + " mln";
  }

  if (n >= 1000) {
    return (n / 1000).toFixed(0) + " ming";
  }

  return n.toLocaleString();
};

export const statusVisual = {
  paid: {
    bg: "var(--success-light)",
    color: "var(--success)",
  },

  debt: {
    bg: "var(--danger-light)",
    color: "var(--danger)",
  },

  partial: {
    bg: "var(--warning-light)",
    color: "var(--warning)",
  },

  returned: {
    bg: "var(--border-subtle)",
    color: "var(--text-muted)",
  },
};

export const stockVisual = {
  critical: {
    bg: "var(--danger-light)",
    color: "var(--danger)",
  },

  low: {
    bg: "var(--warning-light)",
    color: "var(--warning)",
  },

  ok: {
    bg: "var(--success-light)",
    color: "var(--success)",
  },
};
