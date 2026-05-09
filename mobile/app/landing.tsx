import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop, Circle } from "react-native-svg";

import { Button } from "@/components/ui/Button";
import { GradientCard } from "@/components/ui/GradientCard";
import { getItem } from "@/lib/storage";
import { useAuthStore } from "@/stores/authStore";

const { width } = Dimensions.get("window");
const URBAN_HUT_LOGO = require("@/assets/urban-hut-mark.png");

export default function LandingScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    router.replace(isOnboarded ? "/(tabs)/home" : "/onboarding/welcome");
  }, [isAuthenticated, isOnboarded]);

  React.useEffect(() => {
    let mounted = true;
    getItem("access_token").then((token) => {
      if (mounted && token) {
        router.replace("/(tabs)/home");
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white" style={styles.screen}>
      <ScrollView
        className="flex-1"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Hero Section --- */}
        <View className="px-6 pt-12 pb-16 items-center" style={styles.hero}>
          <Image
            source={URBAN_HUT_LOGO}
            resizeMode="contain"
            className="mb-6"
            style={styles.logo}
          />
          
          <Text className="text-4xl font-extrabold text-slate-900 text-center leading-tight" style={styles.title}>
            Live Better,{"\n"}
            <Text className="text-primary-500" style={styles.titleAccent}>Together.</Text>
          </Text>
          
          <Text className="text-lg text-slate-500 text-center mt-4 px-4 leading-6" style={styles.subtitle}>
            The all-in-one platform to find compatible roommates, manage shared expenses, and coordinate home life.
          </Text>

          <View className="w-full mt-10 gap-4" style={styles.actions}>
            <Button 
              title="Get Started" 
              size="lg" 
              onPress={() => router.push("/(auth)/signup")} 
            />
            <TouchableOpacity 
              onPress={() => router.push("/(auth)/login")}
              className="py-4 items-center rounded-2xl border border-slate-200"
              style={styles.signInButton}
            >
              <Text className="text-slate-600 font-semibold text-base" style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Feature Pills --- */}
        <View className="px-6 pb-12">
          <Text className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-6 text-center">
            Why Urban Hut?
          </Text>
          
          <View className="gap-6">
            <View className="flex-row items-start gap-4">
              <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center">
                <Feather name="shield" size={24} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-900">Trust First</Text>
                <Text className="text-slate-500 mt-1">
                  Identity verification and transparent trust scores you can rely on before you move in.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-4">
              <View className="w-12 h-12 bg-green-50 rounded-2xl items-center justify-center">
                <Feather name="users" size={24} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-900">Smart Matching</Text>
                <Text className="text-slate-500 mt-1">
                  Our matching engine finds people who share your lifestyle, habits, and values.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-4">
              <View className="w-12 h-12 bg-purple-50 rounded-2xl items-center justify-center">
                <Feather name="credit-card" size={24} color="#8b5cf6" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-900">Conflict-Free Living</Text>
                <Text className="text-slate-500 mt-1">
                  Built-in tools for split expenses, recurring bills, and shared household chores.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- Visual Showcase (Mock UI) --- */}
        <View className="bg-slate-50 py-16 px-6 overflow-hidden">
          <Text className="text-2xl font-bold text-slate-900 text-center mb-10">
            Beautifully simple household ops
          </Text>
          
          <View className="relative h-64 items-center">
             {/* Simple representation of app screens */}
             <View 
               className="absolute w-40 h-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4"
               style={{ transform: [{ rotate: '-10deg' }, { translateX: -40 }] }}
             >
                <View className="w-full h-32 bg-slate-100 rounded-xl mb-3" />
                <View className="w-2/3 h-4 bg-slate-200 rounded-full mb-2" />
                <View className="w-full h-4 bg-slate-100 rounded-full" />
             </View>
             
             <View 
               className="absolute w-40 h-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-10"
               style={{ top: 20 }}
             >
                <View className="flex-row justify-between items-center mb-4">
                  <View className="w-8 h-8 bg-primary-100 rounded-full" />
                  <View className="w-20 h-4 bg-slate-100 rounded-full" />
                </View>
                <View className="w-full h-24 bg-primary-50 rounded-xl mb-4 items-center justify-center">
                   <Feather name="check-circle" size={32} color="#0ea5e9" />
                </View>
                <View className="w-full h-4 bg-slate-100 rounded-full mb-2" />
                <View className="w-full h-4 bg-slate-100 rounded-full" />
             </View>

             <View 
               className="absolute w-40 h-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4"
               style={{ transform: [{ rotate: '10deg' }, { translateX: 40 }] }}
             >
                <View className="w-full h-4 bg-slate-200 rounded-full mb-4" />
                <View className="gap-3">
                   {[1,2,3].map(i => (
                     <View key={i} className="flex-row items-center gap-2">
                       <View className="w-6 h-6 bg-slate-100 rounded-lg" />
                       <View className="flex-1 h-3 bg-slate-50 rounded-full" />
                     </View>
                   ))}
                </View>
             </View>
          </View>
        </View>

        {/* --- Now Live Section --- */}
        <View className="py-16 px-6">
          <GradientCard 
            title="Now Live in JC & NYC" 
            subtitle="Join 1,000+ early adopters finding their next home in Jersey City and Manhattan."
            icon="map-pin"
          />
        </View>

        {/* --- Footer CTA --- */}
        <View className="px-6 pb-20 pt-8 bg-slate-900 items-center">
           <Text className="text-white text-2xl font-bold text-center">
             Ready to find your{"\n"}right roommate?
           </Text>
           <Text className="text-slate-400 text-center mt-3 mb-10">
             Join Urban Hut today and transform your living experience.
           </Text>
           <View className="w-full gap-4">
             <Button 
               title="Create Free Account" 
               size="lg" 
               onPress={() => router.push("/(auth)/signup")} 
             />
           </View>
           <Text className="text-slate-500 text-xs mt-12">
             © 2026 Urban Hut. All rights reserved.
           </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 64,
  },
  logo: {
    width: 92,
    height: 92,
    marginBottom: 24,
  },
  title: {
    color: "#0f172a",
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 42,
    textAlign: "center",
  },
  titleAccent: {
    color: "#0ea5e9",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 18,
    lineHeight: 24,
    marginTop: 16,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  actions: {
    gap: 16,
    marginTop: 40,
    width: "100%",
  },
  signInButton: {
    alignItems: "center",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
  },
  signInText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "600",
  },
});
