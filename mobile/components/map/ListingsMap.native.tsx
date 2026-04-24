/**
 * Native map — powered by react-native-maps (iOS & Android).
 * Metro loads this file on iOS/Android; ListingsMap.web.tsx is loaded on web.
 */
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Callout, Marker, Region } from "react-native-maps";

// ── Types ──────────────────────────────────────────────────────────────────
interface Listing {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  rent_monthly: number;
  city: string;
  state: string;
}

interface Props {
  listings: Listing[];
  onPress: (id: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getInitialRegion(listings: Listing[]): Region {
  if (listings.length === 0) {
    return { latitude: 40.7178, longitude: -74.0431, latitudeDelta: 0.5, longitudeDelta: 0.5 };
  }
  const lat = listings.reduce((s, l) => s + l.latitude, 0) / listings.length;
  const lng = listings.reduce((s, l) => s + l.longitude, 0) / listings.length;
  return { latitude: lat, longitude: lng, latitudeDelta: 0.2, longitudeDelta: 0.2 };
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ListingsMap({ listings, onPress }: Props) {
  const mapRef = useRef<MapView>(null);
  const [locating, setLocating] = useState(false);

  // iOS exposes a native location button via showsMyLocationButton.
  // Android does not — we render our own floating button for it.
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.animateToRegion(
          {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          },
          800,
        );
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={getInitialRegion(listings)}
        showsUserLocation
        // iOS provides a built-in "locate me" button in the top-right;
        // on Android we render our own button below.
        showsMyLocationButton={Platform.OS === "ios"}
      >
        {listings.map((listing) => (
          <Marker
            key={listing.id}
            coordinate={{
              latitude: listing.latitude,
              longitude: listing.longitude,
            }}
          >
            {/* Price bubble */}
            <View
              style={{
                backgroundColor: "#0ea5e9",
                borderRadius: 16,
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderWidth: 2,
                borderColor: "#fff",
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                ${Math.round(listing.rent_monthly / 100).toLocaleString()}/mo
              </Text>
            </View>

            <Callout tooltip onPress={() => onPress(listing.id)}>
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 12,
                  width: 210,
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: "#0f172a", marginBottom: 2 }}
                  numberOfLines={2}
                >
                  {listing.title}
                </Text>
                <Text style={{ color: "#0ea5e9", fontWeight: "700", fontSize: 15 }}>
                  ${Math.round(listing.rent_monthly / 100).toLocaleString()}/mo
                </Text>
                <Text style={{ color: "#64748b", fontSize: 11, marginBottom: 10 }}>
                  {listing.city}, {listing.state}
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#0ea5e9",
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: "center",
                  }}
                  onPress={() => onPress(listing.id)}
                >
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
                    View Listing →
                  </Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Custom locate button — Android only (iOS uses native showsMyLocationButton) */}
      {Platform.OS === "android" && (
        <TouchableOpacity
          onPress={handleLocate}
          activeOpacity={0.85}
          style={{
            position: "absolute",
            bottom: 24,
            right: 16,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            elevation: 6,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 6,
          }}
        >
          {locating ? (
            <ActivityIndicator size="small" color="#0ea5e9" />
          ) : (
            <Feather name="navigation" size={22} color="#0ea5e9" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
