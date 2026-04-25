"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef } from "react";

type LatLng = { lat: number; lng: number };
type LabeledPoint = LatLng & { label: string };
type VenuePin = LatLng & { id: number; name: string; address: string };

export default function VenueMap({
  midpoint,
  venues,
  self,
  partner,
}: {
  midpoint: LatLng;
  venues: VenuePin[];
  self?: LabeledPoint;
  partner?: LabeledPoint;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const venueKey = venues.map((v) => `${v.id}:${v.lat},${v.lng}`).join("|");
  const selfKey = self ? `${self.lat},${self.lng}|${self.label}` : "";
  const partnerKey = partner ? `${partner.lat},${partner.lng}|${partner.label}` : "";

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

      // Midpoint pin (matcha)
      L.marker([midpoint.lat, midpoint.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:18px;height:18px;border-radius:50%;background:#a8c773;border:3px solid #070807;box-shadow:0 0 0 2px rgba(168,199,115,0.5)"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(map);

      // Venue pins
      const venueIcon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#070807;border:2px solid #c3d79b"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      for (const v of venues) {
        L.marker([v.lat, v.lng], { icon: venueIcon })
          .addTo(map)
          .bindPopup(`<strong>${escapeHtml(v.name)}</strong><br>${escapeHtml(v.address)}`);
      }

      // Self pin (blue) with label
      if (self) {
        L.marker([self.lat, self.lng], {
          icon: makeLabeledIcon(L, "#5aa9ff", self.label),
          zIndexOffset: 1000,
        }).addTo(map);
      }

      // Partner pin (pink) with label
      if (partner) {
        L.marker([partner.lat, partner.lng], {
          icon: makeLabeledIcon(L, "#f06bb1", partner.label),
          zIndexOffset: 1000,
        }).addTo(map);
      }

      // Fit
      const all: [number, number][] = [[midpoint.lat, midpoint.lng]];
      for (const v of venues) all.push([v.lat, v.lng]);
      if (self) all.push([self.lat, self.lng]);
      if (partner) all.push([partner.lat, partner.lng]);
      if (all.length === 1) {
        map.setView(all[0], 14);
      } else {
        map.fitBounds(L.latLngBounds(all), { padding: [50, 50], maxZoom: 15 });
      }
    })();

    return () => {
      cancelled = true;
      if (mapInstance) mapInstance.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midpoint.lat, midpoint.lng, venueKey, selfKey, partnerKey]);

  return (
    <div
      ref={containerRef}
      className="h-[440px] w-full overflow-hidden rounded-2xl border border-white/10"
    />
  );
}

function makeLabeledIcon(
  L: typeof import("leaflet"),
  hex: string,
  label: string,
): import("leaflet").DivIcon {
  const safe = escapeHtml(label);
  // Label sits above the dot (translateY -28). Anchor centred on dot bottom.
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <span style="
          position:absolute;
          top:-26px;
          padding:2px 8px;
          border-radius:9999px;
          background:${hex};
          color:#070807;
          font-size:10px;
          font-weight:700;
          letter-spacing:0.06em;
          text-transform:uppercase;
          white-space:nowrap;
          box-shadow:0 4px 14px ${hex}55;
        ">${safe}</span>
        <span style="
          width:18px;height:18px;border-radius:50%;
          background:${hex};
          border:3px solid #070807;
          box-shadow:0 0 0 2px ${hex}66;
        "></span>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
