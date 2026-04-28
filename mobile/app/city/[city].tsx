import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from "react-native";

import { ListingCard } from "@/components/listing/ListingCard";
import { Button } from "@/components/ui/Button";
import { useListings } from "@/hooks/useListings";

export default function CityLandingScreen() {
  const { city } = useLocalSearchParams<{ city: string }>();
  const displayCity = city ? city.charAt(0).toUpperCase() + city.slice(1).replace("-", " ") : "Your City";
  
  const { data: listings, isLoading } = useListings({ city: displayCity });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* --- Header --- */}
        <View className="px-6 pt-8 pb-10 bg-slate-900">
           <TouchableOpacity 
             onPress={() => router.back()}
             className="w-10 h-10 bg-white/10 rounded-full items-center justify-center mb-6"
           >
             <Feather name="arrow-left" size={20} color="#fff" />
           </TouchableOpacity>
           
           <Text className="text-white text-xs font-bold uppercase tracking-widest mb-2">
             Now Live in
           </Text>
           <Text className="text-4xl font-extrabold text-white leading-tight">
             {displayCity}
           </Text>
           <Text className="text-slate-400 text-lg mt-3 leading-6">
             Join the fastest growing roommate community in {displayCity}. Verified listings, trust-aware matching.
           </Text>
           
           <View className="mt-8">
             <Button 
               title={`Find Roommates in ${displayCity}`} 
               onPress={() => router.push("/(auth)/signup")} 
             />
           </View>
        </View>

        {/* --- Stats --- */}
        <View className="flex-row border-b border-slate-100">
           <View className="flex-1 py-6 items-center border-r border-slate-100">
              <Text className="text-2xl font-bold text-slate-900">140+</Text>
              <Text className="text-slate-500 text-xs mt-1">Active Listings</Text>
           </View>
           <View className="flex-1 py-6 items-center border-r border-slate-100">
              <Text className="text-2xl font-bold text-slate-900">92%</Text>
              <Text className="text-slate-500 text-xs mt-1">Match Rate</Text>
           </View>
           <View className="flex-1 py-6 items-center">
              <Text className="text-2xl font-bold text-slate-900">4.8/5</Text>
              <Text className="text-slate-500 text-xs mt-1">User Rating</Text>
           </View>
        </View>

        {/* --- Listings Preview --- */}
        <View className="px-6 py-10">
           <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-slate-900">Trending in {displayCity}</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/home")}>
                 <Text className="text-primary-600 font-semibold">View All</Text>
              </TouchableOpacity>
           </View>

           {isLoading ? (
             <View className="py-20 items-center">
               <Text className="text-slate-400">Loading local listings...</Text>
             </View>
           ) : listings && listings.length > 0 ? (
             <View>
               {listings.slice(0, 3).map((item: any) => (
                 <ListingCard key={item.id} listing={item} />
               ))}
             </View>
           ) : (
             <View className="py-12 bg-slate-50 rounded-3xl items-center px-6">
                <Feather name="search" size={32} color="#cbd5e1" />
                <Text className="text-slate-600 font-semibold mt-4 text-center">New listings coming soon!</Text>
                <Text className="text-slate-400 text-sm text-center mt-1">Be the first to post a listing in {displayCity}.</Text>
                <TouchableOpacity 
                  onPress={() => router.push("/listing/create")}
                  className="mt-6 bg-white border border-slate-200 rounded-2xl px-6 py-3"
                >
                   <Text className="text-slate-600 font-semibold">Post a Listing</Text>
                </TouchableOpacity>
             </View>
           )}
        </View>

        {/* --- Why this city? --- */}
        <View className="px-6 py-10 bg-slate-50">
           <Text className="text-2xl font-bold text-slate-900 mb-6">Why Urban Hut in {displayCity}?</Text>
           
           <View className="gap-6">
              <View className="bg-white p-5 rounded-3xl shadow-sm">
                 <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mb-4">
                    <Feather name="navigation" size={20} color="#3b82f6" />
                 </View>
                 <Text className="text-lg font-bold text-slate-900">Commute-First Search</Text>
                 <Text className="text-slate-500 mt-2">
                    Find homes based on PATH, Subway, or Ferry proximity. We know {displayCity} transit.
                 </Text>
              </View>

              <View className="bg-white p-5 rounded-3xl shadow-sm">
                 <View className="w-10 h-10 bg-green-50 rounded-xl items-center justify-center mb-4">
                    <Feather name="shield" size={20} color="#10b981" />
                 </View>
                 <Text className="text-lg font-bold text-slate-900">Verified Neighborhoods</Text>
                 <Text className="text-slate-500 mt-2">
                    Our trust engine ensures you're moving in with real people who care about their community.
                 </Text>
              </View>
           </View>
        </View>

        {/* --- Final CTA --- */}
        <View className="px-6 py-16 items-center">
           <Text className="text-2xl font-bold text-slate-900 text-center">
             Start your {displayCity} journey today.
           </Text>
           <View className="w-full mt-8">
              <Button 
                title="Create My Profile" 
                size="lg" 
                onPress={() => router.push("/(auth)/signup")} 
              />
           </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
