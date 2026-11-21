import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CloudRain, 
  Compass, 
  Eye, 
  ShieldCheck, 
  Sun, 
  Thermometer, 
  Wind, 
  AlertCircle,
  Truck,
  User,
  Scale,
  Navigation,
  Radio,
  MapPin,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface RouteMiniMapProps {
  origen: string;
  destino: string;
  idViaje?: string;
  variant?: 'saul' | 'chofer';
  driverName?: string;
  truckModel?: string;
  truckPlate?: string;
  pesaje?: string | number;
  estadoViaje?: string;
  departureDate?: string;
  saldoCritico?: boolean;
  onAuditTrip?: () => void;
}

interface CityNode {
  id: string;
  label: string;
  x: number;
  y: number;
  labelDx?: number;
  labelDy?: number;
  labelAnchor?: 'start' | 'middle' | 'end';
  matchKeys: string[];
  altitude: string;
  weather: string;
  temp: string;
  status: string;
  coords: string;
}

// Positioned inside the central safe-zone (viewBox 0 0 420 185) so corner glass widgets never occlude hubs or routes
const BOLIVIA_CITIES: CityNode[] = [
  { 
    id: 'lapaz', 
    label: 'La Paz', 
    x: 110, 
    y: 72, 
    labelDx: 0,
    labelDy: -10,
    labelAnchor: 'middle',
    matchKeys: ['la paz', 'lapaz', 'el alto'], 
    altitude: '3,640m', 
    weather: 'Lluvia Ligera', 
    temp: '9°C', 
    status: 'Peaje libre, sin demoras',
    coords: '16.5002° S, 68.1193° W'
  },
  { 
    id: 'oruro', 
    label: 'Oruro', 
    x: 132, 
    y: 114, 
    labelDx: -11,
    labelDy: 2.5,
    labelAnchor: 'end',
    matchKeys: ['oruro', 'or'], 
    altitude: '3,735m', 
    weather: 'Viento Helado', 
    temp: '6°C', 
    status: 'Nevada parcial en cumbre',
    coords: '17.9833° S, 67.1500° W'
  },
  { 
    id: 'potosi', 
    label: 'Potosí', 
    x: 184, 
    y: 146, 
    labelDx: 11,
    labelDy: 2.5,
    labelAnchor: 'start',
    matchKeys: ['potosí', 'potosi'], 
    altitude: '4,067m', 
    weather: 'Cielo Despejado', 
    temp: '4°C', 
    status: 'Control policial rutinario',
    coords: '19.5833° S, 65.7500° W'
  },
  { 
    id: 'cochabamba', 
    label: 'Cochabamba', 
    x: 230, 
    y: 88, 
    labelDx: 0,
    labelDy: -10,
    labelAnchor: 'middle',
    matchKeys: ['cochabamba', 'cbba', 'cocha'], 
    altitude: '2,558m', 
    weather: 'Templado', 
    temp: '18°C', 
    status: 'Doble vía expedita',
    coords: '17.3895° S, 66.1568° W'
  },
  { 
    id: 'santacruz', 
    label: 'Santa Cruz', 
    x: 336, 
    y: 102, 
    labelDx: 0,
    labelDy: -10,
    labelAnchor: 'middle',
    matchKeys: ['santa cruz', 'santacruz', 'scz'], 
    altitude: '416m', 
    weather: 'Húmedo, Despejado', 
    temp: '27°C', 
    status: 'Tránsito fluido, calor alto',
    coords: '17.7833° S, 63.1833° W'
  },
];

// Helper to strip accents/diacritics for reliable city matching
const normalizeText = (val: string | undefined): string =>
  String(val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// Helper to find matching node by string
const findCityNode = (cityName: string | undefined): CityNode | null => {
  if (!cityName) return null;
  const cleanName = normalizeText(cityName);
  return BOLIVIA_CITIES.find(city => 
    city.matchKeys.some(key => {
      const normKey = normalizeText(key);
      // Short 2-letter codes like 'or' must match whole word only
      if (normKey.length <= 2) {
        return new RegExp(`\\b${normKey}\\b`).test(cleanName);
      }
      return cleanName.includes(normKey);
    }) ||
    cleanName.includes(city.id)
  ) || null;
};

// Route information helper
const getRouteMetadata = (orig: string | undefined, dest: string | undefined) => {
  const o = normalizeText(orig);
  const d = normalizeText(dest);

  if ((o.includes('la paz') && d.includes('oruro')) || (o.includes('oruro') && d.includes('la paz'))) {
    return { dist: '~230 km', kmNum: 230, dur: '3h 40m ETA', msg: 'Tránsito por Doble Vía LP-OR', alert: 'Posible llovizna' };
  }
  if ((o.includes('la paz') && d.includes('cochabamba')) || (o.includes('cochabamba') && d.includes('la paz'))) {
    return { dist: '~380 km', kmNum: 380, dur: '6h 30m ETA', msg: 'Ruta Troncal Central (El Sillar)', alert: 'Precaución niebla' };
  }
  if ((o.includes('la paz') && d.includes('santa cruz')) || (o.includes('santa cruz') && d.includes('la paz'))) {
    return { dist: '~850 km', kmNum: 850, dur: '14h 20m ETA', msg: 'Ruta de Integración Oriental', alert: 'Control pesado activo' };
  }
  if ((o.includes('oruro') && d.includes('cochabamba')) || (o.includes('cochabamba') && d.includes('oruro'))) {
    return { dist: '~210 km', kmNum: 210, dur: '3h 50m ETA', msg: 'Carretera Interdepartamental', alert: 'Tránsito normal' };
  }
  if ((o.includes('oruro') && d.includes('potosi')) || (o.includes('potosi') && d.includes('oruro'))) {
    return { dist: '~310 km', kmNum: 310, dur: '5h 15m ETA', msg: 'Carretera Panamericana', alert: 'Vientos fuertes en altura' };
  }
  if ((o.includes('cochabamba') && d.includes('santa cruz')) || (o.includes('santa cruz') && d.includes('cochabamba'))) {
    return { dist: '~480 km', kmNum: 480, dur: '8h 45m ETA', msg: 'Carretera Al Oriente', alert: 'Sector El Sillar estable' };
  }
  return { dist: 'Variables', kmNum: 0, dur: 'En Ruta', msg: 'Ruta Logística Fletada', alert: 'Sincronización GPS activa' };
};

// Highway path curve mapping helper for realistic winding mountain roads (viewBox 420x185)
const getHighwayPath = (origin: CityNode, dest: CityNode): string => {
  const key = `${origin.id}_${dest.id}`;
  const paths: { [key: string]: string } = {
    // LP (110,72) <-> OR (132,114)
    lapaz_oruro: "M 110,72 C 115,82 120,87 125,96 C 129,103 130,108 132,114",
    oruro_lapaz: "M 132,114 C 130,108 129,103 125,96 C 120,87 115,82 110,72",

    // OR (132,114) <-> PT (184,146)
    oruro_potosi: "M 132,114 C 145,126 156,133 164,137 C 171,141 177,144 184,146",
    potosi_oruro: "M 184,146 C 177,144 171,141 164,137 C 156,133 145,126 132,114",

    // OR (132,114) <-> CB (230,88)
    oruro_cochabamba: "M 132,114 C 156,108 178,113 196,104 C 210,97 220,91 230,88",
    cochabamba_oruro: "M 230,88 C 220,91 210,97 196,104 C 178,113 156,108 132,114",

    // CB (230,88) <-> SC (336,102)
    cochabamba_santacruz: "M 230,88 C 258,100 270,79 290,92 C 308,104 322,96 336,102",
    santacruz_cochabamba: "M 336,102 C 322,96 308,104 290,92 C 270,79 258,100 230,88",

    // CB (230,88) <-> PT (184,146)
    cochabamba_potosi: "M 230,88 C 214,108 202,122 194,133 C 189,139 186,143 184,146",
    potosi_cochabamba: "M 184,146 C 186,143 189,139 194,133 C 202,122 214,108 230,88",

    // LP <-> CB (via Oruro)
    lapaz_cochabamba: "M 110,72 C 115,82 120,87 125,96 C 129,103 130,108 132,114 C 156,108 178,113 196,104 C 210,97 220,91 230,88",
    cochabamba_lapaz: "M 230,88 C 220,91 210,97 196,104 C 178,113 156,108 132,114 C 130,108 129,103 125,96 C 120,87 115,82 110,72",

    // LP <-> SC (via Oruro & Cochabamba)
    lapaz_santacruz: "M 110,72 C 115,82 120,87 125,96 C 129,103 130,108 132,114 C 156,108 178,113 196,104 C 210,97 220,91 230,88 C 258,100 270,79 290,92 C 308,104 322,96 336,102",
    santacruz_lapaz: "M 336,102 C 322,96 308,104 290,92 C 270,79 258,100 230,88 C 220,91 210,97 196,104 C 178,113 156,108 132,114 C 130,108 129,103 125,96 C 120,87 115,82 110,72",

    // LP <-> PT (via Oruro)
    lapaz_potosi: "M 110,72 C 115,82 120,87 125,96 C 129,103 130,108 132,114 C 145,126 156,133 164,137 C 171,141 177,144 184,146",
    potosi_lapaz: "M 184,146 C 177,144 171,141 164,137 C 156,133 145,126 132,114 C 130,108 129,103 125,96 C 120,87 115,82 110,72",

    // SC <-> OR (via Cochabamba)
    santacruz_oruro: "M 336,102 C 322,96 308,104 290,92 C 270,79 258,100 230,88 C 220,91 210,97 196,104 C 178,113 156,108 132,114",
    oruro_santacruz: "M 132,114 C 156,108 178,113 196,104 C 210,97 220,91 230,88 C 258,100 270,79 290,92 C 308,104 322,96 336,102",

    // SC <-> PT (via Cochabamba)
    santacruz_potosi: "M 336,102 C 322,96 308,104 290,92 C 270,79 258,100 230,88 C 214,108 202,122 194,133 C 189,139 186,143 184,146",
    potosi_santacruz: "M 184,146 C 186,143 189,139 194,133 C 202,122 214,108 230,88 C 258,100 270,79 290,92 C 308,104 322,96 336,102"
  };

  if (paths[key]) return paths[key];
  const mx = ((origin.x + dest.x) / 2).toFixed(1);
  const my = (((origin.y + dest.y) / 2) - 10).toFixed(1);
  return `M ${origin.x},${origin.y} Q ${mx},${my} ${dest.x},${dest.y}`;
};

const getWaypoints = (originId: string, destId: string): { x: number; y: number }[] => {
  const key = `${originId}_${destId}`;
  const waypointsMap: { [key: string]: { x: number; y: number }[] } = {
    lapaz_oruro: [{ x: 117, y: 84 }, { x: 124, y: 95 }, { x: 128, y: 105 }],
    oruro_lapaz: [{ x: 128, y: 105 }, { x: 124, y: 95 }, { x: 117, y: 84 }],
    
    oruro_potosi: [{ x: 146, y: 126 }, { x: 161, y: 135 }, { x: 173, y: 141 }],
    potosi_oruro: [{ x: 173, y: 141 }, { x: 161, y: 135 }, { x: 146, y: 126 }],
    
    oruro_cochabamba: [{ x: 156, y: 110 }, { x: 180, y: 109 }, { x: 204, y: 99 }],
    cochabamba_oruro: [{ x: 204, y: 99 }, { x: 180, y: 109 }, { x: 156, y: 110 }],
    
    cochabamba_santacruz: [{ x: 256, y: 92 }, { x: 280, y: 89 }, { x: 308, y: 98 }],
    santacruz_cochabamba: [{ x: 308, y: 98 }, { x: 280, y: 89 }, { x: 256, y: 92 }],
    
    cochabamba_potosi: [{ x: 213, y: 109 }, { x: 199, y: 126 }, { x: 190, y: 138 }],
    potosi_cochabamba: [{ x: 190, y: 138 }, { x: 199, y: 126 }, { x: 213, y: 109 }],
    
    lapaz_cochabamba: [{ x: 122, y: 91 }, { x: 132, y: 114 }, { x: 178, y: 109 }, { x: 210, y: 97 }],
    cochabamba_lapaz: [{ x: 210, y: 97 }, { x: 178, y: 109 }, { x: 132, y: 114 }, { x: 122, y: 91 }],

    lapaz_santacruz: [{ x: 122, y: 91 }, { x: 132, y: 114 }, { x: 180, y: 109 }, { x: 230, y: 88 }, { x: 284, y: 90 }],
    santacruz_lapaz: [{ x: 284, y: 90 }, { x: 230, y: 88 }, { x: 180, y: 109 }, { x: 132, y: 114 }, { x: 122, y: 91 }],

    lapaz_potosi: [{ x: 122, y: 91 }, { x: 132, y: 114 }, { x: 158, y: 133 }, { x: 174, y: 142 }],
    potosi_lapaz: [{ x: 174, y: 142 }, { x: 158, y: 133 }, { x: 132, y: 114 }, { x: 122, y: 91 }],

    santacruz_oruro: [{ x: 308, y: 98 }, { x: 266, y: 89 }, { x: 230, y: 88 }, { x: 180, y: 109 }],
    oruro_santacruz: [{ x: 180, y: 109 }, { x: 230, y: 88 }, { x: 266, y: 89 }, { x: 308, y: 98 }],

    santacruz_potosi: [{ x: 308, y: 98 }, { x: 266, y: 89 }, { x: 230, y: 88 }, { x: 204, y: 119 }],
    potosi_santacruz: [{ x: 204, y: 119 }, { x: 230, y: 88 }, { x: 266, y: 89 }, { x: 308, y: 98 }]
  };
  return waypointsMap[key] || [];
};

export default function RouteMiniMap({ 
  origen, 
  destino, 
  idViaje, 
  variant = 'saul',
  driverName,
  truckModel,
  truckPlate,
  pesaje,
  estadoViaje,
  departureDate,
  saldoCritico,
  onAuditTrip
}: RouteMiniMapProps) {
  const originNode = findCityNode(origen) || findCityNode('Oruro') || BOLIVIA_CITIES[1];
  const destNode = findCityNode(destino) || findCityNode('La Paz') || BOLIVIA_CITIES[0];
  const metadata = getRouteMetadata(origen || 'Oruro', destino || 'La Paz');

  const [selectedCity, setSelectedCity] = useState<CityNode | null>(destNode || originNode || null);
  const [liveSpeed, setLiveSpeed] = useState<number>(81.5);
  const [liveRpm, setLiveRpm] = useState<number>(1420);
  const [liveGear] = useState<number>(11);

  const routePathRef = useRef<SVGPathElement | null>(null);
  const traveledGlowRef = useRef<SVGPathElement | null>(null);
  const traveledPathRef = useRef<SVGPathElement | null>(null);
  const wakeGlowRef = useRef<SVGPathElement | null>(null);
  const wakePathRef = useRef<SVGPathElement | null>(null);
  const truckGroupRef = useRef<SVGGElement | null>(null);
  const elevDotRef = useRef<SVGCircleElement | null>(null);
  const waypointDotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const waypointRingRefs = useRef<(SVGCircleElement | null)[]>([]);
  const originBurstRef = useRef<SVGCircleElement | null>(null);
  const destBurstRef = useRef<SVGCircleElement | null>(null);

  // Numerical altitudes for live elevation strip
  const originAltM = parseInt(String(originNode.altitude).replace(/[^0-9]/g, ''), 10) || 3735;
  const destAltM = parseInt(String(destNode.altitude).replace(/[^0-9]/g, ''), 10) || 3640;
  const maxAlt = Math.max(originAltM, destAltM, 4100);
  const originAltY = Math.max(3, Math.min(13, 14 - (originAltM / maxAlt) * 10));
  const destAltY = Math.max(3, Math.min(13, 14 - (destAltM / maxAlt) * 10));
  const summitAltY = Math.max(2, Math.min(originAltY, destAltY) - 2.2);
  const elevPathD = `M 2,${originAltY.toFixed(1)} Q 50,${summitAltY.toFixed(1)} 98,${destAltY.toFixed(1)}`;
  const weatherKind = (() => {
    const a = normalizeText(metadata.alert);
    if (a.includes('llovizna') || a.includes('lluvia')) return 'rain';
    if (a.includes('niebla')) return 'mist';
    if (a.includes('viento')) return 'wind';
    return 'clear';
  })();

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveSpeed(prev => {
        const delta = (Math.random() - 0.5) * 2.5;
        const next = Math.max(76, Math.min(84, prev + delta));
        return parseFloat(next.toFixed(1));
      });
      setLiveRpm(prev => {
        const delta = (Math.random() - 0.5) * 45;
        const next = Math.max(1360, Math.min(1480, prev + delta));
        return Math.round(next);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isRouteConnected = Boolean(originNode && destNode && originNode.id !== destNode.id);
  const highwayPath = useMemo(
    () => (isRouteConnected && originNode && destNode ? getHighwayPath(originNode, destNode) : ''),
    [isRouteConnected, originNode, destNode]
  );
  const activeWaypoints = useMemo(
    () => (isRouteConnected && originNode && destNode ? getWaypoints(originNode.id, destNode.id) : []),
    [isRouteConnected, originNode?.id, destNode?.id]
  );
  const activeWaypointsRef = useRef(activeWaypoints);
  activeWaypointsRef.current = activeWaypoints;

  // Precision 60fps SVG path-following journey loop using getPointAtLength (strictly decoupled from 1s telemetry renders)
  useEffect(() => {
    if (!isRouteConnected || !highwayPath) return;

    let rafId = 0;
    let startTime: number | null = null;
    let totalLen = 0;
    let wpFractions: number[] = [];
    let wpComputed = false;

    const resolvePathMetrics = (pathEl: SVGPathElement) => {
      try {
        const len = pathEl.getTotalLength();
        if (!len || len <= 0) return false;
        totalLen = len;
        if (!wpComputed) {
          wpFractions = activeWaypointsRef.current.map((wp) => {
            let bestT = 0.5;
            let bestDistSq = Infinity;
            const samples = 80;
            for (let i = 0; i <= samples; i++) {
              const t = i / samples;
              const p = pathEl.getPointAtLength(t * totalLen);
              const dx = p.x - wp.x;
              const dy = p.y - wp.y;
              const dSq = dx * dx + dy * dy;
              if (dSq < bestDistSq) {
                bestDistSq = dSq;
                bestT = t;
              }
            }
            return bestT;
          });
          wpComputed = true;
        }
        return true;
      } catch {
        return false;
      }
    };

    const tick = (now: number) => {
      const pathEl = routePathRef.current;
      const truckEl = truckGroupRef.current;

      if (!pathEl || !truckEl) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (totalLen <= 0 && !resolvePathMetrics(pathEl)) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (startTime === null) {
        startTime = now;
      }

      // Continuous full-route cycle proportional to distance (~6.5s short route, ~12.5s long route)
      const cycleDurationMs = Math.max(6500, Math.min(12500, Math.round(totalLen * 110)));
      const elapsed = (now - startTime) % cycleDurationMs;
      const rawT = elapsed / cycleDurationMs;

      // Full 0% -> 100% point-to-point journey envelope
      let easedT = 0;
      let truckOpacity = 1;

      if (rawT < 0.05) {
        const p = rawT / 0.05;
        easedT = 0.03 * (p * p);
        truckOpacity = 0.35 + 0.65 * p;
      } else if (rawT < 0.89) {
        const p = (rawT - 0.05) / 0.84;
        easedT = 0.03 + 0.93 * p;
        truckOpacity = 1;
      } else if (rawT < 0.96) {
        const p = (rawT - 0.89) / 0.07;
        easedT = 0.96 + 0.04 * (1 - (1 - p) * (1 - p));
        truckOpacity = 1;
      } else {
        const p = (rawT - 0.96) / 0.04;
        easedT = 1;
        truckOpacity = Math.max(0, 1 - p);
      }

      const clamped = Math.max(0, Math.min(1, easedT));
      const dist = clamped * totalLen;
      const pt = pathEl.getPointAtLength(dist);
      const step = Math.min(2.2, totalLen * 0.025);
      const ptPrev = pathEl.getPointAtLength(Math.max(0, dist - step));
      const ptNext = pathEl.getPointAtLength(Math.min(totalLen, dist + step));
      const angle = Math.atan2(ptNext.y - ptPrev.y, ptNext.x - ptPrev.x) * (180 / Math.PI);

      // Move truck & orient directly along road tangent
      truckEl.setAttribute('transform', `translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}) rotate(${angle.toFixed(2)})`);
      truckEl.setAttribute('opacity', truckOpacity.toFixed(2));

      // Update completed emerald trail from origin up to truck (dual-stroke optical glow, zero SVG filter lag)
      const dashStr = `${totalLen} ${totalLen}`;
      const dashOff = `${(totalLen * (1 - clamped)).toFixed(2)}`;
      if (traveledGlowRef.current) {
        traveledGlowRef.current.style.strokeDasharray = dashStr;
        traveledGlowRef.current.style.strokeDashoffset = dashOff;
      }
      if (traveledPathRef.current) {
        traveledPathRef.current.style.strokeDasharray = dashStr;
        traveledPathRef.current.style.strokeDashoffset = dashOff;
      }

      // Update high-energy slipstream wake trailing directly behind the truck
      const wakeLen = Math.min(24, totalLen * 0.35);
      const start = Math.max(0, dist - wakeLen);
      const visibleWake = Math.max(0, dist - start);
      const wakeDash = `${visibleWake.toFixed(2)} ${(totalLen * 2).toFixed(2)}`;
      const wakeOff = `${(-start).toFixed(2)}`;
      if (wakeGlowRef.current) {
        wakeGlowRef.current.style.strokeDasharray = wakeDash;
        wakeGlowRef.current.style.strokeDashoffset = wakeOff;
        wakeGlowRef.current.setAttribute('opacity', (truckOpacity * 0.32).toFixed(2));
      }
      if (wakePathRef.current) {
        wakePathRef.current.style.strokeDasharray = wakeDash;
        wakePathRef.current.style.strokeDashoffset = wakeOff;
        wakePathRef.current.setAttribute('opacity', (truckOpacity * 0.95).toFixed(2));
      }

      // Sync quadratic elevation curve marker dot smoothly (t from 0..1 on M 2,y0 Q 50,ym 98,y1)
      if (elevDotRef.current) {
        const u = 1 - clamped;
        const ex = u * u * 2 + 2 * u * clamped * 50 + clamped * clamped * 98;
        const ey = u * u * originAltY + 2 * u * clamped * summitAltY + clamped * clamped * destAltY;
        elevDotRef.current.setAttribute('cx', ex.toFixed(2));
        elevDotRef.current.setAttribute('cy', ey.toFixed(2));
        elevDotRef.current.setAttribute('opacity', Math.max(0.35, truckOpacity).toFixed(2));
      }

      // Illuminate checkpoints dynamically as truck passes through each waypoint
      wpFractions.forEach((wpT, idx) => {
        const dotEl = waypointDotRefs.current[idx];
        const ringEl = waypointRingRefs.current[idx];
        const passed = clamped >= wpT;
        const delta = clamped - wpT;

        if (dotEl) {
          dotEl.setAttribute('fill', passed ? '#34d399' : '#bae6fd');
          dotEl.setAttribute('r', passed ? '1.65' : '1.1');
          dotEl.setAttribute('opacity', passed ? '1' : '0.6');
        }
        if (ringEl) {
          if (delta >= 0 && delta < 0.14) {
            const p = delta / 0.14;
            ringEl.setAttribute('r', (1.8 + p * 5.2).toFixed(2));
            ringEl.setAttribute('opacity', ((1 - p) * 0.9).toFixed(2));
          } else {
            ringEl.setAttribute('opacity', '0');
          }
        }
      });

      // Origin departure burst & Destination arrival burst
      if (originBurstRef.current) {
        if (rawT < 0.14) {
          const p = rawT / 0.14;
          originBurstRef.current.setAttribute('r', (4 + p * 9).toFixed(2));
          originBurstRef.current.setAttribute('opacity', ((1 - p) * 0.85).toFixed(2));
        } else {
          originBurstRef.current.setAttribute('opacity', '0');
        }
      }
      if (destBurstRef.current) {
        if (rawT > 0.86 && rawT < 0.99) {
          const p = (rawT - 0.86) / 0.13;
          destBurstRef.current.setAttribute('r', (4 + p * 10).toFixed(2));
          destBurstRef.current.setAttribute('opacity', ((1 - p) * 0.95).toFixed(2));
        } else {
          destBurstRef.current.setAttribute('opacity', '0');
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [highwayPath, isRouteConnected]);

  return (
    <div id={`minimap-${idViaje || 'demo'}`} className="space-y-4 w-full">
      {/* MAP VIEWPORT WITH MOBILE-FAST GLASSMORPHISM */}
      <div className="backdrop-blur-md sm:backdrop-blur-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/88 to-[#040814] border border-white/[0.1] rounded-3xl overflow-hidden relative w-full aspect-[16/10] sm:aspect-[21/10] md:aspect-[420/185] min-h-[250px] sm:min-h-[300px] transition-all duration-300 ease-natural select-none shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.12)] perf-contain">
        {/* Top satin hairline */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 via-white/30 to-transparent pointer-events-none z-30" />
        <div className="absolute inset-0 w-full h-full">
        {/* Ambient Topography Scanline overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0ea5e9]/5 to-transparent pointer-events-none h-full w-full map-scanline route-live-anim" />

        {/* Dynamic lightweight route weather particles (GPU-only CSS transforms) */}
        {weatherKind === 'rain' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 opacity-75">
            {[14, 28, 44, 60, 74, 86].map((leftPct, i) => (
              <span
                key={`rain-${i}`}
                className="absolute top-2 w-[1px] h-4 bg-gradient-to-b from-transparent via-sky-300/70 to-transparent rotate-[14deg] weather-rain-drop route-live-anim"
                style={{ left: `${leftPct}%`, animationDelay: `${i * 0.22}s` }}
              />
            ))}
          </div>
        )}
        {weatherKind === 'mist' && (
          <div
            className="absolute inset-x-0 top-1/3 h-16 pointer-events-none z-10 weather-mist-band route-live-anim"
            style={{ background: 'radial-gradient(ellipse at center, rgba(148, 163, 184, 0.18), transparent 70%)' }}
          />
        )}
        {weatherKind === 'wind' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 opacity-65">
            {[24, 48, 70].map((topPct, i) => (
              <span
                key={`wind-${i}`}
                className="absolute right-8 h-[1px] w-12 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent wind-streak-1 route-live-anim"
                style={{ top: `${topPct}%`, animationDelay: `${i * 0.35}s` }}
              />
            ))}
          </div>
        )}

        {/* SVG Map view */}
        <svg
          viewBox="0 0 420 185"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full text-slate-800/50"
          style={{ touchAction: 'manipulation' }}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <defs>
            {/* Ultra-glow Filter for futuristic logistics line */}
            <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComponentTransfer in="blur" result="boost">
                <feFuncA type="linear" slope="1.9" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="boost" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* Real Topographical Relief Map Gradient of Bolivia (Highlands West to tropical Lowlands East) */}
            <linearGradient id="topographyGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#080e1a" />  {/* Altiplano - deep dark slate */}
              <stop offset="35%" stopColor="#0b1324" /> {/* Altiplano/Cordillera border */}
              <stop offset="60%" stopColor="#031e24" /> {/* Valleys - beautiful deep teal-green */}
              <stop offset="85%" stopColor="#022119" /> {/* Plains - lush emerald green shadow */}
              <stop offset="100%" stopColor="#011812" />
            </linearGradient>

            <radialGradient id="gridGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.08" />
              <stop offset="60%" stopColor="#0284c7" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            {/* Futuristic Headlight gradient */}
            <linearGradient id="headlightGlow" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="25%" stopColor="#fef08a" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#fef08a" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </linearGradient>

            {/* Laser spotlight beam gradient */}
            <linearGradient id="laserBeam" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </linearGradient>

            {/* Red Taillight warning gradient */}
            <linearGradient id="taillightGlow" x1="1" y1="0.5" x2="0" y2="0.5">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>

            {/* Sweep radar lines */}
            <radialGradient id="radarSweepGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </radialGradient>
            
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>

            {/* Cab gradient (Deep Crimson Red to Sleek Scarlet for high-end truck design) */}
            <linearGradient id="cabGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            {/* Trailer gradient (Brushed Silver Aluminum container body) */}
            <linearGradient id="trailerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="25%" stopColor="#cbd5e1" />
              <stop offset="75%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Exhaust Stack chrome shine */}
            <linearGradient id="chromeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Cyan Window Glass */}
            <linearGradient id="windowGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.65" />
            </linearGradient>
          </defs>

          {/* Full Realistic Altitude Relief background */}
          <rect width="420" height="185" fill="url(#topographyGrad)" pointerEvents="none" />
          <rect width="420" height="185" fill="url(#gridGlow)" pointerEvents="none" />

          {/* Subtle Mountain Ridges background vectors for the majestic Andes in the West */}
          <path 
            d="M -10,185 L 35,140 L 78,165 L 120,132 L 165,160 L 205,138 L 245,185 Z" 
            fill="#1e293b" 
            fillOpacity="0.06" 
            stroke="#334155" 
            strokeWidth="0.5" 
            strokeOpacity="0.12" 
          />
          <path 
            d="M -10,185 L 55,152 L 105,172 L 140,145 L 185,170 L 222,155 L 258,185 Z" 
            fill="#0f172a" 
            fillOpacity="0.08" 
            stroke="#475569" 
            strokeWidth="0.5" 
            strokeOpacity="0.14" 
          />

          {/* BACKGROUND ROAD NETWORK CONNECTIONS */}
          <g stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.55" fill="none">
            {/* LP <-> OR */}
            <path d="M 110,72 C 115,82 120,87 125,96 C 129,103 130,108 132,114" />
            {/* OR <-> PT */}
            <path d="M 132,114 C 145,126 156,133 164,137 C 171,141 177,144 184,146" />
            {/* OR <-> CB */}
            <path d="M 132,114 C 156,108 178,113 196,104 C 210,97 220,91 230,88" />
            {/* CB <-> SC */}
            <path d="M 230,88 C 258,100 270,79 290,92 C 308,104 322,96 336,102" />
            {/* CB <-> PT */}
            <path d="M 230,88 C 214,108 202,122 194,133 C 189,139 186,143 184,146" />
          </g>

          {/* ACTIVE TRAVEL TRUNK ROAD (High intensity curved glow + live traveled progress beam) */}
          {isRouteConnected && (
            <g>
              {/* Ultra thick dark asphalt highway base */}
              <path
                d={highwayPath}
                stroke="#020815"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
              />
              {/* Real road asphalt lane overlay */}
              <path
                d={highwayPath}
                stroke="#1e293b"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
              {/* Subtle shoulder lane borders */}
              <path
                d={highwayPath}
                stroke="#ffffff"
                strokeWidth="5"
                strokeOpacity="0.14"
                strokeLinecap="round"
                fill="none"
              />
              {/* Solid asphalt center */}
              <path
                d={highwayPath}
                stroke="#0f172a"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />

              {/* Soft Permanent Cyan Neon Route Halo (dual-stroke optical glow, no SVG filter raster cost) */}
              <path
                d={highwayPath}
                stroke="#38bdf8"
                strokeWidth="5.5"
                strokeOpacity="0.16"
                strokeLinecap="round"
                fill="none"
              />

              {/* Ahead Guide Line */}
              <path
                d={highwayPath}
                stroke="#7dd3fc"
                strokeWidth="1.4"
                strokeOpacity="0.48"
                strokeLinecap="round"
                fill="none"
              />

              {/* Live Traveled Progress Trail (Dual-stroke optical glow synced directly to Truck Position!) */}
              <path
                ref={traveledGlowRef}
                d={highwayPath}
                stroke="#10b981"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="0 9999"
                fill="none"
                strokeOpacity="0.24"
              />
              <path
                ref={traveledPathRef}
                d={highwayPath}
                stroke="#34d399"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeDasharray="0 9999"
                fill="none"
                strokeOpacity="0.92"
              />

              {/* High-energy glowing slipstream wake right behind moving truck */}
              <path
                ref={wakeGlowRef}
                d={highwayPath}
                stroke="#38bdf8"
                strokeWidth="7.5"
                strokeLinecap="round"
                fill="none"
                opacity="0"
              />
              <path
                ref={wakePathRef}
                d={highwayPath}
                stroke="#a5f3fc"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                opacity="0"
              />

              {/* Moving white directional dash indicators flowing along the route */}
              <path
                d={highwayPath}
                stroke="#ffffff"
                strokeWidth="0.95"
                strokeLinecap="round"
                strokeDasharray="3, 10"
                className="route-dash-flow route-live-anim"
                fill="none"
                opacity="0.78"
              />

              {/* Render Dynamic Path Waypoints (Illuminate + pulse as truck passes) */}
              {activeWaypoints.map((pt, idx) => (
                <g key={`waypoint-${idx}`}>
                  <circle
                    ref={(el) => { waypointRingRefs.current[idx] = el; }}
                    cx={pt.x}
                    cy={pt.y}
                    r="2"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="0.7"
                    opacity="0"
                  />
                  <circle
                    ref={(el) => { waypointDotRefs.current[idx] = el; }}
                    cx={pt.x}
                    cy={pt.y}
                    r="1.1"
                    fill="#bae6fd"
                    opacity="0.6"
                  />
                </g>
              ))}

              {/* Departure & Arrival Shockwave Bursts */}
              {originNode && (
                <circle
                  ref={originBurstRef}
                  cx={originNode.x}
                  cy={originNode.y}
                  r="4"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1"
                  opacity="0"
                />
              )}
              {destNode && (
                <circle
                  ref={destBurstRef}
                  cx={destNode.x}
                  cy={destNode.y}
                  r="4"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="1.1"
                  opacity="0"
                />
              )}

              {/* Reference Geometry Path for 60fps getPointAtLength tracking */}
              <path
                ref={routePathRef}
                id={`route-path-${idViaje || 'demo'}`}
                d={highwayPath}
                fill="none"
                stroke="none"
              />

              {/* 🚛 60FPS PATH-LOCKED TRUCK MARKER (No SMIL/CSS transform collision!) */}
              <g ref={truckGroupRef} opacity="0">
                {/* Live GPS Telemetry Pulse Ring around moving truck */}
                <circle
                  cx="0"
                  cy="0"
                  r="7"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="0.8"
                  className="truck-beacon-ring route-live-anim"
                />

                {/* Scale wrapper using clean SVG transform only */}
                <g transform="scale(0.84)">
                  {/* Nested driving micro-motion wrapper (isolated from parent SVG transform) */}
                  <g className="truck-drive-micro route-live-anim">
                    {/* Ground Drop Shadow */}
                    <rect x="-22" y="-4" width="33" height="10" rx="3" fill="#020617" opacity="0.75" />

                    {/* Animated Rear Exhaust / Motion Slipstream Particles */}
                    <circle cx="-24.5" cy="-2.2" r="1.1" fill="#67e8f9" className="exhaust-wake-dot route-live-anim" />
                    <circle cx="-26" cy="2.2" r="0.9" fill="#34d399" className="exhaust-wake-dot route-live-anim" style={{ animationDelay: '0.25s' }} />

                    {/* Volumetric Dual LED Headlight Beams */}
                    <polygon points="9.5,-3.6 34,-11 34,-0.5 9.5,-1.2" fill="url(#laserBeam)" opacity="0.7" className="truck-headlight-flicker route-live-anim" />
                    <polygon points="9.5,1.2 34,0.5 34,11 9.5,3.6" fill="url(#laserBeam)" opacity="0.7" className="truck-headlight-flicker route-live-anim" />

                    {/* Rear Red Brake/Taillight Glow Trail */}
                    <rect x="-33" y="-4.5" width="12" height="9" fill="url(#taillightGlow)" className="truck-taillight-flicker route-live-anim" />

                    {/* Subtle Cyan Fleet Underglow */}
                    <rect x="-23.5" y="-6.2" width="35" height="12.4" rx="2.5" stroke="#38bdf8" strokeWidth="0.65" fill="none" opacity="0.55" filter="url(#neonGlow)" />

                    {/* --- MODERN HEAVY CARGO TRAILER --- */}
                    <rect x="-22.5" y="-5" width="21.5" height="10" rx="1.4" fill="url(#trailerGrad)" stroke="#64748b" strokeWidth="0.65" />
                    {/* SL Road Cyan Fleet Accent Stripes */}
                    <line x1="-21.5" y1="-3.7" x2="-2" y2="-3.7" stroke="#0284c7" strokeWidth="0.85" strokeOpacity="0.9" />
                    <line x1="-21.5" y1="3.7" x2="-2" y2="3.7" stroke="#0284c7" strokeWidth="0.85" strokeOpacity="0.9" />
                    {/* Roof Spine & Aero Ribs */}
                    <line x1="-21.5" y1="0" x2="-2" y2="0" stroke="#ffffff" strokeWidth="0.75" strokeOpacity="0.6" />
                    {[-19, -15.5, -12, -8.5, -5].map((rx, idx) => (
                      <line key={`roof-rib-${idx}`} x1={rx} y1="-4.8" x2={rx} y2="4.8" stroke="#334155" strokeWidth="0.45" opacity="0.55" />
                    ))}

                    {/* Fifth-Wheel Coupler */}
                    <rect x="-1.8" y="-1.8" width="4" height="3.6" fill="#0f172a" stroke="#475569" strokeWidth="0.45" rx="0.5" />

                    {/* --- MODERN AERO TRACTOR CAB (DAF STYLE) --- */}
                    <path d="M 0,-4.4 L 8.2,-4 L 10.6,-2.4 L 10.6,2.4 L 8.2,4 L 0,4.4 Z" fill="url(#cabGrad)" stroke="#fb7185" strokeWidth="0.6" />
                    {/* Panoramic Curved Tinted Windshield */}
                    <path d="M 6.5,-3.3 C 9.1,-2.8 9.7,-1 9.7,0 C 9.7,1 9.1,2.8 6.5,3.3 C 7.1,1.4 7.1,-1.4 6.5,-3.3 Z" fill="url(#windowGrad)" stroke="#0f172a" strokeWidth="0.4" />
                    {/* Cab Sunroof Skylight */}
                    <rect x="2.1" y="-1.5" width="2.6" height="3" rx="0.5" fill="url(#windowGrad)" opacity="0.88" />

                    {/* Aero Side Mirrors */}
                    <path d="M 7.8,-4.2 L 6.4,-5.8 L 4.6,-5.8 L 6,-4" fill="url(#chromeGrad)" stroke="#334155" strokeWidth="0.35" />
                    <path d="M 7.8,4.2 L 6.4,5.8 L 4.6,5.8 L 6,4" fill="url(#chromeGrad)" stroke="#334155" strokeWidth="0.35" />

                    {/* Bright Front LED Headlamps */}
                    <circle cx="10.1" cy="-2.5" r="0.78" fill="#ffffff" />
                    <circle cx="10.1" cy="2.5" r="0.78" fill="#ffffff" />

                    {/* Amber Side Safety Markers */}
                    {[-20, -12, -4].map((cx, idx) => (
                      <g key={`marker-amber-${idx}`}>
                        <circle cx={cx} cy="-4.9" r="0.48" fill="#fbbf24" />
                        <circle cx={cx} cy="4.9" r="0.48" fill="#fbbf24" />
                      </g>
                    ))}

                    {/* Twin Ruby Taillights */}
                    <rect x="-22.8" y="-3.9" width="0.85" height="1.8" rx="0.3" fill="#ef4444" />
                    <rect x="-22.8" y="2.1" width="0.85" height="1.8" rx="0.3" fill="#ef4444" />
                  </g>
                </g>
              </g>
            </g>
          )}

          {/* Render Bolivia Network Hubs - Minimalist High-Precision Markers */}
          {BOLIVIA_CITIES.map((city) => {
            const isOrigin = originNode?.id === city.id;
            const isDest = destNode?.id === city.id;
            const isActive = isOrigin || isDest;
            const isSelected = selectedCity?.id === city.id;
            const labelX = city.x + (city.labelDx ?? 0);
            const labelY = city.y + (city.labelDy ?? -9);

            return (
              <g key={city.id} className="transition-all duration-300 group">
                {/* Generous touch/click target for high mobile precision */}
                <circle
                  cx={city.x}
                  cy={city.y}
                  r="16"
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCity(city);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setSelectedCity(city);
                  }}
                />

                {/* Animated GPS radar wave on origin / destination */}
                {isActive && (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r="3.5"
                    fill="none"
                    stroke={isDest ? '#10b981' : '#38bdf8'}
                    strokeWidth="0.7"
                    className="gps-pulse-ring route-live-anim pointer-events-none"
                  />
                )}

                {/* Concentric aura ring for origin / destination */}
                {isActive && (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={isSelected ? 9.5 : 7.5}
                    fill="none"
                    stroke={isDest ? '#10b981' : '#38bdf8'}
                    strokeWidth="0.8"
                    strokeDasharray={isDest ? '2,2' : undefined}
                    opacity="0.5"
                    className="transition-all duration-300"
                  />
                )}

                {/* Minimalist City Node Marker */}
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={isSelected ? 4.2 : isActive ? 3.4 : 2.1}
                  fill={isSelected ? '#ffffff' : isActive ? (isDest ? '#10b981' : '#38bdf8') : '#1e293b'}
                  stroke={isSelected ? (isDest ? '#10b981' : '#38bdf8') : isActive ? '#ffffff' : '#475569'}
                  strokeWidth={isSelected ? 1.6 : isActive ? 1.1 : 0.8}
                  className="transition-all duration-300 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCity(city);
                  }}
                />

                {/* Minimalist City Label positioned cleanly outside highway path */}
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={city.labelAnchor ?? 'middle'}
                  fill={isSelected ? '#ffffff' : isActive ? '#f1f5f9' : '#94a3b8'}
                  fontSize={isSelected ? '7.5' : isActive ? '6.8' : '5.8'}
                  fontWeight={isSelected ? '800' : isActive ? '700' : '500'}
                  letterSpacing="0.02em"
                  className="transition-all duration-300 select-none pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
                >
                  {city.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* TOP-LEFT FLOATING GLASS WIDGET: Chofer & Camión */}
        {(variant === 'saul' || variant === 'chofer') && (
          <motion.div 
            initial={{ opacity: 0, x: -10, y: -6 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            whileHover={{ y: -2, scale: 1.015 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-20 pointer-events-auto max-w-[46%] sm:max-w-none"
          >
            <div className="backdrop-blur-md sm:backdrop-blur-xl bg-slate-950/85 border border-white/[0.12] rounded-2xl px-2.5 py-2 sm:px-3.5 sm:py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.12)] flex items-center gap-2 sm:gap-3 transition-all hover:bg-slate-900/90 hover:border-cyan-400/30">
              <div className="relative shrink-0">
                <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-center text-slate-200 shadow-inner">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-[0_0_6px_#10b981]" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] sm:text-xs font-black text-white tracking-tight leading-tight truncate">
                    {driverName || 'Mauricio Usseglio'}
                  </span>
                  <span className="hidden sm:inline-block text-[8px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 shrink-0">
                    EN CABINA
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-slate-400 text-[8.5px] sm:text-[10px] truncate">
                  <Truck className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="font-semibold text-slate-300 truncate">{truckModel || 'DAF 1820'}</span>
                  <span className="hidden sm:inline text-slate-600">·</span>
                  <span className="hidden sm:inline font-mono text-slate-400">{truckPlate || '4829-KLA'}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TOP-RIGHT FLOATING GLASS WIDGET: Alerta Climática */}
        {(variant === 'saul' || variant === 'chofer') && (
          <motion.div 
            initial={{ opacity: 0, x: 10, y: -6 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            whileHover={{ y: -2, scale: 1.015 }}
            transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 z-20 pointer-events-auto max-w-[46%] sm:max-w-none"
          >
            <div className="backdrop-blur-md sm:backdrop-blur-xl bg-slate-950/85 border border-amber-500/30 rounded-2xl px-2.5 py-2 sm:px-3.5 sm:py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(245,158,11,0.15)] flex items-center gap-2 sm:gap-3 transition-all hover:bg-slate-900/90 hover:border-amber-400/50">
              <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                <CloudRain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-pulse" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] sm:text-xs font-black text-amber-300 tracking-tight leading-tight truncate">
                    {metadata.alert || 'Posible Llovizna'}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[8.5px] sm:text-[10px] truncate">
                  <span className="text-slate-300 font-medium truncate">Cumbre LP-OR</span>
                  <span className="hidden sm:inline text-slate-600">·</span>
                  <span className="hidden sm:inline text-amber-200/90 font-medium">Calzada Húmeda</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* BOTTOM-LEFT STATUS: Distance & ETA */}
        {(variant === 'saul' || variant === 'chofer') && (
          <div className="absolute bottom-2.5 left-2.5 sm:bottom-3.5 sm:left-3.5 z-20 pointer-events-none">
            <div className="backdrop-blur-md bg-slate-950/85 border border-white/[0.08] px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-1.5 tabular-nums">
              <Compass className="w-3 h-3 text-cyan-400 animate-spin-slow route-live-anim shrink-0" />
              <span className="text-[8.5px] font-mono font-bold text-slate-300 tracking-wide">
                {metadata.dist}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-[8.5px] font-mono text-cyan-400 font-bold">
                {metadata.dur}
              </span>
            </div>
          </div>
        )}

        {/* BOTTOM-RIGHT STATUS: RT Telemetry Indicator */}
        {(variant === 'saul' || variant === 'chofer') && (
          <div className="absolute bottom-2.5 right-2.5 sm:bottom-3.5 sm:right-3.5 z-20 pointer-events-none">
            <div className="backdrop-blur-md bg-slate-950/85 border border-white/[0.08] px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              </span>
              <span className="text-[8.5px] font-mono font-bold text-slate-300 uppercase tracking-widest">
                {isRouteConnected ? 'TELEMETRÍA EN VIVO' : 'ESPERANDO SEÑAL'}
              </span>
            </div>
          </div>
        )}
        </div>
      </div>



      {(variant === 'saul' || variant === 'chofer') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Side: Real-time Live Truck Cockpit Telemetry */}
          <div className="backdrop-blur-xl bg-slate-950/80 border border-white/[0.08] p-4 sm:p-5 rounded-2xl flex flex-col justify-between shadow-[0_15px_35px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] transition-all">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider font-mono">
                  Telemetría de Cabina (En Vivo)
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono font-bold tracking-tight">
                {truckModel?.toUpperCase() || 'DAF 1820 HEAVY DUTY'}
              </span>
            </div>

            {/* 🚛 LIVE SIDE-PROFILE DRIVING CONTROLS & PARALLAX TRACKER */}
            <div className="h-16 w-full bg-gradient-to-r from-slate-950/90 to-slate-900/60 border border-white/[0.06] rounded-xl overflow-hidden relative mb-2.5 flex items-center justify-between px-3 shadow-inner">
              {/* Parallax Moving Landscape */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="absolute bottom-2 left-0 w-[200%] h-7 text-slate-800/80">
                  <path d="M 0,20 L 12,8 L 24,18 L 36,4 L 48,15 L 60,6 L 72,17 L 85,11 L 100,20 L 112,8 L 124,18 L 136,4 L 148,15 L 160,6 L 172,17 L 185,11 L 200,20" fill="none" stroke="currentColor" strokeWidth="0.4" />
                  <animateTransform 
                    attributeName="transform" 
                    type="translate" 
                    from="0 0" 
                    to="-100 0" 
                    dur="24s" 
                    repeatCount="indefinite" 
                  />
                </svg>

                <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="absolute bottom-1.5 left-0 w-[200%] h-5.5 text-slate-700/90">
                  <path d="M 0,20 L 15,10 L 30,17 L 45,5 L 60,15 L 75,8 L 90,18 L 100,20 L 115,10 L 130,17 L 145,5 L 160,15 L 175,8 L 190,18 L 200,20" fill="none" stroke="currentColor" strokeWidth="0.55" />
                  <animateTransform 
                    attributeName="transform" 
                    type="translate" 
                    from="0 0" 
                    to="-100 0" 
                    dur="10s" 
                    repeatCount="indefinite" 
                  />
                </svg>

                {/* Road dashes */}
                <svg viewBox="0 0 100 2" preserveAspectRatio="none" className="absolute bottom-0.5 left-0 w-[200%] h-1 text-slate-500">
                  <line x1="0" y1="1" x2="200" y2="1" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3,6" />
                  <animateTransform 
                    attributeName="transform" 
                    type="translate" 
                    from="0 0" 
                    to="-50 0" 
                    dur="0.6s" 
                    repeatCount="indefinite" 
                  />
                </svg>
              </div>

              {/* Scale-down Profile Truck SVG container */}
              <div className="w-32 h-12 relative z-10 select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)]">
                <svg viewBox="-24 -15 50 23" className="w-full h-full" fill="none">
                  {/* Speed Wind Slipstream Streaks */}
                  <line x1="-18" y1="-11" x2="-4" y2="-11" stroke="#38bdf8" strokeWidth="0.45" strokeLinecap="round" className="wind-streak-1 route-live-anim" />
                  <line x1="-22" y1="-6" x2="-10" y2="-6" stroke="#67e8f9" strokeWidth="0.35" strokeLinecap="round" className="wind-streak-2 route-live-anim" />
                  {/* Forward LED Headlight Cone */}
                  <polygon points="11.2,0.5 26,-3.5 26,4.5 11.2,2.4" fill="url(#laserBeam)" opacity="0.6" className="truck-headlight-flicker route-live-anim" />
                  <g className="truck-hover-bob route-live-anim">
                    {/* Underglow */}
                    <rect x="-17" y="2.2" width="28" height="1.6" rx="0.8" fill="#38bdf8" opacity="0.4" />
                    {/* Frame */}
                    <rect x="-16.5" y="1" width="26.5" height="1.8" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                    {/* Trailer */}
                    <rect x="-17" y="-9.5" width="16" height="10.5" rx="0.8" fill="url(#trailerGrad)" stroke="#64748b" strokeWidth="0.7" />
                    {[-15.2, -11.8, -8.4, -5.0, -1.6].map((rx, idx) => (
                      <line key={`p-rib-${idx}`} x1={rx} y1="-9" x2={rx} y2="0.5" stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.4" />
                    ))}
                    {[-15.0, -11.6, -8.2, -4.8, -1.4].map((rx, idx) => (
                      <line key={`p-rib-sh-${idx}`} x1={rx} y1="-9" x2={rx} y2="0.5" stroke="#334155" strokeWidth="0.4" strokeOpacity="0.5" />
                    ))}
                    {/* Branding */}
                    <rect x="-17" y="-5.5" width="16" height="1.6" fill="#0284c7" fillOpacity="0.9" />
                    <rect x="-17" y="-4.2" width="16" height="0.4" fill="#f59e0b" fillOpacity="0.9" />
                    <text x="-9" y="-6.5" textAnchor="middle" fill="#0f172a" fontSize="1.8" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.3">SL ROAD</text>
                    <text x="-9" y="-2.5" textAnchor="middle" fill="#ffffff" fontSize="1.3" fontWeight="800" fontFamily="sans-serif" letterSpacing="0.2">TRUCKING</text>
                    
                    {/* Deflector */}
                    <path d="M -0.5,-9.5 C 1,-10.8 3,-10.8 4.2,-9.5 L 4.5,-8 L -0.5,-8 Z" fill="#7f1d1d" stroke="#ef4444" strokeWidth="0.5" />
                  {/* Cabin */}
                  <path d="M -1,-8 L 4.5,-8 C 6.5,-8 8.5,-4 10.5,-2 L 11.2,1.5 L 11.2,3 L -1,3 Z" fill="url(#cabGrad)" stroke="#ef4444" strokeWidth="0.6" />
                  {/* Side Window */}
                  <path d="M 3.8,-7.2 L 6.8,-7.2 L 8.3,-4.2 L 3.8,-4.2 Z" fill="url(#windowGrad)" stroke="#1e293b" strokeWidth="0.5" />
                  <line x1="4.8" y1="-6.8" x2="6.2" y2="-4.6" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.6" />
                  {/* Fuel Tank */}
                  <rect x="0.8" y="1.5" width="5.2" height="1.6" rx="0.8" fill="url(#chromeGrad)" stroke="#475569" strokeWidth="0.3" />
                  {/* Bumper */}
                  <path d="M 11,1.5 L 11.5,1.5 C 11.8,1.5 11.8,3 11.5,3 L 11,3 Z" fill="url(#chromeGrad)" stroke="#475569" strokeWidth="0.3" />

                  {/* Chimney Stack */}
                  <rect x="-0.8" y="-12.5" width="0.8" height="9" rx="0.2" fill="url(#chromeGrad)" stroke="#475569" strokeWidth="0.3" />
                  
                  {/* Exhaust puffs */}
                  <circle cx="-0.4" cy="-13" r="0.8" fill="#38bdf8" fillOpacity="0.4">
                    <animate attributeName="r" values="0.8;3;4.5" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0.35;0" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="cx" values="-0.4;-3;-6" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="cy" values="-13;-15;-16.5" dur="1.2s" repeatCount="indefinite" />
                  </circle>

                  {/* Steer wheel */}
                  <g transform="translate(8, 3.5)">
                    <circle cx="0" cy="0" r="2.4" fill="#0f172a" stroke="#334155" strokeWidth="0.4" />
                    <circle cx="0" cy="0" r="1.1" fill="url(#chromeGrad)" />
                    <g>
                      <line x1="-1.1" y1="0" x2="1.1" y2="0" stroke="#334155" strokeWidth="0.3" />
                      <line x1="0" y1="-1.1" x2="0" y2="1.1" stroke="#334155" strokeWidth="0.3" />
                      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.4s" repeatCount="indefinite" />
                    </g>
                  </g>
                  {/* Rear Wheels */}
                  <g transform="translate(4, 3.5)">
                    <circle cx="0" cy="0" r="2.4" fill="#0f172a" stroke="#334155" strokeWidth="0.4" />
                    <circle cx="0" cy="0" r="1.1" fill="url(#chromeGrad)" />
                    <g>
                      <line x1="-1.1" y1="0" x2="1.1" y2="0" stroke="#334155" strokeWidth="0.3" />
                      <line x1="0" y1="-1.1" x2="0" y2="1.1" stroke="#334155" strokeWidth="0.3" />
                      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.4s" repeatCount="indefinite" />
                    </g>
                  </g>
                  <g transform="translate(0.5, 3.5)">
                    <circle cx="0" cy="0" r="2.4" fill="#0f172a" stroke="#334155" strokeWidth="0.4" />
                    <circle cx="0" cy="0" r="1.1" fill="url(#chromeGrad)" />
                    <g>
                      <line x1="-1.1" y1="0" x2="1.1" y2="0" stroke="#334155" strokeWidth="0.3" />
                      <line x1="0" y1="-1.1" x2="0" y2="1.1" stroke="#334155" strokeWidth="0.3" />
                      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.4s" repeatCount="indefinite" />
                    </g>
                  </g>
                  <g transform="translate(-10.5, 3.5)">
                    <circle cx="0" cy="0" r="2.4" fill="#0f172a" stroke="#334155" strokeWidth="0.4" />
                    <circle cx="0" cy="0" r="1.1" fill="url(#chromeGrad)" />
                    <g>
                      <line x1="-1.1" y1="0" x2="1.1" y2="0" stroke="#334155" strokeWidth="0.3" />
                      <line x1="0" y1="-1.1" x2="0" y2="1.1" stroke="#334155" strokeWidth="0.3" />
                      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.4s" repeatCount="indefinite" />
                    </g>
                  </g>
                  <g transform="translate(-14, 3.5)">
                    <circle cx="0" cy="0" r="2.4" fill="#0f172a" stroke="#334155" strokeWidth="0.4" />
                    <circle cx="0" cy="0" r="1.1" fill="url(#chromeGrad)" />
                    <g>
                      <line x1="-1.1" y1="0" x2="1.1" y2="0" stroke="#334155" strokeWidth="0.3" />
                      <line x1="0" y1="-1.1" x2="0" y2="1.1" stroke="#334155" strokeWidth="0.3" />
                      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.4s" repeatCount="indefinite" />
                    </g>
                  </g>
                  </g>
                </svg>
              </div>

              {/* Digital HUD telemetry indicator */}
              <div className="flex flex-col items-end text-right border-l border-white/[0.08] pl-3 py-1 relative z-10">
                <span className="text-[8px] text-emerald-400 font-black uppercase tracking-widest font-mono">
                  {truckModel ? truckModel.split(' ')[0].toUpperCase() + '_CRUISE' : 'DAF_CRUISE'}
                </span>
                <span className="text-sm font-black text-cyan-400 font-mono tracking-tighter leading-none mt-0.5">
                  OPTIMAL_RIDE
                </span>
                <span className="text-[7.5px] text-slate-400 font-mono font-bold mt-0.5">EFICIENCIA: 94.8%</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 py-1">
              {/* Speed Gauge */}
              <div className="backdrop-blur-md bg-slate-900/60 border border-white/[0.06] p-2.5 rounded-xl text-center">
                <span className="text-[8.5px] text-slate-400 font-bold block uppercase tracking-wide leading-none">Velocidad</span>
                <div className="mt-1.5 flex items-baseline justify-center gap-0.5">
                  <span className="text-lg font-black text-cyan-400 font-mono leading-none">{liveSpeed}</span>
                  <span className="text-[9px] text-slate-400 font-mono font-bold">km/h</span>
                </div>
                <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-gradient-to-r from-cyan-500 to-cyan-300 h-full transition-all duration-300 rounded-full" style={{ width: `${(liveSpeed / 100) * 100}%` }}></div>
                </div>
              </div>

              {/* RPM Gauge */}
              <div className="backdrop-blur-md bg-slate-900/60 border border-white/[0.06] p-2.5 rounded-xl text-center">
                <span className="text-[8.5px] text-slate-400 font-bold block uppercase tracking-wide leading-none">Régimen Motor</span>
                <div className="mt-1.5 flex items-baseline justify-center gap-0.5">
                  <span className="text-lg font-black text-emerald-400 font-mono leading-none">{liveRpm}</span>
                  <span className="text-[9px] text-slate-400 font-mono font-bold">RPM</span>
                </div>
                <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-300 h-full transition-all duration-300 rounded-full" style={{ width: `${(liveRpm / 2000) * 100}%` }}></div>
                </div>
              </div>

              {/* Gear and Efficiency */}
              <div className="backdrop-blur-md bg-slate-900/60 border border-white/[0.06] p-2.5 rounded-xl text-center flex flex-col justify-between">
                <div>
                  <span className="text-[8.5px] text-slate-400 font-bold block uppercase tracking-wide leading-none">Marcha</span>
                  <span className="text-base font-black text-indigo-300 font-mono block mt-1 leading-none">M{liveGear}</span>
                </div>
                <span className="text-[8px] text-emerald-400 font-mono font-extrabold block mt-1">
                  2.8 km/L ✓
                </span>
              </div>
            </div>

            {/* Altimetry / Topographical Elevation Profile synced to truck progression */}
            <div className="mt-2.5 backdrop-blur-sm bg-slate-900/45 border border-white/[0.05] px-3 py-2 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-[8.5px] font-mono text-slate-400">
                <span>Altitud Origen: <strong className="text-sky-300">{originNode.altitude}</strong></span>
                <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Perfil Altimétrico</span>
                <span>Destino: <strong className="text-emerald-300">{destNode.altitude}</strong></span>
              </div>
              <svg viewBox="0 0 100 16" className="w-full h-4 overflow-visible" preserveAspectRatio="none">
                <path d={`${elevPathD} L 98,16 L 2,16 Z`} fill="url(#gridGlow)" opacity="0.7" />
                <path d={elevPathD} fill="none" stroke="#38bdf8" strokeWidth="0.9" strokeOpacity="0.6" strokeLinecap="round" />
                <circle cx="2" cy={originAltY} r="1.4" fill="#38bdf8" />
                <circle cx="98" cy={destAltY} r="1.4" fill="#34d399" />
                <circle ref={elevDotRef} cx="2" cy={originAltY} r="2.2" fill="#ffffff" stroke="#34d399" strokeWidth="0.9" />
              </svg>
            </div>

            <div className="mt-2 text-[9px] text-slate-400 flex items-center justify-between font-mono bg-slate-900/40 border border-white/[0.04] px-3 py-1.5 rounded-xl">
              <span>Frenos Retarder: <span className="text-cyan-400 font-bold">AUTOMÁTICO</span></span>
              <span className="text-slate-600">•</span>
              <span>Eje Tractor: <span className="text-emerald-400 font-bold">ÓPTIMO</span></span>
            </div>
          </div>

          {/* Right Side: Meteorological & Station Details with Smooth Node Crossfade */}
          <AnimatePresence mode="wait">
            {selectedCity ? (
              <motion.div
                key={selectedCity.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="backdrop-blur-md sm:backdrop-blur-xl bg-slate-950/85 border border-white/[0.08] hover:border-white/[0.14] p-4 sm:p-5 rounded-2xl flex flex-col justify-between shadow-[0_15px_35px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] transition-all"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider font-mono">
                      Estación Meteorológica e Info
                    </span>
                  </div>
                  <span className="text-[9px] bg-slate-900/80 border border-white/[0.08] px-2 py-0.5 rounded-md font-mono text-slate-400 font-black leading-none">
                    {selectedCity.altitude}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.08] text-amber-400 shadow-inner">
                      {selectedCity.label === 'La Paz' || selectedCity.label === 'Oruro' ? (
                        <CloudRain className="w-5 h-5 text-sky-400" />
                      ) : selectedCity.label === 'Santa Cruz' ? (
                        <Sun className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Wind className="w-5 h-5 text-sky-300" />
                      )}
                    </div>
                    <div className="text-left">
                      <h5 className="text-white text-sm font-black tracking-tight leading-none">
                        {selectedCity.label}: <span className="text-sky-300 font-bold">{selectedCity.weather}</span>
                      </h5>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                        {selectedCity.status}
                      </p>
                      <span className="text-[8.5px] text-slate-500 font-mono block mt-1">Coords: {selectedCity.coords}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end text-right shrink-0 bg-slate-900/60 p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-[8.5px] text-slate-400 font-black uppercase tracking-wider leading-none">Temperatura</span>
                    <div className="flex items-center gap-1 mt-1 text-white font-black text-sm leading-none font-mono tabular-nums">
                      <Thermometer className="w-4 h-4 text-rose-400" />
                      {selectedCity.temp}
                    </div>
                    <div className="w-14 h-1 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-400 transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(15, (parseInt(selectedCity.temp, 10) || 10) * 3.2))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 text-[9px] text-slate-400 flex items-center justify-between font-mono backdrop-blur-md bg-slate-900/40 border border-white/[0.04] px-3 py-1.5 rounded-xl">
                  <span>Humedad: <span className="text-slate-300 font-bold tabular-nums">64%</span></span>
                  <span className="text-slate-600">·</span>
                  <span>Presión: <span className="text-slate-300 font-bold tabular-nums">1012 hPa</span></span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty-city"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="backdrop-blur-xl bg-slate-950/80 border border-white/[0.08] p-5 rounded-2xl flex items-center justify-center shadow-xl text-center text-slate-400 text-xs"
              >
                Toque un nodo de la ruta en el mapa para ver la telemetría climática local.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
}
