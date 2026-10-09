import './Skeleton.css';
/* Skeleton shimmer components used across all loading states */

export function SkeletonLine({ w = "100%", h = 14 }) {
  return (
    <div
      className="skeleton rounded-lg"
      style={{
        width: w,
        height: h,
      }}
    />
  );
}

export function SkeletonAvatar({ size = 36 }) {
  return (
    <div
      className="skeleton rounded-xl shrink-0"
      style={{
        width: size,
        height: size,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div
          className="skeleton rounded-xl"
          style={{
            width: 40,
            height: 40,
          }}
        />
      </div>
      <SkeletonLine h={28} w="60%" />
      <SkeletonLine h={14} w="80%" />
      <SkeletonLine h={12} w="50%" />
    </div>
  );
}

export function SkeletonKPIRow() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({
        length: 4,
      }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 6 }) {
  return (
    <div className="card-flat rounded-2xl overflow-hidden">
      {/* Toolbar skeleton */}
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="skeleton rounded-xl"
          style={{
            width: 240,
            height: 38,
          }}
        />
        <div
          className="skeleton rounded-xl ml-auto"
          style={{
            width: 160,
            height: 38,
          }}
        />
      </div>
      {/* Header */}
      <div
        className="flex items-center px-5 py-3 gap-4"
        style={{
          background: "var(--table-stripe)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {Array.from({
          length: cols,
        }).map((_, i) => (
          <div
            key={i}
            className="skeleton rounded"
            style={{
              flex: i === 0 ? 2 : 1,
              height: 12,
            }}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({
        length: rows,
      }).map((_, ri) => (
        <div
          key={ri}
          className="flex items-center px-5 py-4 gap-4"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="flex items-center gap-3"
            style={{
              flex: 2,
            }}
          >
            <SkeletonAvatar size={36} />
            <div
              className="space-y-1.5"
              style={{
                flex: 1,
              }}
            >
              <SkeletonLine h={13} w="70%" />
              <SkeletonLine h={10} w="50%" />
            </div>
          </div>
          {Array.from({
            length: cols - 1,
          }).map((_, ci) => (
            <SkeletonLine key={ci} h={13} w={`${40 + Math.random() * 40}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <SkeletonLine h={16} w={180} />
          <SkeletonLine h={11} w={120} />
        </div>
        <div
          className="skeleton rounded-xl"
          style={{
            width: 180,
            height: 34,
          }}
        />
      </div>
      {/* Fake chart bars */}
      <div className="flex items-end gap-2 h-44 px-2">
        {[65, 85, 55, 95, 70, 88, 60].map((h, i) => (
          <div
            key={i}
            className="skeleton rounded-t flex-1"
            style={{
              height: `${h}%`,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-3 px-1">
        {["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"].map((m) => (
          <SkeletonLine key={m} h={10} w={24} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonProductGrid() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({
        length: 6,
      }).map((_, i) => (
        <div key={i} className="card p-4 space-y-3">
          <div
            className="skeleton rounded-xl"
            style={{
              width: 48,
              height: 48,
            }}
          />
          <SkeletonLine h={13} w="85%" />
          <SkeletonLine h={11} w="60%" />
          <div className="flex justify-between">
            <SkeletonLine h={14} w="45%" />
            <SkeletonLine h={11} w="25%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLine h={28} w={280} />
          <SkeletonLine h={14} w={200} />
        </div>
        <div
          className="skeleton rounded-xl"
          style={{
            width: 220,
            height: 38,
          }}
        />
      </div>
      <SkeletonKPIRow />
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <SkeletonChart />
        </div>
        <div className="card p-5 space-y-4">
          <SkeletonLine h={16} w="60%" />
          {Array.from({
            length: 5,
          }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonAvatar size={28} />
              <div className="flex-1 space-y-1.5">
                <SkeletonLine h={12} />
                <SkeletonLine h={10} w="70%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}