/**
 * Web map — powered by react-leaflet (OpenStreetMap, no API key required).
 * Metro loads this file on web; ListingsMap.native.tsx is loaded on iOS/Android.
 */
import "leaflet/dist/leaflet.css";

import L from "leaflet";
import React, { useCallback, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

// ── Fix broken default marker images when bundled ──────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Price bubble marker icon ───────────────────────────────────────────────
function makePriceIcon(rentCents: number) {
  const label = `$${Math.round(rentCents / 100).toLocaleString()}/mo`;
  return L.divIcon({
    html: `<span style="
      display:inline-block;
      background:#0ea5e9;
      color:#fff;
      padding:3px 9px;
      border-radius:16px;
      font-size:12px;
      font-weight:700;
      white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,.22);
      border:2px solid #fff;
      font-family:system-ui,sans-serif;
    ">${label}</span>`,
    className: "",
    iconAnchor: [38, 14],
  });
}

// ── "Go to my location" button — must live inside <MapContainer> ──────────
function LocateButton() {
  const map = useMap();
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setBusy(true);
    setDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 14, {
          duration: 1.2,
        });
        setBusy(false);
      },
      () => {
        setBusy(false);
        setDenied(true);
        // Reset the denied icon after 2 seconds
        setTimeout(() => setDenied(false), 2000);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [map]);

  return (
    // Positioned inside the MapContainer DOM — z-index keeps it above tiles
    <div
      style={{
        position: "absolute",
        bottom: 24,
        right: 12,
        zIndex: 1000,
        pointerEvents: "auto",
      }}
    >
      <button
        onClick={handleLocate}
        disabled={busy}
        title={denied ? "Location access denied" : "Go to my location"}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          background: denied ? "#ef4444" : "#fff",
          border: "none",
          boxShadow: "0 2px 10px rgba(0,0,0,.25)",
          cursor: busy ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
        }}
      >
        {busy ? (
          <div
            style={{
              width: 18,
              height: 18,
              border: "2px solid #0ea5e9",
              borderTop: "2px solid transparent",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
        ) : (
          // Inline SVG navigation arrow — no external asset needed
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={denied ? "#fff" : "#0ea5e9"}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
        )}
      </button>
      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

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

// ── Component ──────────────────────────────────────────────────────────────
export default function ListingsMap({ listings, onPress }: Props) {
  // Auto-center on the average listing location, fallback to a neutral US center
  const center = React.useMemo<[number, number]>(() => {
    if (listings.length === 0) return [39.8283, -98.5795];
    const lat = listings.reduce((s, l) => s + l.latitude, 0) / listings.length;
    const lng = listings.reduce((s, l) => s + l.longitude, 0) / listings.length;
    return [lat, lng];
  }, [listings]);

  return (
    <View style={{ flex: 1 }}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        {/* OpenStreetMap tiles — free, no API key */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* "Go to my location" button — uses useMap() so must be inside MapContainer */}
        <LocateButton />

        {listings.map((listing) => (
          <Marker
            key={listing.id}
            position={[listing.latitude, listing.longitude]}
            icon={makePriceIcon(listing.rent_monthly)}
          >
            <Popup maxWidth={220} closeButton={false}>
              <div style={{ fontFamily: "system-ui, sans-serif", minWidth: 190 }}>
                <strong
                  style={{
                    fontSize: 13,
                    display: "block",
                    color: "#0f172a",
                    marginBottom: 2,
                    lineHeight: "1.3",
                  }}
                >
                  {listing.title}
                </strong>
                <span
                  style={{
                    color: "#0ea5e9",
                    fontWeight: 700,
                    fontSize: 15,
                    display: "block",
                  }}
                >
                  ${Math.round(listing.rent_monthly / 100).toLocaleString()}/mo
                </span>
                <span
                  style={{
                    color: "#64748b",
                    fontSize: 11,
                    display: "block",
                    marginBottom: 10,
                  }}
                >
                  {listing.city}, {listing.state}
                </span>
                <button
                  onClick={() => onPress(listing.id)}
                  style={{
                    background: "#0ea5e9",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "7px 0",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    width: "100%",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  View Listing →
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </View>
  );
}
