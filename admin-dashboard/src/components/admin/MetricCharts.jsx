import React from "react";

export function MiniBarChart({
  title,
  subtitle,
  data,
  color = "#2563eb",
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-slate-900 text-base font-bold">{title}</p>
      {subtitle ? <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p> : null}

      <div className="mt-4">
        {data.map((item) => {
          const widthPercent = (item.value / maxValue) * 100;
          return (
            <div key={item.label} className="mb-3">
              <div className="flex-row items-center justify-between mb-1">
                <p className="text-slate-600 text-xs font-medium">{item.label}</p>
                <p className="text-slate-900 text-xs font-bold">{item.value}</p>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(widthPercent, item.value > 0 ? 6 : 0)}%`, backgroundColor: color }}
                />
              </div>
              {item.hint ? <p className="text-[11px] text-slate-400 mt-1">{item.hint}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EmptyState({ message }) {
  return (
    <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}
