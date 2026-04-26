import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { getTrustColor } from "@/lib/trust";

interface TrustScoreCircleProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
}

export function TrustScoreCircle({
  score,
  size = 80,
  strokeWidth = 7,
  showLabel = true,
  label,
}: TrustScoreCircleProps) {
  const color = getTrustColor(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const progress = clampedScore / 100;
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;
  const fontSize = size * 0.25;
  const captionSize = size * 0.13;

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="trustGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="1" />
              <Stop offset="1" stopColor={color} stopOpacity="0.6" />
            </LinearGradient>
          </Defs>
          {/* Track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress arc */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#trustGrad)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        </Svg>
        {/* Center text */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize, fontWeight: "700", color, lineHeight: fontSize * 1.1 }}>
            {Math.round(clampedScore)}
          </Text>
        </View>
      </View>
      {showLabel && (
        <Text
          style={{
            fontSize: captionSize,
            fontWeight: "500",
            color: "#64748b",
            marginTop: 4,
          }}
        >
          {label ?? "Trust Score"}
        </Text>
      )}
    </View>
  );
}
