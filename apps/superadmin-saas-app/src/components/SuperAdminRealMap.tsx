import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface RealMapBranch {
  id: string;
  name: string;
  city: string;
  state: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  todayRevenue: number;
  orders: number;
  tables: string;
  rooms: string;
  occupancy?: number;
  latitude?: number;
  longitude?: number;
  street?: string;
  pincode?: string;
  country?: string;
  googleMapUrl?: string;
  locationNotes?: string;
}

interface SuperAdminRealMapProps {
  branches: RealMapBranch[];
  selectedBranch: RealMapBranch | null;
  onSelectBranch: (branch: RealMapBranch) => void;
  theme?: 'dark' | 'light';
  onLocationPick?: (lat: number, lng: number) => void;
  onEditLocation?: (branch: RealMapBranch) => void;
}

const CITY_COORDINATES: Record<string, [number, number]> = {
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  'new delhi': [28.6139, 77.209],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  pune: [18.5204, 73.8567],
  jaipur: [26.9124, 75.7873],
  udaipur: [24.5854, 73.7125],
  jodhpur: [26.2389, 73.0243],
  goa: [15.2993, 74.124],
  panaji: [15.4909, 73.8278],
  ahmedabad: [23.0225, 72.5714],
  kochi: [9.9312, 76.2673],
  shimla: [31.1048, 77.1734],
  agra: [27.1767, 78.0081],
  varanasi: [25.3176, 82.9739],
  chandigarh: [30.7333, 76.7794],
  amritsar: [31.634, 74.8723],
  bhopal: [23.2599, 77.4126],
  indore: [22.7196, 75.8577],
  lucknow: [26.8467, 80.9462],
  surat: [21.1702, 72.8311],
  patna: [25.5941, 85.1376],
  nagpur: [21.1458, 79.0882],
  coimbatore: [11.0168, 76.9558],
  mysore: [12.2958, 76.6394],
  manali: [32.2432, 77.1892],
  rishikesh: [30.0869, 78.2676],
  dehradun: [30.3165, 78.0322],
  ooty: [11.4102, 76.695],
};

function resolveCoordinates(branch: RealMapBranch, index: number): [number, number] {
  if (
    typeof branch.latitude === 'number' &&
    !isNaN(branch.latitude) &&
    typeof branch.longitude === 'number' &&
    !isNaN(branch.longitude) &&
    (branch.latitude !== 0 || branch.longitude !== 0)
  ) {
    return [branch.latitude, branch.longitude];
  }
  const key = (branch.city || '').trim().toLowerCase();
  if (CITY_COORDINATES[key]) {
    // Add micro jitter if multiple hotels are in the same city
    const jitterLat = ((index % 5) - 2) * 0.015;
    const jitterLng = (((index * 3) % 5) - 2) * 0.015;
    return [CITY_COORDINATES[key][0] + jitterLat, CITY_COORDINATES[key][1] + jitterLng];
  }
  // Deterministic distributed India locations fallback
  const fallbackSpots: [number, number][] = [
    [19.076, 72.8777], // Mumbai
    [28.6139, 77.209],  // Delhi
    [12.9716, 77.5946], // Bengaluru
    [26.9124, 75.7873], // Jaipur
    [15.2993, 74.124],  // Goa
    [22.5726, 88.3639], // Kolkata
    [17.385, 78.4867],  // Hyderabad
    [23.0225, 72.5714], // Ahmedabad
  ];
  return fallbackSpots[index % fallbackSpots.length];
}

export const SuperAdminRealMap: React.FC<SuperAdminRealMapProps> = ({
  branches,
  selectedBranch,
  onSelectBranch,
  theme = 'dark',
  onLocationPick,
  onEditLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [activeCityJump, setActiveCityJump] = useState<string>('ALL');

  // Tile layer URLs: Genuine Google Maps tile streams + OSM fallback
  const STREETS_TILE = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
  const SATELLITE_TILE = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = 20.5937;
    const initialLng = 78.9629;
    const initialZoom = 5;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true,
    });

    // Add Tile Layer
    const tileUrl = mapType === 'satellite' ? SATELLITE_TILE : STREETS_TILE;
    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps &bull; SpiceHub Intelligence',
    }).addTo(map);

    tileLayerRef.current = tiles;
    mapInstanceRef.current = map;

    // Click handler for location picking
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onLocationPick) {
        onLocationPick(e.latlng.lat, e.latlng.lng);
      }
    });

    // Invalidate size to ensure proper rendering inside flex/grid container
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Map Type Switch (Streets vs Satellite)
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const nextUrl = mapType === 'satellite' ? SATELLITE_TILE : STREETS_TILE;
    tileLayerRef.current.setUrl(nextUrl);
  }, [mapType]);

  // Update Markers when branches or selectedBranch changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    branches.forEach((branch, index) => {
      const coords = resolveCoordinates(branch, index);
      const isSelected = selectedBranch?.id === branch.id;
      const isOnline = branch.status === 'ONLINE';

      // Create Google Maps style custom marker pin
      const markerHtml = `
        <div class="relative group cursor-pointer" style="transform: translate(-50%, -100%);">
          <!-- Live Glow for Online -->
          ${
            isOnline
              ? '<span class="absolute -top-1 -left-1 inline-flex h-9 w-9 rounded-full bg-emerald-500 opacity-40 animate-ping"></span>'
              : ''
          }
          <!-- Google Maps Teardrop Pin -->
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            isSelected
              ? 'bg-amber-500 border-white shadow-lg shadow-amber-500/60 scale-125 z-50'
              : isOnline
              ? 'bg-emerald-600 border-white shadow-md shadow-emerald-900/50 hover:scale-110'
              : 'bg-red-600 border-white shadow-md shadow-sm hover:scale-110'
          } transition-transform duration-200">
            <span class="text-xs font-black text-white">${isOnline ? '🏨' : '🔒'}</span>
          </div>
          <!-- Label pill -->
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/90 text-[10px] font-bold text-white shadow border border-white/10 pointer-events-none">
            ${branch.name.length > 14 ? branch.name.slice(0, 14) + '...' : branch.name}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-google-pin',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker(coords, { icon: customIcon }).addTo(map);

      // Tooltip with real address & coordinates
      const addressLine = [branch.street, branch.city, branch.state, branch.pincode].filter(Boolean).join(', ');
      marker.bindTooltip(
        `<div class="p-1 font-sans">
          <p class="font-bold text-xs text-white">${branch.name}</p>
          <p class="text-[10px] text-slate-300">${addressLine || branch.city + ', ' + branch.state}</p>
          <p class="text-[10px] font-mono text-amber-300">📍 ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}</p>
          <p class="text-[10px] text-slate-400 mt-0.5"><span class="${
          isOnline ? 'text-emerald-400 font-bold' : 'text-red-400'
        }">${branch.status}</span> &bull; Rev: ₹${branch.todayRevenue.toLocaleString('en-IN')}</p>
        </div>`,
        { direction: 'top', offset: [0, -32], opacity: 0.95 }
      );

      marker.on('click', () => {
        onSelectBranch(branch);
        map.flyTo(coords, Math.max(map.getZoom(), 8), { duration: 1 });
      });

      markersRef.current[branch.id] = marker;
    });
  }, [branches, selectedBranch]);

  // Center on selected branch
  useEffect(() => {
    if (!selectedBranch || !mapInstanceRef.current) return;
    const branchIndex = branches.findIndex((b) => b.id === selectedBranch.id);
    if (branchIndex >= 0) {
      const coords = resolveCoordinates(selectedBranch, branchIndex);
      mapInstanceRef.current.flyTo(coords, Math.max(mapInstanceRef.current.getZoom(), 7), {
        duration: 0.8,
      });
    }
  }, [selectedBranch?.id]);

  // City Jump Helper
  const jumpToCity = (cityName: string, coords?: [number, number], zoom = 11) => {
    setActiveCityJump(cityName);
    if (!mapInstanceRef.current) return;
    if (cityName === 'ALL') {
      mapInstanceRef.current.flyTo([20.5937, 78.9629], 5, { duration: 1 });
      return;
    }
    if (coords) {
      mapInstanceRef.current.flyTo(coords, zoom, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-slate-700/60 shadow-inner">
      {/* Top Controls Bar (Google Maps Style) */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2">
        {/* Layer Switcher (Streets vs Satellite) */}
        <div className="flex items-center rounded-lg bg-slate-900/90 backdrop-blur-md p-1 border border-slate-700/80 shadow-lg text-xs font-bold text-white">
          <button
            type="button"
            onClick={() => setMapType('streets')}
            className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
              mapType === 'streets' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>🗺️</span>
            <span>Google Streets</span>
          </button>
          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
              mapType === 'satellite' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>🛰️</span>
            <span>Satellite</span>
          </button>
        </div>

        {/* City Quick Jumper */}
        <div className="hidden sm:flex items-center rounded-lg bg-slate-900/90 backdrop-blur-md p-1 border border-slate-700/80 shadow-lg text-[11px] font-bold text-slate-300 gap-1">
          <button
            type="button"
            onClick={() => jumpToCity('ALL')}
            className={`px-2 py-0.5 rounded transition ${
              activeCityJump === 'ALL' ? 'bg-slate-700 text-white' : 'hover:text-white'
            }`}
          >
            India View
          </button>
          <button
            type="button"
            onClick={() => jumpToCity('Mumbai', CITY_COORDINATES.mumbai)}
            className={`px-2 py-0.5 rounded transition ${
              activeCityJump === 'Mumbai' ? 'bg-slate-700 text-white' : 'hover:text-white'
            }`}
          >
            Mumbai
          </button>
          <button
            type="button"
            onClick={() => jumpToCity('Delhi', CITY_COORDINATES.delhi)}
            className={`px-2 py-0.5 rounded transition ${
              activeCityJump === 'Delhi' ? 'bg-slate-700 text-white' : 'hover:text-white'
            }`}
          >
            Delhi
          </button>
          <button
            type="button"
            onClick={() => jumpToCity('Bengaluru', CITY_COORDINATES.bengaluru)}
            className={`px-2 py-0.5 rounded transition ${
              activeCityJump === 'Bengaluru' ? 'bg-slate-700 text-white' : 'hover:text-white'
            }`}
          >
            Bengaluru
          </button>
          <button
            type="button"
            onClick={() => jumpToCity('Jaipur', CITY_COORDINATES.jaipur)}
            className={`px-2 py-0.5 rounded transition ${
              activeCityJump === 'Jaipur' ? 'bg-slate-700 text-white' : 'hover:text-white'
            }`}
          >
            Jaipur
          </button>
          <button
            type="button"
            onClick={() => jumpToCity('Goa', CITY_COORDINATES.goa)}
            className={`px-2 py-0.5 rounded transition ${
              activeCityJump === 'Goa' ? 'bg-slate-700 text-white' : 'hover:text-white'
            }`}
          >
            Goa
          </button>
        </div>
      </div>

      {/* Zoom Buttons (Bottom Right, Google Maps Style) */}
      <div className="absolute bottom-5 right-3 z-[1000] flex flex-col rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg overflow-hidden">
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-8 h-8 flex items-center justify-center text-white hover:bg-slate-800 text-base font-black transition border-b border-slate-700/60"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-8 h-8 flex items-center justify-center text-white hover:bg-slate-800 text-base font-black transition"
          title="Zoom Out"
        >
          &minus;
        </button>
      </div>

      {/* Floating Real Hotel Details Card (Bottom-Left) */}
      {selectedBranch && (
        <div className="absolute bottom-3 left-3 z-[1000] max-w-sm w-[90%] sm:w-80 bg-slate-900/95 backdrop-blur-md rounded-xl p-3 border border-slate-700/80 shadow-sm dark:shadow-none text-xs text-white animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🏨</span>
                <h4 className="font-bold text-sm text-white truncate">{selectedBranch.name}</h4>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                {selectedBranch.street ? `${selectedBranch.street}, ` : ''}
                {selectedBranch.city}, {selectedBranch.state}
                {selectedBranch.pincode ? ` - ${selectedBranch.pincode}` : ''}
              </p>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                selectedBranch.status === 'ONLINE'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
              }`}
            >
              {selectedBranch.status}
            </span>
          </div>

          {/* Coordinates and Revenue */}
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono text-amber-300 flex items-center gap-1">
              <span>📍</span>
              <span>
                {selectedBranch.latitude && selectedBranch.longitude
                  ? `${selectedBranch.latitude.toFixed(5)}, ${selectedBranch.longitude.toFixed(5)}`
                  : 'Default India Map'}
              </span>
            </span>
            <span className="font-semibold text-emerald-400">
              ₹{selectedBranch.todayRevenue.toLocaleString('en-IN')} rev
            </span>
          </div>

          {/* Actions: Open in Google Maps & Edit Pin */}
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-1.5">
            <a
              href={
                selectedBranch.googleMapUrl ||
                `https://www.google.com/maps/search/?api=1&query=${selectedBranch.latitude || 26.9124},${selectedBranch.longitude || 75.7873}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-[11px] flex items-center justify-center gap-1.5 transition shadow"
            >
              <span>🌐</span>
              <span>Google Maps ↗</span>
            </a>
            {onEditLocation && (
              <button
                type="button"
                onClick={() => onEditLocation(selectedBranch)}
                className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1 transition border border-slate-700"
                title="Edit Exact GPS Coordinates & Address"
              >
                <span>✏️</span>
                <span>Edit Pin</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Leaflet Map DOM Node */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
};
export default SuperAdminRealMap;
