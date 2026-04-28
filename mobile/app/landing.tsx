import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop, Circle } from "react-native-svg";

import { Button } from "@/components/ui/Button";
import { GradientCard } from "@/components/ui/GradientCard";

const { width } = Dimensions.get("window");

export default function LandingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* --- Hero Section --- */}
        <View className="px-6 pt-12 pb-16 items-center">
          <View className="w-16 h-16 bg-primary-500 rounded-3xl items-center justify-center mb-6 shadow-xl">
            <Feather name="home" size={32} color="#fff" />
          </View>
          
          <Text className="text-4xl font-extrabold text-slate-900 text-center leading-tight">
            Live Better,{"\n"}
            <Text className="text-primary-500">Together.</Text>
          </Text>
          
          <Text className="text-lg text-slate-500 text-center mt-4 px-4 leading-6">
            The all-in-one platform to find compatible roommates, manage shared expenses, and coordinate home life.
          </Text>

          <View className="w-full mt-10 gap-4">
            <Button 
              title="Get Started" 
              size="lg" 
              onPress={() => router.push("/(auth)/signup")} 
            />
            <TouchableOpacity 
              onPress={() => router.push("/(auth)/login")}
              className="py-4 items-center rounded-2xl border border-slate-200"
            >
              <Text className="text-slate-600 font-semibold text-base">Sign In</Text>
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
             Ready to find your{"\n"}dream roommate?
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
