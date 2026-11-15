import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Map as MapIcon,
  Globe,
  Building2,
  MapPin,
  ExternalLink,
  Edit3,
  Search,
  Crosshair,
  Layers,
  CheckCircle2,
  XCircle,
  X,
  ChevronRight,
  ChevronLeft,
  BedDouble,
  UtensilsCrossed,
  SlidersHorizontal,
} from 'lucide-react';
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
  heightClass?: string;
}

const CITY_COORDINATES: Record<string, [number, number]> = {
  jaipur: [26.9124, 75.7873],
  sikar: [27.6094, 75.1398],
  ranoli: [27.4682, 75.2536],
  udaipur: [24.5854, 73.7125],
  jodhpur: [26.2389, 73.0243],
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  'new delhi': [28.6139, 77.209],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  pune: [18.5204, 73.8567],
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

const FALLBACK_SPOTS: [number, number][] = [
  [26.9124, 75.7873], // Jaipur
  [27.6094, 75.1398], // Sikar
  [24.5854, 73.7125], // Udaipur
  [28.6139, 77.209],  // Delhi
  [19.076, 72.8777],  // Mumbai
  [12.9716, 77.5946], // Bengaluru
  [15.2993, 74.124],  // Goa
  [22.5726, 88.3639], // Kolkata
];

/**
 * Disperse coordinates for hotels sharing the exact same lat/lng (e.g. default Jaipur coords)
 * so every single hotel has its own distinct, non-overlapping marker on the map.
 */
function buildDispersedCoordinates(branches: RealMapBranch[]): Map<string, [number, number]> {
  const coordMap = new Map<string, [number, number]>();

  // 1. Resolve raw base coordinate
  const baseList = branches.map((branch, index) => {
    let lat: number | undefined =
      typeof branch.latitude === 'number' && !isNaN(branch.latitude) && branch.latitude !== 0
        ? branch.latitude
        : undefined;
    let lng: number | undefined =
      typeof branch.longitude === 'number' && !isNaN(branch.longitude) && branch.longitude !== 0
        ? branch.longitude
        : undefined;

    if (lat === undefined || lng === undefined) {
      const cityKey = (branch.city || '').trim().toLowerCase();
      if (CITY_COORDINATES[cityKey]) {
        [lat, lng] = CITY_COORDINATES[cityKey];
      } else {
        const spot = FALLBACK_SPOTS[index % FALLBACK_SPOTS.length];
        [lat, lng] = spot;
      }
    }
    return { branch, baseLat: lat, baseLng: lng };
  });

  // 2. Group by rounded coordinate (within ~100m)
  const groups: { [key: string]: typeof baseList } = {};
  baseList.forEach((item) => {
    const key = `${item.baseLat.toFixed(3)},${item.baseLng.toFixed(3)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  // 3. For clusters with multiple hotels, apply golden-ratio spiral distribution
  Object.values(groups).forEach((group) => {
    if (group.length === 1) {
      coordMap.set(group[0].branch.id, [group[0].baseLat, group[0].baseLng]);
    } else {
      const goldenAngle = 2.399963229728653; // radians (~137.5 degrees)
      group.forEach((item, k) => {
        if (k === 0) {
          coordMap.set(item.branch.id, [item.baseLat, item.baseLng]);
        } else {
          // Generous radial dispersion (~2km to 5km) so all hotel pins and labels are clearly separated and visible
          const radius = 0.024 * Math.sqrt(k);
          const angle = k * goldenAngle;
          const latOffset = radius * Math.cos(angle);
          const lngOffset = (radius * Math.sin(angle)) / Math.cos((item.baseLat * Math.PI) / 180);
          coordMap.set(item.branch.id, [
            Number((item.baseLat + latOffset).toFixed(6)),
            Number((item.baseLng + lngOffset).toFixed(6)),
          ]);
        }
      });
    }
  });

  return coordMap;
}

export const SuperAdminRealMap: React.FC<SuperAdminRealMapProps> = ({
  branches,
  selectedBranch,
  onSelectBranch,
  theme = 'light',
  onLocationPick,
  onEditLocation,
  heightClass = 'h-[540px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  const [mapType, setMapType] = useState<'streets' | 'satellite' | 'terrain'>('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [showDirectorySidebar, setShowDirectorySidebar] = useState(true);

  // Reliable, high-performance Google Maps tile streams (no API key required, zero watermarks)
  const TILES = {
    streets: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    satellite: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    terrain: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
  };

  // Compute dispersed non-overlapping coordinates for all current branches
  const coordinatesMap = useMemo(() => buildDispersedCoordinates(branches), [branches]);

  // Unique cities list for quick pills
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    branches.forEach((b) => {
      const c = (b.city || '').trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [branches]);

  // Filter branches for sidebar directory
  const filteredDirectoryBranches = useMemo(() => {
    return branches.filter((b) => {
      if (cityFilter !== 'ALL' && (b.city || '').trim().toLowerCase() !== cityFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = b.name.toLowerCase().includes(query);
        const matchesCity = (b.city || '').toLowerCase().includes(query);
        const matchesState = (b.state || '').toLowerCase().includes(query);
        return matchesName || matchesCity || matchesState;
      }
      return true;
    });
  }, [branches, cityFilter, searchQuery]);

  // Helper to fit map bounds to all visible markers at once
  const fitAllMarkers = (instant = false) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.invalidateSize();
    const coordsList = branches
      .map((b) => coordinatesMap.get(b.id))
      .filter(Boolean) as [number, number][];

    if (coordsList.length > 0) {
      const bounds = L.latLngBounds(coordsList);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [35, 35],
          maxZoom: 10,
          animate: !instant,
        });
      }
    } else {
      map.setView([27.2, 75.5], 9);
    }
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Rajasthan (Jaipur) by default
    const map = L.map(mapContainerRef.current, {
      center: [26.9124, 75.7873],
      zoom: 9,
      zoomControl: false,
      attributionControl: true,
    });

    const initialTileUrl = TILES[mapType];
    const tiles = L.tileLayer(initialTileUrl, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps &bull; SpiceHub Intelligence',
    }).addTo(map);

    tileLayerRef.current = tiles;
    mapInstanceRef.current = map;

    // Location Pick listener
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onLocationPick) {
        onLocationPick(e.latlng.lat, e.latlng.lng);
      }
    });

    // ResizeObserver ensures Leaflet never renders grey/distorted tiles when layout recalculates
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Switch Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(TILES[mapType]);
  }, [mapType]);

  // 3. Render Markers & Automatically Fit Bounds to show ALL hotels
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    branches.forEach((branch) => {
      const coords = coordinatesMap.get(branch.id);
      if (!coords) return;

      const isSelected = selectedBranch?.id === branch.id;
      const isOnline = branch.status === 'ONLINE';

      // Clean SVG pin with proper anchor point
      const pinHtml = `
        <div class="relative group cursor-pointer flex flex-col items-center">
          <!-- Live Glow Radar on Online properties -->
          ${
            isOnline
              ? '<span class="absolute top-1 inline-flex h-9 w-9 rounded-full bg-emerald-500 opacity-35 animate-ping"></span>'
              : ''
          }
          <!-- Teardrop Pin -->
          <div class="relative flex items-center justify-center w-9 h-9 rounded-full border-2 ${
            isSelected
              ? 'bg-amber-500 border-white shadow-xl shadow-amber-500/60 scale-125 z-50 ring-4 ring-amber-400/30'
              : isOnline
              ? 'bg-emerald-600 border-white shadow-md shadow-emerald-900/40 hover:scale-115'
              : 'bg-rose-600 border-white shadow-md shadow-rose-900/40 hover:scale-115'
          } transition-all duration-200">
            ${
              isSelected
                ? '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>'
                : isOnline
                ? '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>'
                : '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728"/></svg>'
            }
          </div>
          <!-- Pin pointer needle tip -->
          <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] ${
            isSelected ? 'border-t-amber-500' : isOnline ? 'border-t-emerald-600' : 'border-t-rose-600'
          } -mt-0.5 shadow-xs"></div>
          <!-- Hotel Name Badge Pill -->
          <div class="mt-0.5 whitespace-nowrap px-1.5 py-0.5 rounded-md bg-white/95 text-[10px] font-bold text-slate-800 shadow-md border border-slate-200/90 pointer-events-none truncate max-w-[130px]">
            ${branch.name}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'spicehub-map-marker',
        html: pinHtml,
        iconSize: [36, 46],
        iconAnchor: [18, 44],
      });

      const marker = L.marker(coords, { icon, zIndexOffset: isSelected ? 1000 : 100 }).addTo(map);

      // Tooltip with property metrics
      const addressLine = [branch.street, branch.city, branch.state, branch.pincode].filter(Boolean).join(', ');
      marker.bindTooltip(
        `<div class="p-1 font-sans text-left">
          <div class="flex items-center gap-1.5 font-bold text-xs text-white">
            <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'}"></span>
            <span>${branch.name}</span>
          </div>
          <p class="text-[10px] text-slate-300 mt-0.5">${addressLine || branch.city + ', ' + branch.state}</p>
          <div class="flex items-center gap-2 mt-1 pt-1 border-t border-slate-700/60 text-[10px] text-slate-300">
            <span>${branch.rooms || 'Rooms'}</span>
            <span>&bull;</span>
            <span class="text-emerald-400 font-semibold font-mono">₹${Number(branch.todayRevenue || 0).toLocaleString('en-IN')} rev</span>
          </div>
        </div>`,
        { direction: 'top', offset: [0, -44], opacity: 0.96 }
      );

      marker.on('click', () => {
        onSelectBranch(branch);
        map.flyTo(coords, Math.max(map.getZoom(), 12), { duration: 0.8 });
      });

      markersRef.current[branch.id] = marker;
    });

    // Auto-fit bounds so all hotel pins are immediately visible on screen if no specific branch is focused
    if (!selectedBranch) {
      fitAllMarkers();
    }
  }, [branches, coordinatesMap, selectedBranch?.id]);

  // 4. Center on selected branch
  useEffect(() => {
    if (!selectedBranch || !mapInstanceRef.current) return;
    const coords = coordinatesMap.get(selectedBranch.id);
    if (coords) {
      mapInstanceRef.current.flyTo(coords, Math.max(mapInstanceRef.current.getZoom(), 12), {
        duration: 0.8,
      });
    }
  }, [selectedBranch?.id, coordinatesMap]);

  return (
    <div
      className={`relative isolate z-0 w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-50 flex flex-col`}
    >
      {/* TOP HEADER CONTROLS BAR */}
      <div className="z-10 px-4 py-2.5 bg-white/95 backdrop-blur-md border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Title & Quick Stats */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 leading-none">Hotel Properties Geolocation</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                {branches.length} Properties
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
              {branches.filter((b) => b.status === 'ONLINE').length} Online &bull;{' '}
              {branches.filter((b) => b.status === 'OFFLINE').length} Offline &bull; Across{' '}
              {availableCities.length || 1} Cities
            </p>
          </div>
        </div>

        {/* Center / Right: Layer Switcher & Tools */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Quick Fit All */}
          <button
            type="button"
            onClick={() => {
              if (onSelectBranch) onSelectBranch(null as any);
              fitAllMarkers();
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-2xs flex items-center gap-1.5 transition"
            title="Fit All Properties in View"
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Fit All</span>
          </button>

          {/* Map Layer Switcher */}
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMapType('streets')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                mapType === 'streets'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Maps</span>
            </button>
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                mapType === 'satellite'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              <span>Satellite</span>
            </button>
            <button
              type="button"
              onClick={() => setMapType('terrain')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                mapType === 'terrain'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Terrain</span>
            </button>
          </div>

          {/* Toggle Directory Sidebar */}
          <button
            type="button"
            onClick={() => setShowDirectorySidebar((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              showDirectorySidebar
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hotels List ({filteredDirectoryBranches.length})</span>
          </button>
        </div>
      </div>

      {/* CITY QUICK JUMPER BAR */}
      <div className="px-4 py-1.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          City Jump:
        </span>
        <button
          type="button"
          onClick={() => {
            setCityFilter('ALL');
            if (onSelectBranch) onSelectBranch(null as any);
            fitAllMarkers();
          }}
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 transition ${
            cityFilter === 'ALL'
              ? 'bg-[#15803d] text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          All India ({branches.length})
        </button>
        {availableCities.map((city) => {
          const count = branches.filter((b) => (b.city || '').trim().toLowerCase() === city.toLowerCase()).length;
          return (
            <button
              key={city}
              type="button"
              onClick={() => {
                setCityFilter(city);
                const cityBranches = branches.filter(
                  (b) => (b.city || '').trim().toLowerCase() === city.toLowerCase()
                );
                const coordsList = cityBranches
                  .map((b) => coordinatesMap.get(b.id))
                  .filter(Boolean) as [number, number][];
                if (coordsList.length > 0 && mapInstanceRef.current) {
                  const bounds = L.latLngBounds(coordsList);
                  mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true });
                }
              }}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 transition ${
                cityFilter.toLowerCase() === city.toLowerCase()
                  ? 'bg-[#15803d] text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {city} ({count})
            </button>
          );
        })}
      </div>

      {/* MAIN BODY: MAP CANVAS + INTEGRATED HOTEL DIRECTORY SIDEBAR */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col lg:flex-row overflow-hidden">
        {/* LEAFLET MAP CONTAINER */}
        <div className="relative flex-1 min-w-0 h-full min-h-[360px] flex flex-col overflow-hidden">
          {/* Zoom Buttons (Google Maps Style) */}
          <div className="absolute bottom-5 right-4 z-20 flex flex-col rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md overflow-hidden text-slate-700">
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomIn()}
              className="w-9 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-100 text-lg font-bold transition border-b border-slate-200"
              title="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomOut()}
              className="w-9 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-100 text-lg font-bold transition"
              title="Zoom Out"
            >
              &minus;
            </button>
          </div>

          {/* Floating Selected Hotel Card (Bottom Left of Map) */}
          {selectedBranch && (
            <div className="absolute bottom-4 left-4 z-20 max-w-sm w-[90%] sm:w-84 bg-white/98 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-xl text-xs text-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <h4 className="font-bold text-sm text-slate-900 truncate">{selectedBranch.name}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {selectedBranch.street ? `${selectedBranch.street}, ` : ''}
                    {selectedBranch.city}, {selectedBranch.state}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectBranch(null as any)}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Badges Row */}
              <div className="flex items-center gap-2 mt-2.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                    selectedBranch.status === 'ONLINE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedBranch.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  ></span>
                  <span>{selectedBranch.status}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {selectedBranch.rooms || 'Rooms'}
                </span>
                <span className="font-mono text-emerald-700 font-bold ml-auto text-xs">
                  ₹{Number(selectedBranch.todayRevenue || 0).toLocaleString('en-IN')} rev
                </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                <a
                  href={
                    selectedBranch.googleMapUrl ||
                    `https://www.google.com/maps/search/?api=1&query=${selectedBranch.latitude || 26.9124},${selectedBranch.longitude || 75.7873}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Maps</span>
                </a>
                {onEditLocation && (
                  <button
                    type="button"
                    onClick={() => onEditLocation(selectedBranch)}
                    className="py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Edit GPS</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Leaflet DOM Anchor with Guaranteed Sizing */}
          <div
            ref={mapContainerRef}
            className="w-full h-full flex-1 min-h-[360px] min-w-0 z-0"
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* INTEGRATED HOTEL DIRECTORY SIDEBAR with Explicit 320px Width */}
        {showDirectorySidebar && (
          <div className="w-full lg:w-[320px] lg:min-w-[320px] lg:max-w-[320px] h-64 lg:h-full border-t lg:border-t-0 lg:border-l border-slate-200/90 bg-white flex flex-col z-10 shrink-0">
            {/* Sidebar Search */}
            <div className="p-3 border-b border-slate-200/80 bg-slate-50/70">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search hotel or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-0.5">
                <span>Showing {filteredDirectoryBranches.length} properties</span>
                <span className="font-semibold text-emerald-700">
                  {filteredDirectoryBranches.filter((b) => b.status === 'ONLINE').length} active
                </span>
              </div>
            </div>

            {/* Scrollable Hotel Cards List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1 no-scrollbar">
              {filteredDirectoryBranches.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No hotel properties found matching your filter.
                </div>
              ) : (
                filteredDirectoryBranches.map((branch) => {
                  const isSelected = selectedBranch?.id === branch.id;
                  const isOnline = branch.status === 'ONLINE';
                  return (
                    <div
                      key={branch.id}
                      onClick={() => {
                        onSelectBranch(branch);
                        const coords = coordinatesMap.get(branch.id);
                        if (coords && mapInstanceRef.current) {
                          mapInstanceRef.current.flyTo(coords, 14, { duration: 0.9 });
                        }
                      }}
                      className={`p-3 rounded-xl transition cursor-pointer flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-amber-50/80 border border-amber-300/80 shadow-2xs'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          ></span>
                          <h5
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-amber-950' : 'text-slate-900'
                            }`}
                          >
                            {branch.name}
                          </h5>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate pl-3.5">
                          {branch.city}, {branch.state || 'India'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 pl-3.5 text-[10px] text-slate-400">
                          <span>{branch.rooms || 'Rooms'}</span>
                          <span>&bull;</span>
                          <span className="font-mono font-semibold text-emerald-600">
                            ₹{Number(branch.todayRevenue || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 shrink-0 transition ${
                          isSelected ? 'text-amber-600 translate-x-0.5' : 'text-slate-300'
                        }`}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminRealMap;
