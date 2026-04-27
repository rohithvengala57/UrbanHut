import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface State {
  hasError: boolean;
  message: string;
}

interface Props {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return { hasError: true, message };
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-slate-50 px-8">
          <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-4">
            <Feather name="alert-circle" size={36} color="#ef4444" />
          </View>
          <Text className="text-slate-900 text-xl font-bold text-center">Something went wrong</Text>
          <Text className="text-slate-500 text-sm text-center mt-2 leading-5">
            {this.state.message}
          </Text>
          <TouchableOpacity
            onPress={this.handleRetry}
            className="mt-8 bg-primary-500 rounded-2xl px-8 py-3 flex-row items-center gap-2"
            activeOpacity={0.85}
          >
            <Feather name="refresh-cw" size={16} color="#fff" />
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
