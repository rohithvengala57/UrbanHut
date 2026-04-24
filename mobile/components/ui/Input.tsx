import React from "react";
import { Text, TextInput, View } from "react-native";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  error?: string;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  error,
  multiline,
  autoCapitalize = "none",
}: InputProps) {
  return (
    <View className="mb-4">
      {label && <Text className="text-sm font-medium text-slate-700 mb-1.5">{label}</Text>}
      <TextInput
        className={`bg-slate-50 border rounded-xl px-4 py-3 text-base text-slate-900 ${
          error ? "border-red-400" : "border-slate-200"
        } ${multiline ? "min-h-[100px] text-top" : ""}`}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
      />
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
}
