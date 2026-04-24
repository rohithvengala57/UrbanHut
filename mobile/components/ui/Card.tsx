import React from "react";
import { TouchableOpacity, View } from "react-native";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
}

export function Card({ children, onPress, className = "" }: CardProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 ${className}`}
    >
      {children}
    </Wrapper>
  );
}
