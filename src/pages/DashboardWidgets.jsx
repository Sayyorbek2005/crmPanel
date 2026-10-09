import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import { TrendingUp, TrendingDown } from "lucide-react";
import { fmt } from './dashboardHelpers';

export const KpiCard = ({
  icon: Icon,
  label,
  value,
  change,
  sub,
  color,
  bg,
  active,
  onClick,
}) => {
  useUILanguage();
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-5 transition-card cursor-pointer ${
        active ? "kpi-card-active" : ""
      }`}
      style={{
        background: "var(--surface)",

        border: active
          ? "2px solid var(--brand)"
          : "1px solid var(--border)",

        boxShadow: active
          ? "0 10px 30px rgba(37,99,235,0.15)"
          : "0 2px 8px rgba(15,23,42,0.04)",

        transition:
          "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",

        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform =
          "translateY(-3px)";

        e.currentTarget.style.boxShadow =
          "0 10px 25px rgba(15,23,42,0.10)";

        e.currentTarget.style.borderColor =
          "var(--brand)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform =
          "translateY(0)";

        e.currentTarget.style.boxShadow =
          active
            ? "0 10px 30px rgba(37,99,235,0.15)"
            : "0 2px 8px rgba(15,23,42,0.04)";

        e.currentTarget.style.borderColor =
          active
            ? "var(--brand)"
            : "var(--border)";
      }}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--brand)",
            top: 12,
            right: 12,
            boxShadow:
              "0 0 0 4px var(--brand-light)",
          }}
        />
      )}

      <div className="flex items-start justify-between mb-4">
        <div
          className="p-2.5 rounded-xl"
          style={{
            background: bg,
          }}
        >
          <Icon
            size={18}
            style={{
              color,
            }}
          />
        </div>

        {change !== undefined &&
          change !== null && (
            <span
              className="flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background:
                  change >= 0
                    ? "var(--success-light)"
                    : "var(--danger-light)",

                color:
                  change >= 0
                    ? "var(--success)"
                    : "var(--danger)",
              }}
            >
              {change >= 0 ? (
                <TrendingUp size={11} />
              ) : (
                <TrendingDown size={11} />
              )}

              {tx(Math.abs(change))}%
            </span>
          )}
      </div>

      <div className="mb-1">
        <div
          className="text-2xl font-display font-bold leading-none count-up"
          style={{
            fontFamily:
              "'Manrope', sans-serif",

            color:
              "var(--text-primary)",
          }}
        >
          {tx(value)}
        </div>
      </div>

      <div
        className="text-sm font-medium mb-0.5"
        style={{
          color:
            "var(--text-secondary)",
        }}
      >
        {tx(label)}
      </div>

      <div
        className="text-xs"
        style={{
          color:
            "var(--text-faint)",
        }}
      >
        {tx(sub)}
      </div>
    </div>
  );
};

export const CustomTooltip = ({
  active,
  payload,
  label,
}) => {
  useUILanguage();
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className="rounded-xl p-3 text-xs shadow-lg"
      style={{
        background:
          "var(--text-primary)",

        color: "var(--surface-2)",

        minWidth: 150,
      }}
    >
      <div
        className="font-semibold mb-2"
        style={{
          color:
            "var(--text-faint)",
        }}
      >
        {tx(label)}
      </div>

      {payload.map((entry) => (
        <div
          key={entry.name}
          className="flex justify-between gap-4 mb-1"
        >
          <span
            style={{
              color: entry.color,
            }}
          >
            {entry.name}
          </span>

          <span className="font-semibold">
            {tx(fmt(entry.value))}
          </span>
        </div>
      ))}
    </div>
  );
};
