import React from "react";
import { Text, View } from "react-native";

export type BarDatum = {
  label: string;
  value: number;
  hint?: string;
};

export function MiniBarChart({
  title,
  subtitle,
  data,
  color = "#2563eb",
}: {
  title: string;
  subtitle?: string;
  data: BarDatum[];
  color?: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <View className="bg-white rounded-xl border border-slate-200 p-4">
      <Text className="text-slate-900 text-base font-bold">{title}</Text>
      {subtitle ? <Text className="text-slate-500 text-xs mt-0.5">{subtitle}</Text> : null}

      <View className="mt-4">
        {data.map((item) => {
          const widthPercent = (item.value / maxValue) * 100;
          return (
            <View key={item.label} className="mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-slate-600 text-xs font-medium">{item.label}</Text>
                <Text className="text-slate-900 text-xs font-bold">{item.value}</Text>
              </View>
              <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(widthPercent, item.value > 0 ? 6 : 0)}%`, backgroundColor: color }}
                />
              </View>
              {item.hint ? <Text className="text-[11px] text-slate-400 mt-1">{item.hint}</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View className="bg-slate-100 border border-slate-200 rounded-xl p-4">
      <Text className="text-slate-500 text-sm">{message}</Text>
    </View>
  );
}
