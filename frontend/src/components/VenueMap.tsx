"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef } from "react";

type LatLng = { lat: number; lng: number };
type VenuePin = LatLng & { id: number; name: string; address: string };

export default function VenueMap({
  midpoint,
  venues,
}: {
  midpoint: LatLng;
  venues: VenuePin[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const venueKey = venues.map((v) => `${v.id}:${v.lat},${v.lng}`).join("|");

  useEffect(() => {
    let cancelled = false;
    let mapInstance: import("leaflet").Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown };
      delete proto._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      });
      mapInstance = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const midIcon = L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#a8c773;border:3px solid #070807;box-shadow:0 0 0 2px rgba(168,199,115,0.5)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([midpoint.lat, midpoint.lng], { icon: midIcon })
        .addTo(map)
        .bindPopup("Midpoint");

      const venueIcon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#070807;border:2px solid #c3d79b"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const allLatLngs: [number, number][] = [[midpoint.lat, midpoint.lng]];
      for (const v of venues) {
        L.marker([v.lat, v.lng], { icon: venueIcon })
          .addTo(map)
          .bindPopup(`<strong>${escapeHtml(v.name)}</strong><br>${escapeHtml(v.address)}`);
        allLatLngs.push([v.lat, v.lng]);
      }

      if (allLatLngs.length === 1) {
        map.setView(allLatLngs[0], 14);
      } else {
        map.fitBounds(L.latLngBounds(allLatLngs), { padding: [40, 40], maxZoom: 16 });
      }
    })();

    return () => {
      cancelled = true;
      if (mapInstance) mapInstance.remove();
    };
  }, [midpoint.lat, midpoint.lng, venueKey]);

  return (
    <div
      ref={containerRef}
      className="h-[440px] w-full overflow-hidden rounded-2xl border border-white/10"
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
