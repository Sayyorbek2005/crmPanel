export const styles = {
  pageWrapper: {
    width: "100%",
    minHeight: "100vh",
    boxSizing: "border-box",
    fontFamily: "Inter, sans-serif",
    overflowX: "hidden",
    transition:
      "background-color 0.25s ease, color 0.25s ease",
  },

  container: {
    width: "100%",
    maxWidth: "none",
    margin: "0 auto",
    padding: 0,
    boxSizing: "border-box",
  },

  toast: {
    position: "fixed",
    top: "-60px",
    left: "50%",
    transform: "translateX(-50%)",
    color: "#fff",
    padding: "9px 16px",
    borderRadius: "12px",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 700,
    zIndex: 9999,
    transition:
      "top 0.3s ease-in-out",
    whiteSpace: "nowrap",
    maxWidth: "calc(100vw - 30px)",
    boxSizing: "border-box",
  },

  toastShow: {
    top: "16px",
  },

  banner: {
    background:
      "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
    border:
      "1px solid rgba(99, 102, 241, 0.2)",
    borderRadius: "16px",
    padding: "16px",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "14px",
    boxSizing: "border-box",
    width: "100%",
  },

  bannerContent: {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },

  bannerBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background:
      "rgba(255,255,255,0.1)",
    padding: "3px 8px",
    borderRadius: "20px",
    fontSize: "10px",
    fontWeight: 600,
    marginBottom: "6px",
    color: "#c7d2fe",
  },

  bannerTitle: {
    fontSize: "18px",
    fontWeight: 800,
    margin: "0 0 4px 0",
    color: "#fff",
    lineHeight: 1.2,
  },

  bannerDesc: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: 0,
    lineHeight: 1.4,
  },

  bannerBtn: {
    background: "#6366f1",
    color: "#fff",
    border: "none",
    padding: "9px 16px",
    borderRadius: "10px",
    fontWeight: 700,
    fontSize: "12px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    cursor: "pointer",
    width: "fit-content",
    maxWidth: "100%",
    boxSizing: "border-box",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
    marginBottom: "14px",
    width: "100%",
    boxSizing: "border-box",
  },

  statCard: {
    padding: "12px 16px",
    borderRadius: "14px",
    border: "1px solid",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
  },

  statInfo: {
    overflow: "hidden",
    minWidth: 0,
  },

  statLabel: {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
  },

  statValue: {
    fontSize: "16px",
    fontWeight: 800,
    margin: "2px 0 0 0",
  },

  statIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  filterCard: {
    padding: "12px",
    borderRadius: "14px",
    border: "1px solid",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "14px",
    boxSizing: "border-box",
    width: "100%",
  },

  searchBox: {
    position: "relative",
    width: "100%",
    boxSizing: "border-box",
  },

  searchIcon: {
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748b",
    pointerEvents: "none",
  },

  searchInput: {
    width: "100%",
    padding: "9px 10px 9px 32px",
    borderRadius: "10px",
    border: "1px solid",
    fontSize: "12px",
    outline: "none",
    boxSizing: "border-box",
  },

  filterBtnsWrapper: {
    display: "flex",
    gap: "6px",
    width: "100%",
    boxSizing: "border-box",
  },

  filterBtn: {
    flex: 1,
    minWidth: 0,
    padding: "8px 6px",
    borderRadius: "8px",
    border: "1px solid",
    fontWeight: 700,
    fontSize: "11px",
    cursor: "pointer",
    textAlign: "center",
    whiteSpace: "nowrap",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr)",
    gap: "12px",
    width: "100%",
    boxSizing: "border-box",
  },

  card: {
    borderRadius: "16px",
    border: "1px solid",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
  },

  cardHeader: {
    borderBottom: "1px solid",
    height: "75px",
    padding: "10px",
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    boxSizing: "border-box",
  },

  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    position: "absolute",
    bottom: "-16px",
    left: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: 800,
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.2)",
    border: "2px solid",
  },

  ratingBadge: {
    background:
      "rgba(125,125,125,0.12)",
    backdropFilter: "blur(4px)",
    padding: "2px 6px",
    borderRadius: "12px",
    fontSize: "10px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: "2px",
  },

  badgeActive: {
    background:
      "rgba(16,185,129,0.15)",
    border:
      "1px solid rgba(16,185,129,0.3)",
    color: "#34d399",
    padding: "2px 6px",
    borderRadius: "12px",
    fontSize: "9px",
    fontWeight: 700,
  },

  badgeInactive: {
    background:
      "rgba(239,68,68,0.15)",
    border:
      "1px solid rgba(239,68,68,0.3)",
    color: "#f87171",
    padding: "2px 6px",
    borderRadius: "12px",
    fontSize: "9px",
    fontWeight: 700,
  },

  cardBody: {
    padding: "22px 10px 10px 10px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxSizing: "border-box",
    minWidth: 0,
  },

  ustaName: {
    fontSize: "14px",
    fontWeight: 800,
    margin: "0 0 2px 0",
    wordBreak: "break-word",
    lineHeight: 1.3,
  },

  ustaSpecialty: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#818cf8",
    margin: "0 0 2px 0",
    display: "flex",
    alignItems: "center",
    gap: "3px",
    wordBreak: "break-word",
    lineHeight: 1.4,
  },

  ustaPhone: {
    fontSize: "11px",
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "3px",
    whiteSpace: "nowrap",
  },

  metricsGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "6px",
    margin: "10px 0",
    padding: "8px",
    borderRadius: "10px",
    border: "1px solid",
    boxSizing: "border-box",
  },

  metricItem: {
    minWidth: 0,
    overflow: "hidden",
  },

  metricTitle: {
    fontSize: "9px",
    textTransform: "uppercase",
    fontWeight: 700,
    display: "block",
  },

  metricValue: {
    fontSize: "12px",
    fontWeight: 800,
    color: "#818cf8",
    display: "flex",
    alignItems: "center",
    gap: "2px",
    marginTop: "2px",
    minWidth: 0,
  },

  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid",
    paddingTop: "8px",
    boxSizing: "border-box",
    gap: "8px",
    minWidth: 0,
  },

  actionBtns: {
    display: "flex",
    gap: "4px",
    flexShrink: 0,
  },

  iconBtn: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },

  emptyState: {
    textAlign: "center",
    padding: "30px 10px",
    borderRadius: "14px",
    border: "1px solid",
    width: "100%",
    boxSizing: "border-box",
  },

  modalOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "rgba(11,15,25,0.72)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    padding: "10px",
    boxSizing: "border-box",
  },

  modalContent: {
    width: "100%",
    maxWidth: "360px",
    borderRadius: "20px",
    padding: "16px",
    position: "relative",
    boxShadow:
      "0 20px 25px -5px rgba(0,0,0,0.5)",
    boxSizing: "border-box",
    maxHeight: "100%",
    overflowY: "auto",
  },

  modalClose: {
    position: "absolute",
    top: "12px",
    right: "12px",
    border: "none",
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  modalTitle: {
    fontSize: "16px",
    fontWeight: 800,
    margin: "0 0 2px 0",
    paddingRight: "35px",
  },

  modalSub: {
    fontSize: "11px",
    margin: "0 0 12px 0",
    lineHeight: 1.5,
  },

  deleteIconBox: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background:
      "rgba(239,68,68,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 10px auto",
  },

  label: {
    display: "block",
    fontSize: "10px",
    fontWeight: 700,
    marginBottom: "3px",
  },

  input: {
    width: "100%",
    padding: "9px 10px",
    borderRadius: "10px",
    border: "1px solid",
    fontSize: "12px",
    outline: "none",
    boxSizing: "border-box",
  },

  twoColumns: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "8px",
  },

  modalButtons: {
    display: "flex",
    gap: "8px",
    marginTop: "6px",
  },

  btnCancel: {
    flex: 1,
    padding: "9px",
    borderRadius: "10px",
    border: "1px solid",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer",
    minWidth: 0,
  },

  btnSubmit: {
    flex: 1,
    padding: "9px",
    borderRadius: "10px",
    border: "none",
    background: "#6366f1",
    color: "#fff",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer",
    minWidth: 0,
  },
};
