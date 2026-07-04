import React, { useState, useEffect } from 'react';
import { CloudRain, Compass, Eye, ShieldCheck, Sun, Thermometer, Wind, AlertCircle } from 'lucide-react';

interface RouteMiniMapProps {
  origen: string;
  destino: string;
  idViaje?: string;
  variant?: 'saul' | 'chofer';
}

interface CityNode {
  id: string;
  label: string;
  x: number;
  y: number;
  matchKeys: string[];
  altitude: string;
  weather: string;
  temp: string;
  status: string;
  coords: string;
}

const BOLIVIA_CITIES: CityNode[] = [
  { 
    id: 'lapaz', 
    label: 'La Paz', 
    x: 60, 
    y: 36, 
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
    x: 80, 
    y: 66, 
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
    x: 120, 
    y: 96, 
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
    x: 180, 
    y: 54, 
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
    x: 300, 
    y: 66, 
    matchKeys: ['santa cruz', 'santacruz', 'scz'], 
    altitude: '416m', 
    weather: 'Húmedo, Despejado', 
    temp: '27°C', 
    status: 'Tránsito fluido, calor alto',
    coords: '17.7833° S, 63.1833° W'
  },
];

// Helper to find matching node by string
const findCityNode = (cityName: string | undefined): CityNode | null => {
  if (!cityName) return null;
  const cleanName = String(cityName).toLowerCase().trim();
  return BOLIVIA_CITIES.find(city => 
    city.matchKeys.some(key => cleanName.includes(key)) ||
    cleanName.includes(city.id)
  ) || null;
};

// Route information helper
const getRouteMetadata = (orig: string | undefined, dest: string | undefined) => {
  const o = String(orig || '').toLowerCase();
  const d = String(dest || '').toLowerCase();

  if ((o.includes('la paz') && d.includes('oruro')) || (o.includes('oruro') && d.includes('la paz'))) {
    return { dist: '~230 km', msg: 'Tránsito por Doble Vía LP-OR', alert: 'Posible llovizna' };
  }
  if ((o.includes('la paz') && d.includes('cochabamba')) || (o.includes('cochabamba') && d.includes('la paz'))) {
    return { dist: '~380 km', msg: 'Ruta Troncal Central (El Sillar)', alert: 'Precaución niebla' };
  }
  if ((o.includes('la paz') && d.includes('santa cruz')) || (o.includes('santa cruz') && d.includes('la paz'))) {
    return { dist: '~850 km', msg: 'Ruta de Integración Oriental', alert: 'Control pesado activo' };
  }
  if ((o.includes('oruro') && d.includes('cochabamba')) || (o.includes('cochabamba') && d.includes('oruro'))) {
    return { dist: '~210 km', msg: 'Carretera Interdepartamental', alert: 'Tránsito normal' };
  }
  if ((o.includes('oruro') && d.includes('potosi')) || (o.includes('potosi') && d.includes('oruro'))) {
    return { dist: '~310 km', msg: 'Carretera Panamericana', alert: 'Vientos fuertes en altura' };
  }
  if ((o.includes('cochabamba') && d.includes('santa cruz')) || (o.includes('santa cruz') && d.includes('cochabamba'))) {
    return { dist: '~480 km', msg: 'Carretera Al Oriente', alert: 'Sector El Sillar estable' };
  }
  return { dist: 'Variables', msg: 'Ruta Logística Fletada', alert: 'Sincronización GPS activa' };
};

// Highway path curve mapping helper for realistic winding mountain roads
const getHighwayPath = (originId: string, destId: string): string => {
  const key = `${originId}_${destId}`;
  const paths: { [key: string]: string } = {
    // LP to OR and vice versa
    lapaz_oruro: "M 60,36 C 65,42 70,45 74,52 C 78,59 78,62 80,66",
    oruro_lapaz: "M 80,66 C 78,62 78,59 74,52 C 70,45 65,42 60,36",

    // OR to PT and vice versa
    oruro_potosi: "M 80,66 C 90,76 100,82 105,86 C 110,90 115,93 120,96",
    potosi_oruro: "M 120,96 C 115,93 110,90 105,86 C 100,82 90,76 80,66",

    // OR to CB and vice versa
    oruro_cochabamba: "M 80,66 C 105,62 130,70 145,64 C 160,58 170,55 180,54",
    cochabamba_oruro: "M 180,54 C 170,55 160,58 145,64 C 130,70 105,62 80,66",

    // CB to SC and vice versa
    cochabamba_santacruz: "M 180,54 C 210,65 220,45 240,58 C 260,70 280,60 300,66",
    santacruz_cochabamba: "M 300,66 C 280,60 260,70 240,58 C 220,45 210,65 180,54",

    // CB to PT and vice versa
    cochabamba_potosi: "M 180,54 C 160,70 145,80 135,88 C 128,92 124,94 120,96",
    potosi_cochabamba: "M 120,96 C 124,94 128,92 135,88 C 145,80 160,70 180,54",

    // LP to CB (via Oruro) and vice versa
    lapaz_cochabamba: "M 60,36 C 65,42 70,45 74,52 C 78,59 78,62 80,66 C 105,62 130,70 145,64 C 160,58 170,55 180,54",
    cochabamba_lapaz: "M 180,54 C 170,55 160,58 145,64 C 130,70 105,62 80,66 C 78,62 78,59 74,52 C 70,45 65,42 60,36",

    // LP to SC (via Oruro & Cochabamba) and vice versa
    lapaz_santacruz: "M 60,36 C 65,42 70,45 74,52 C 78,59 78,62 80,66 C 105,62 130,70 145,64 C 160,58 170,55 180,54 C 210,65 220,45 240,58 C 260,70 280,60 300,66",
    santacruz_lapaz: "M 300,66 C 280,60 260,70 240,58 C 220,45 210,65 180,54 C 170,55 160,58 145,64 C 130,70 105,62 80,66 C 78,62 78,59 74,52 C 70,45 65,42 60,36",

    // LP to PT (via Oruro) and vice versa
    lapaz_potosi: "M 60,36 C 65,42 70,45 74,52 C 78,59 78,62 80,66 C 90,76 100,82 105,86 C 110,90 115,93 120,96",
    potosi_lapaz: "M 120,96 C 115,93 110,90 105,86 C 100,82 90,76 80,66 C 78,62 78,59 74,52 C 70,45 65,42 60,36",

    // SC to OR (via Cochabamba) and vice versa
    santacruz_oruro: "M 300,66 C 280,60 260,70 240,58 C 220,45 210,65 180,54 C 170,55 160,58 145,64 C 130,70 105,62 80,66",
    oruro_santacruz: "M 80,66 C 105,62 130,70 145,64 C 160,58 170,55 180,54 C 210,65 220,45 240,58 C 260,70 280,60 300,66",

    // SC to PT (via Cochabamba & Oruro/direct) and vice versa
    santacruz_potosi: "M 300,66 C 280,60 260,70 240,58 C 220,45 210,65 180,54 C 160,70 145,80 135,88 C 128,92 124,94 120,96",
    potosi_santacruz: "M 120,96 C 124,94 128,92 135,88 C 145,80 160,70 180,54 C 210,65 220,45 240,58 C 260,70 280,60 300,66"
  };

  return paths[key] || `M 60,36 L 300,66`; // safe fallback
};

const getWaypoints = (originId: string, destId: string): { x: number; y: number }[] => {
  const key = `${originId}_${destId}`;
  const waypointsMap: { [key: string]: { x: number; y: number }[] } = {
    lapaz_oruro: [{ x: 65, y: 42 }, { x: 70, y: 45 }, { x: 74, y: 52 }, { x: 78, y: 59 }],
    oruro_lapaz: [{ x: 78, y: 59 }, { x: 74, y: 52 }, { x: 70, y: 45 }, { x: 65, y: 42 }],
    
    oruro_potosi: [{ x: 90, y: 76 }, { x: 100, y: 82 }, { x: 105, y: 86 }, { x: 110, y: 90 }, { x: 115, y: 93 }],
    potosi_oruro: [{ x: 115, y: 93 }, { x: 110, y: 90 }, { x: 105, y: 86 }, { x: 100, y: 82 }, { x: 90, y: 76 }],
    
    oruro_cochabamba: [{ x: 105, y: 62 }, { x: 130, y: 70 }, { x: 145, y: 64 }, { x: 160, y: 58 }, { x: 170, y: 55 }],
    cochabamba_oruro: [{ x: 170, y: 55 }, { x: 160, y: 58 }, { x: 145, y: 64 }, { x: 130, y: 70 }, { x: 105, y: 62 }],
    
    cochabamba_santacruz: [{ x: 210, y: 65 }, { x: 220, y: 45 }, { x: 240, y: 58 }, { x: 260, y: 70 }, { x: 280, y: 60 }],
    santacruz_cochabamba: [{ x: 280, y: 60 }, { x: 260, y: 70 }, { x: 240, y: 58 }, { x: 220, y: 45 }, { x: 210, y: 65 }],
    
    cochabamba_potosi: [{ x: 160, y: 70 }, { x: 145, y: 80 }, { x: 135, y: 88 }, { x: 128, y: 92 }, { x: 124, y: 94 }],
    potosi_cochabamba: [{ x: 124, y: 94 }, { x: 128, y: 92 }, { x: 135, y: 88 }, { x: 145, y: 80 }, { x: 160, y: 70 }],
    
    lapaz_cochabamba: [{ x: 65, y: 42 }, { x: 74, y: 52 }, { x: 80, y: 66 }, { x: 115, y: 63 }, { x: 145, y: 64 }, { x: 165, y: 56 }],
    cochabamba_lapaz: [{ x: 165, y: 56 }, { x: 145, y: 64 }, { x: 115, y: 63 }, { x: 80, y: 66 }, { x: 74, y: 52 }, { x: 65, y: 42 }],

    lapaz_santacruz: [{ x: 65, y: 42 }, { x: 80, y: 66 }, { x: 130, y: 70 }, { x: 180, y: 54 }, { x: 240, y: 58 }, { x: 280, y: 60 }],
    santacruz_lapaz: [{ x: 280, y: 60 }, { x: 240, y: 58 }, { x: 180, y: 54 }, { x: 130, y: 70 }, { x: 80, y: 66 }, { x: 65, y: 42 }],

    lapaz_potosi: [{ x: 65, y: 42 }, { x: 80, y: 66 }, { x: 100, y: 82 }, { x: 110, y: 90 }, { x: 115, y: 93 }],
    potosi_lapaz: [{ x: 115, y: 93 }, { x: 110, y: 90 }, { x: 100, y: 82 }, { x: 80, y: 66 }, { x: 65, y: 42 }],

    santacruz_oruro: [{ x: 280, y: 60 }, { x: 240, y: 58 }, { x: 180, y: 54 }, { x: 145, y: 64 }, { x: 105, y: 62 }],
    oruro_santacruz: [{ x: 105, y: 62 }, { x: 145, y: 64 }, { x: 180, y: 54 }, { x: 240, y: 58 }, { x: 280, y: 60 }],

    santacruz_potosi: [{ x: 280, y: 60 }, { x: 240, y: 58 }, { x: 180, y: 54 }, { x: 145, y: 80 }, { x: 128, y: 92 }],
    potosi_santacruz: [{ x: 128, y: 92 }, { x: 145, y: 80 }, { x: 180, y: 54 }, { x: 240, y: 58 }, { x: 280, y: 60 }]
  };
  return waypointsMap[key] || [];
};

export default function RouteMiniMap({ origen, destino, idViaje, variant = 'saul' }: RouteMiniMapProps) {
  const originNode = findCityNode(origen) || findCityNode('La Paz') || BOLIVIA_CITIES[0];
  const destNode = findCityNode(destino) || findCityNode('Oruro') || BOLIVIA_CITIES[1];
  const metadata = getRouteMetadata(origen || 'La Paz', destino || 'Oruro');

  const [selectedCity, setSelectedCity] = useState<CityNode | null>(destNode || originNode || null);
  const [liveSpeed, setLiveSpeed] = useState<number>(81.5);
  const [liveRpm, setLiveRpm] = useState<number>(1420);
  const [liveGear, setLiveGear] = useState<number>(11);

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

  const isRouteConnected = originNode && destNode;
  const highwayPath = isRouteConnected ? getHighwayPath(originNode.id, destNode.id) : '';
  const activeWaypoints = isRouteConnected ? getWaypoints(originNode.id, destNode.id) : [];

  return (
    <div id={`minimap-${idViaje || 'demo'}`} className="space-y-3 w-full">
      <div className="bg-[#030915] border border-slate-800/80 rounded-2xl overflow-hidden relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[8/3] min-h-[160px] sm:min-h-[180px] transition duration-300 select-none shadow-2xl">
        <div className="absolute inset-0 w-full h-full">
          
          {/* Neon style overrides and optimizations */}
          <style>{`
            @keyframes dashEffect {
              to {
                stroke-dashoffset: -24;
              }
            }
            @keyframes headlightPulse {
              0%, 100% { opacity: 0.65; }
              50% { opacity: 0.95; }
            }
            @keyframes taillightPulse {
              0%, 100% { opacity: 0.8; }
              50% { opacity: 0.45; }
            }
            @keyframes radarRotation {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes scanline {
              0% { transform: translateY(-100%); }
              100% { transform: translateY(100%); }
            }
            @keyframes drawRoute {
              0% { stroke-dashoffset: 100; opacity: 0; }
              5% { opacity: 1; }
              95% { stroke-dashoffset: 0; opacity: 1; }
              98% { stroke-dashoffset: 0; opacity: 0; }
              100% { stroke-dashoffset: 0; opacity: 0; }
            }
            @keyframes truckFade {
              0% { opacity: 0; }
              5% { opacity: 1; }
              92% { opacity: 1; }
              98% { opacity: 0; }
              100% { opacity: 0; }
            }
            @keyframes radarPing {
              0% { transform: scale(0.5); opacity: 0.8; }
              100% { transform: scale(2.5); opacity: 0; }
            }
            @keyframes dashFlow {
              to { stroke-dashoffset: -50; }
            }
            @keyframes rotatingBracket {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .animate-route-dash {
              animation: dashEffect 0.6s linear infinite;
            }
            .animate-draw-route {
              animation: drawRoute 10s linear infinite;
            }
            .animate-truck-fade {
              animation: truckFade 10s linear infinite;
            }
            .animate-radar-ping {
              animation: radarPing 3s cubic-bezier(0, 0, 0.2, 1) infinite;
            }
            .animate-dash-flow {
              animation: dashFlow 2s linear infinite;
            }
            .animate-radar-sweep {
              animation: radarRotation 4s linear infinite;
              transform-origin: center;
            }
            .animate-rotating-bracket {
              animation: rotatingBracket 10s linear infinite;
            }
            .animate-headlight-flicker {
              animation: headlightPulse 0.12s ease-in-out infinite alternate;
            }
            .animate-taillight-flicker {
              animation: taillightPulse 0.2s ease-in-out infinite alternate;
            }
            .animate-radar-sweep {
              animation: radarRotation 8s linear infinite;
              transform-origin: 200px 75px;
            }
            @keyframes truckVibe {
              0% { transform: translate3d(0px, 0px, 0); }
              25% { transform: translate3d(0.12px, 0.08px, 0); }
              50% { transform: translate3d(-0.08px, -0.12px, 0); }
              75% { transform: translate3d(0.08px, -0.08px, 0); }
              100% { transform: translate3d(0px, 0px, 0); }
            }
            .animate-truck-vibe {
              animation: truckVibe 0.18s linear infinite;
              transform-origin: center;
            }
            .gpu-accelerated {
              transform: translate3d(0,0,0);
              backface-visibility: hidden;
              perspective: 1000px;
              will-change: transform, opacity;
              touch-action: manipulation;
            }
          `}</style>

        {/* Ambient Topography Scanline overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0ea5e9]/5 to-transparent pointer-events-none h-full w-full"
             style={{ animation: 'scanline 4s linear infinite' }} />

        {/* SVG Map view */}
        <svg
          viewBox="0 0 400 150"
          className="w-full h-full text-slate-800/50 gpu-accelerated"
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
          <rect width="400" height="150" fill="url(#topographyGrad)" pointerEvents="none" />
          <rect width="400" height="150" fill="url(#gridGlow)" pointerEvents="none" />

          {/* Subtle Mountain Ridges background vectors for the majestic Andes in the West */}
          <path 
            d="M -10,150 L 30,110 L 70,135 L 110,105 L 150,130 L 190,110 L 220,150 Z" 
            fill="#1e293b" 
            fillOpacity="0.04" 
            stroke="#334155" 
            strokeWidth="0.5" 
            strokeOpacity="0.08" 
          />
          <path 
            d="M -10,150 L 50,120 L 100,140 L 130,115 L 175,138 L 210,125 L 240,150 Z" 
            fill="#0f172a" 
            fillOpacity="0.06" 
            stroke="#475569" 
            strokeWidth="0.5" 
            strokeOpacity="0.12" 
          />

          {/* BACKGROUND ROAD NETWORK CONNECTIONS (Sleek delicate curved highways for realistic background detail) */}
          <g stroke="#101a2e" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5" fill="none">
            {/* LP ➔ OR */}
            <path d="M 60,36 C 65,42 70,45 74,52 C 78,59 78,62 80,66" />
            {/* OR ➔ PT */}
            <path d="M 80,66 C 90,76 100,82 105,86 C 110,90 115,93 120,96" />
            {/* OR ➔ CB */}
            <path d="M 80,66 C 105,62 130,70 145,64 C 160,58 170,55 180,54" />
            {/* CB ➔ SC */}
            <path d="M 180,54 C 210,65 220,45 240,58 C 260,70 280,60 300,66" />
            {/* CB ➔ PT */}
            <path d="M 180,54 C 160,70 145,80 135,88 C 128,92 124,94 120,96" />
          </g>

          {/* ACTIVE TRAVEL TRUNK ROAD (High intensity curved glow) */}
          {isRouteConnected && (
            <g>
              {/* Ultra thick dark asphalt highway base */}
              <path
                d={highwayPath}
                stroke="#020815"
                strokeWidth="11"
                strokeLinecap="round"
                fill="none"
              />
              {/* Real road asphalt lane overlay */}
              <path
                d={highwayPath}
                stroke="#1e293b"
                strokeWidth="6.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* White shoulder lane borders */}
              <path
                d={highwayPath}
                stroke="#ffffff"
                strokeWidth="5.5"
                strokeOpacity="0.15"
                strokeLinecap="round"
                fill="none"
              />
              {/* Solid asphalt separator */}
              <path
                d={highwayPath}
                stroke="#0f172a"
                strokeWidth="4.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Center yellow divider line */}
              <path
                d={highwayPath}
                stroke="#f59e0b"
                strokeWidth="0.75"
                strokeDasharray="4,4"
                strokeOpacity="0.7"
                fill="none"
              />

              <path
                d={highwayPath}
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeOpacity="0.45"
                strokeLinecap="round"
                filter="url(#neonGlow)"
                fill="none"
              />

              {/* Glowing Neon Vector Path Overlay (Progressive Draw in brilliant white) */}
              <path
                d={highwayPath}
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#neonGlow)"
                fill="none"
                pathLength="100"
                strokeDasharray="100 100"
                className="animate-draw-route"
              />
              
              <path
                d={highwayPath}
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                pathLength="100"
                strokeDasharray="100 100"
                className="animate-draw-route"
              />

              {/* Moving white dash indicators on route */}
              <path
                d={highwayPath}
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray="4, 12"
                className="animate-dash-flow"
                fill="none"
                opacity="0.95"
              />

              {/* Render Path Waypoints (Puntos de Camino) as elegant minimalist white dots */}
              {activeWaypoints.map((pt, idx) => (
                <circle key={`waypoint-${idx}`} cx={pt.x} cy={pt.y} r="1.5" fill="#ffffff" opacity="0.85" />
              ))}

              {/* Invisible path wrapper for precise vehicle curve follow */}
              <path
                id={`route-path-${idViaje || 'demo'}`}
                d={highwayPath}
                fill="none"
                stroke="none"
              />

              {/* HEAVY CARGO TRUCK: Ultimate detailed vector design & organic easing motion */}
              {/* Truck Ghost Trails */}
              {variant === 'saul' && [1, 2, 3].map((ghostIndex) => (
                 <g key={`ghost-${ghostIndex}`} className="gpu-accelerated animate-truck-fade" opacity={0.15 - (ghostIndex * 0.04)}>
                   <animateMotion 
                     dur="10s" 
                     repeatCount="indefinite" 
                     rotate="auto"
                     calcMode="linear"
                     keyTimes="0;0.05;0.95;1"
                     keyPoints="0;0;1;1"
                     begin={`-${ghostIndex * 0.2}s`}
                   >
                     <mpath href={`#route-path-${idViaje || 'demo'}`} />
                   </animateMotion>
                   <g transform="translate(0, 0) scale(0.6)">
                     <rect x="-23" y="-5.5" width="22" height="11" rx="1" fill="#38bdf8" />
                     <path d="M 0,-4.5 L 9,-4 L 10.5,-2 L 10.5,2 L 9,4 L 0,4.5 Z" fill="#38bdf8" />
                   </g>
                 </g>
              ))}

              <g className="gpu-accelerated animate-truck-fade">
                <animateMotion 
                  dur="10s" 
                  repeatCount="indefinite" 
                  rotate="auto"
                  calcMode="linear"
                  keyTimes="0;0.05;0.95;1"
                  keyPoints="0;0;1;1"
                >
                  <mpath href={`#route-path-${idViaje || 'demo'}`} />
                </animateMotion>
                
                {/* 🌟 PREMIUM DYNAMIC LIGHTS (Movable headlights, Taillights, lasers) */}
                {/* Wide golden fog lights fan */}
                <polygon 
                  points="12,0 55,-22 55,22" 
                  fill="url(#headlightGlow)" 
                  pointerEvents="none" 
                  className="animate-headlight-flicker"
                  style={{ mixBlendMode: 'screen' }}
                />
                {/* High beam narrow blue-laser headlights */}
                <polygon 
                  points="12,0 80,-8 80,8" 
                  fill="url(#laserBeam)" 
                  pointerEvents="none" 
                  opacity="0.8"
                  className="animate-headlight-flicker"
                  style={{ mixBlendMode: 'screen' }}
                />
                
                {/* Red warning taillights reflection fans */}
                <polygon 
                  points="-18,0 -45,-12 -45,12" 
                  fill="url(#taillightGlow)" 
                  pointerEvents="none" 
                  className="animate-taillight-flicker"
                  style={{ mixBlendMode: 'screen' }}
                />

                {/* Holographic HUD trip overlay directly above the moving vehicle */}
                {variant === 'saul' && (
                  <g transform="translate(0, -18)" className="pointer-events-none">
                    {/* Glowing Location Pin Marker */}
                    <g transform="translate(0, 5)">
                      {/* Pulsing base */}
                      <ellipse cx="0" cy="8" rx="8" ry="4" fill="#38bdf8" fillOpacity="0.3">
                        <animate attributeName="rx" values="4;16;4" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="ry" values="2;8;2" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                      </ellipse>
                      
                      {/* Secondary sonar ping for the base */}
                      <circle cx="0" cy="8" r="4" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6">
                         <animate attributeName="r" values="4;24" dur="2s" repeatCount="indefinite" />
                         <animate attributeName="opacity" values="0.6;0" dur="2s" repeatCount="indefinite" />
                      </circle>

                      {/* Floating Pin */}
                      <g className="animate-bounce" style={{ animationDuration: '2s' }}>
                        <path d="M0,0 C-5,-5 -8,-10 -8,-14 C-8,-18.4 4,-22 0,-22 C4,-22 8,-18.4 8,-14 C8,-10 5,-5 0,0 Z" fill="url(#laserBeam)" stroke="#38bdf8" strokeWidth="0.8" filter="url(#neonGlow)" />
                        <circle cx="0" cy="-14" r="4" fill="#020817" stroke="#38bdf8" strokeWidth="1" />
                        {/* Inner dot */}
                        <circle cx="0" cy="-14" r="2" fill="#10b981" className="animate-pulse" />
                        {/* Scanner beam from pin */}
                        <polygon points="0,-14 -15,5 15,5" fill="url(#laserBeam)" opacity="0.4">
                           <animate attributeName="opacity" values="0.1;0.4;0.1" dur="1s" repeatCount="indefinite" />
                        </polygon>
                      </g>
                    </g>

                    {/* Holographic background border with glassmorphism */}
                    <rect x="-38" y="-32.5" width="76" height="13.5" rx="4" fill="#020817" fillOpacity="0.88" stroke="#0ea5e9" strokeWidth="1" filter="url(#neonGlow)" />
                    {/* Outer border cyan glow */}
                    <rect x="-38" y="-32.5" width="76" height="13.5" rx="4" fill="none" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.7" />
                    
                    {/* HUD Text: Destination Indicator */}
                    <text x="0" y="-23.5" textAnchor="middle" fill="#38bdf8" fontSize="5.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.8">
                      {origen.toUpperCase()} ➔ {destino.toUpperCase()}
                    </text>
                    
                    {/* Bottom neon HUD line */}
                    <line x1="-30" y1="-21.5" x2="30" y2="-21.5" stroke="#38bdf8" strokeWidth="0.4" strokeOpacity="0.6" />
                    
                    {/* Dynamic tracking status */}
                    <text x="0" y="-14" textAnchor="middle" fill="#10b981" fontSize="4.5" fontWeight="900" fontFamily="monospace" letterSpacing="0.5" className="animate-pulse">
                      🛰️ EN RUTA ACTIVA
                    </text>
                  </g>
                )}

                {/* 🚛 HIGH-FIDELITY TOP-DOWN TRUCK (Accurate 3D Depth View) WITH DIESEL ENGINE VIBRATION */}
                <g className="animate-truck-vibe" transform="translate(0, 0) scale(0.6)">
                  {/* Cyber Underglow (Cyan/Blue Neon) */}
                  <rect x="-24" y="-7.5" width="38" height="15" rx="2" stroke="#38bdf8" strokeWidth="1.2" fill="none" opacity="0.65" filter="url(#neonGlow)" />
                  <rect x="-22" y="-5.5" width="34" height="11" rx="1.5" fill="#00f2ff" opacity="0.32" filter="url(#neonGlow)" />

                  {/* --- HEAVY CARGO TRAILER --- */}
                  {/* Base chassis shadow */}
                  <rect x="-23" y="-5.5" width="22" height="11" rx="1" fill="#020617" />
                  {/* Textured Brushed Aluminum container box */}
                  <rect x="-23" y="-5.5" width="22" height="11" rx="1" fill="url(#trailerGrad)" stroke="#475569" strokeWidth="0.8" />
                  {/* Center shiny roof crown line */}
                  <line x1="-22" y1="0" x2="-2" y2="0" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.5" />
                  {/* Structural Ribs on Roof */}
                  {[-21, -18, -15, -12, -9, -6, -3].map((rx, idx) => (
                     <line key={`roof-rib-${idx}`} x1={rx} y1="-5.5" x2={rx} y2="5.5" stroke="#334155" strokeWidth="0.5" opacity="0.7" />
                  ))}

                  {/* Connection Coupler (Fifth Wheel area) */}
                  <rect x="-2" y="-2" width="5" height="4" fill="#0f172a" stroke="#334155" strokeWidth="0.5" rx="0.5" />
                  <circle cx="1" cy="0" r="1.5" fill="url(#chromeGrad)" />

                  {/* --- CABIN BODY --- */}
                  {/* Cabin Chassis Base */}
                  <path d="M 0,-4.5 L 9,-4 L 11,-2.5 L 11,2.5 L 9,4 L 0,4.5 Z" fill="#0f172a" />
                  
                  {/* Cabin Shell using Red cabGrad */}
                  <path d="M 0,-4.5 L 9,-4 L 10.5,-2 L 10.5,2 L 9,4 L 0,4.5 Z" fill="url(#cabGrad)" stroke="#ef4444" strokeWidth="0.6" />
                  
                  {/* Glossy Curved Windshield */}
                  <path d="M 7,-3.5 C 9.5,-3 10,-1 10,0 C 10,1 9.5,3 7,3.5 C 7.5,1.5 7.5,-1.5 7,-3.5 Z" fill="url(#windowGrad)" stroke="#1e293b" strokeWidth="0.4" />
                  {/* Skylight on Roof */}
                  <rect x="2" y="-1.5" width="3" height="3" rx="0.5" fill="url(#windowGrad)" stroke="#1e293b" strokeWidth="0.4" opacity="0.9" />

                  {/* Left Side Mirror */}
                  <path d="M 8,-4.2 L 6.5,-6 L 4.5,-6 L 6,-4" fill="url(#chromeGrad)" stroke="#334155" strokeWidth="0.4" />
                  {/* Right Side Mirror */}
                  <path d="M 8,4.2 L 6.5,6 L 4.5,6 L 6,4" fill="url(#chromeGrad)" stroke="#334155" strokeWidth="0.4" />

                  {/* Chrome Exhaust Stack Tips */}
                  <rect x="-1" y="-5.5" width="2" height="1.2" rx="0.3" fill="url(#chromeGrad)" stroke="#475569" strokeWidth="0.4" />
                  <rect x="-1" y="4.3" width="2" height="1.2" rx="0.3" fill="url(#chromeGrad)" stroke="#475569" strokeWidth="0.4" />

                  {/* 💨 DUAL LIVE EXHAUST SMOKE PUFFS (Drifting and fading dynamically behind) */}
                  <g>
                    <circle cx="-1" cy="-5" r="1.5" fill="#38bdf8" fillOpacity="0.4">
                      <animate attributeName="r" values="1.5;4;6" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0.3;0" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="cx" values="-1;-8;-16" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="-1" cy="5" r="1.5" fill="#38bdf8" fillOpacity="0.4">
                      <animate attributeName="r" values="1.5;4;6" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0.3;0" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="cx" values="-1;-8;-16" dur="1s" repeatCount="indefinite" />
                    </circle>
                  </g>

                  {/* Symmetrical Wheels (visible from above) */}
                  <g fill="#020617" stroke="#475569" strokeWidth="0.5">
                    {/* Trailer Left Wheels */}
                    <rect x="-21" y="-6.5" width="3.5" height="2" rx="0.5" />
                    <rect x="-16" y="-6.5" width="3.5" height="2" rx="0.5" />
                    <rect x="-11" y="-6.5" width="3.5" height="2" rx="0.5" />
                    {/* Trailer Right Wheels */}
                    <rect x="-21" y="4.5" width="3.5" height="2" rx="0.5" />
                    <rect x="-16" y="4.5" width="3.5" height="2" rx="0.5" />
                    <rect x="-11" y="4.5" width="3.5" height="2" rx="0.5" />
                    
                    {/* Cabin Left Wheels */}
                    <rect x="-3" y="-5.5" width="3.5" height="1.8" rx="0.5" />
                    <rect x="6" y="-5" width="3" height="1.5" rx="0.5" />
                    {/* Cabin Right Wheels */}
                    <rect x="-3" y="3.7" width="3.5" height="1.8" rx="0.5" />
                    <rect x="6" y="3.5" width="3" height="1.5" rx="0.5" />
                  </g>

                  {/* Amber safety side LED dot markers */}
                  {[-22, -15, -8, -1].map((cx, idx) => (
                    <g key={`marker-amber-${idx}`}>
                       <circle cx={cx} cy="-5.5" r="0.6" fill="#f59e0b" className="animate-pulse" />
                       <circle cx={cx} cy="5.5" r="0.6" fill="#f59e0b" className="animate-pulse" />
                    </g>
                  ))}

                  {/* Rear security red LED indicator taillights */}
                  <circle cx="-23" cy="-4.5" r="0.8" fill="#ef4444" className="animate-pulse" />
                  <circle cx="-23" cy="4.5" r="0.8" fill="#ef4444" className="animate-pulse" />
                </g>
              </g>
            </g>
          )}

          {/* Render Bolivia Network Hubs */}
          {BOLIVIA_CITIES.map((city) => {
            const isOrigin = originNode?.id === city.id;
            const isDest = destNode?.id === city.id;
            const isActive = isOrigin || isDest;
            const isSelected = selectedCity?.id === city.id;

            return (
              <g key={city.id} className="transition-all duration-300">
                {/* Interactive Touch Target - Enlarged to 48px diameter for maximum mobile finger tap accuracy! */}
                <circle
                  cx={city.x}
                  cy={city.y}
                  r="24"
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => setSelectedCity(city)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    setSelectedCity(city);
                  }}
                />

                {/* Clean, static highlighted ring for current destination */}
                {isDest && (
                  <circle cx={city.x} cy={city.y} r="11" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.4" />
                )}

                {/* City node outer ring with high-contrast tactical design */}
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={isSelected ? 6.5 : isActive ? 5 : 3.5}
                  fill={isSelected ? '#ffffff' : isActive ? '#0ea5e9' : '#1e293b'}
                  stroke={isSelected ? '#38bdf8' : isActive ? '#38bdf8' : '#475569'}
                  strokeWidth={isSelected ? 2 : isActive ? 1.5 : 1}
                  className="transition-all duration-300 cursor-pointer hover:stroke-sky-300"
                  onClick={() => setSelectedCity(city)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    setSelectedCity(city);
                  }}
                />

                {/* Rotating Cyber Brackets for Active Points */}
                {(isOrigin || isDest) && (
                  <g transform={`translate(${city.x}, ${city.y})`} className="animate-rotating-bracket pointer-events-none">
                    <path d="M -9 -5 L -9 -9 L -5 -9" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
                    <path d="M 9 -5 L 9 -9 L 5 -9" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
                    <path d="M 9 5 L 9 9 L 5 9" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
                    <path d="M -9 5 L -9 9 L -5 9" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
                  </g>
                )}

                {/* Tech Label HUD under the city */}
                <text
                  x={city.x}
                  y={city.y - 11}
                  textAnchor="middle"
                  fill={isSelected ? '#ffffff' : isActive ? '#e0f2fe' : '#64748b'}
                  fontSize={isSelected ? '9' : '7.5'}
                  fontWeight={isSelected ? '900' : '700'}
                  fontFamily="sans-serif"
                  className="transition-all duration-300 select-none pointer-events-none drop-shadow-[0_1.5px_3px_rgba(0,0,0,1)]"
                >
                  {city.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Top Left Floating GPS HUD */}
        {(variant === 'saul' || variant === 'chofer') && (
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-0.5 pointer-events-none">
            <span className="backdrop-blur-md bg-slate-950/85 text-[#38bdf8] text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-[#0ea5e9]/30 shadow-lg leading-none flex items-center gap-1.5">
              <Compass className="w-2.5 h-2.5 animate-spin-slow text-[#38bdf8]" />
              SATELLITE TRUCK LOCK • {metadata.dist}
            </span>
            <span className="text-[8px] text-slate-300 font-bold uppercase tracking-wide pl-0.5 leading-none mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
              {metadata.msg}
            </span>
          </div>
        )}

        {/* Alert box warning indicators in upper right */}
        {(variant === 'saul' || variant === 'chofer') && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 pointer-events-none">
            <span className="backdrop-blur-md bg-rose-950/40 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="w-2 h-2 text-rose-400" />
              {metadata.alert}
            </span>
          </div>
        )}

        {/* Real-time telemetry connection status indicators (Bottom Right) */}
        {(variant === 'saul' || variant === 'chofer') && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 backdrop-blur-md bg-slate-950/90 px-2.5 py-0.5 rounded-md border border-slate-800/90 shadow-xl">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0ea5e9] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0ea5e9]"></span>
            </span>
            <span className="text-[8px] font-mono font-black text-slate-300 uppercase tracking-widest">
              {isRouteConnected ? 'RT_FEED_ACTIVE' : 'FEED_WAIT'}
            </span>
          </div>
        )}
        </div>
      </div>



      {(variant === 'saul' || variant === 'chofer') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Side: Real-time Live Truck Cockpit Telemetry */}
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/90 p-4 rounded-2xl flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-[9px] text-cyan-400 font-extrabold uppercase tracking-wider font-mono">
                  🛰️ Telemetría de Cabina (En Vivo)
                </span>
              </div>
              <span className="text-[8px] text-slate-400 font-mono font-bold">SCANIA R500 OPTICRUISE</span>
            </div>

          {/* 🚛 LIVE SIDE-PROFILE DRIVING CONTROLS & PARALLAX TRACKER */}
          <div className="h-16 w-full bg-gradient-to-r from-slate-950/70 to-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden relative mb-2 flex items-center justify-between px-3">
            {/* Parallax Moving Landscape (animated lines to simulate speed) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
              {/* Mountain ridge outline sliding right-to-left */}
              <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="absolute bottom-1.5 left-0 w-[200%] h-6 text-slate-700">
                <path d="M 0,20 L 15,10 L 30,17 L 45,5 L 60,15 L 75,8 L 90,18 L 100,20 L 115,10 L 130,17 L 145,5 L 160,15 L 175,8 L 190,18 L 200,20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <animateTransform 
                  attributeName="transform" 
                  type="translate" 
                  from="0 0" 
                  to="-100 0" 
                  dur="8s" 
                  repeatCount="indefinite" 
                />
              </svg>
              {/* Road dashes sliding left-to-right (truck moving forward) */}
              <svg viewBox="0 0 100 2" preserveAspectRatio="none" className="absolute bottom-0.5 left-0 w-[200%] h-1 text-slate-500">
                <line x1="0" y1="1" x2="200" y2="1" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3,6" />
                <animateTransform 
                  attributeName="transform" 
                  type="translate" 
                  from="0 0" 
                  to="-50 0" 
                  dur="0.8s" 
                  repeatCount="indefinite" 
                />
              </svg>
            </div>

            {/* Scale-down Profile Truck SVG container */}
            <div className="w-24 h-12 relative z-10 select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              <svg viewBox="-20 -15 38 23" className="w-full h-full" fill="none">
                {/* Underglow */}
                <rect x="-17" y="2" width="28" height="2" rx="1" fill="#00f2ff" opacity="0.45" filter="url(#neonGlow)" />
                {/* Frame */}
                <rect x="-16.5" y="1" width="26.5" height="1.8" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                {/* Trailer */}
                <rect x="-17" y="-9.5" width="16" height="10.5" rx="0.5" fill="url(#trailerGrad)" stroke="#475569" strokeWidth="0.8" />
                {[-15.2, -11.8, -8.4, -5.0, -1.6].map((rx, idx) => (
                  <line key={`p-rib-${idx}`} x1={rx} y1="-9" x2={rx} y2="0.5" stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.4" />
                ))}
                {[-15.0, -11.6, -8.2, -4.8, -1.4].map((rx, idx) => (
                  <line key={`p-rib-sh-${idx}`} x1={rx} y1="-9" x2={rx} y2="0.5" stroke="#334155" strokeWidth="0.4" strokeOpacity="0.5" />
                ))}
                {/* Branding */}
                <rect x="-17" y="-5.5" width="16" height="1.6" fill="#0284c7" fillOpacity="0.9" />
                <rect x="-17" y="-4.2" width="16" height="0.4" fill="#f59e0b" fillOpacity="0.9" />
                <text x="-9" y="-6.5" textAnchor="middle" fill="#0f172a" fontSize="1.8" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.3">DON SAÚL</text>
                <text x="-9" y="-2.5" textAnchor="middle" fill="#ffffff" fontSize="1.3" fontWeight="800" fontFamily="sans-serif" letterSpacing="0.2">EXPRESO</text>
                
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
              </svg>
            </div>

            {/* Beautiful digital HUD telemetry indicator */}
            <div className="flex flex-col items-end text-right border-l border-slate-800/60 pl-3 py-1 relative z-10">
              <span className="text-[7.5px] text-emerald-400 font-black uppercase tracking-widest font-mono">SCANIA_CRUISE</span>
              <span className="text-sm font-black text-cyan-400 font-mono tracking-tighter leading-none mt-0.5">
                OPTIMAL_RIDE
              </span>
              <span className="text-[7px] text-slate-500 font-mono font-bold mt-0.5">EFFICIENCY: 94.8%</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1">
            {/* Speed Gauge */}
            <div className="bg-slate-900/60 border border-slate-850 p-2 rounded-xl text-center">
              <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wide leading-none">Velocidad</span>
              <div className="mt-1.5 flex items-baseline justify-center gap-0.5">
                <span className="text-base font-black text-cyan-400 font-mono leading-none">{liveSpeed}</span>
                <span className="text-[8px] text-slate-400 font-mono font-bold">km/h</span>
              </div>
              <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden mt-1.5">
                <div className="bg-cyan-400 h-full transition-all duration-300" style={{ width: `${(liveSpeed / 100) * 100}%` }}></div>
              </div>
            </div>

            {/* RPM Gauge */}
            <div className="bg-slate-900/60 border border-slate-850 p-2 rounded-xl text-center">
              <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wide leading-none">Régimen Motor</span>
              <div className="mt-1.5 flex items-baseline justify-center gap-0.5">
                <span className="text-base font-black text-emerald-400 font-mono leading-none">{liveRpm}</span>
                <span className="text-[8px] text-slate-400 font-mono font-bold">RPM</span>
              </div>
              <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden mt-1.5">
                <div className="bg-emerald-400 h-full transition-all duration-300" style={{ width: `${(liveRpm / 2000) * 100}%` }}></div>
              </div>
            </div>

            {/* Gear and Efficiency */}
            <div className="bg-slate-900/60 border border-slate-850 p-2 rounded-xl text-center flex flex-col justify-between">
              <div>
                <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wide leading-none">Marcha</span>
                <span className="text-sm font-black text-indigo-400 font-mono block mt-1 leading-none">M{liveGear}</span>
              </div>
              <span className="text-[8px] text-emerald-400/90 font-mono font-extrabold block mt-1">
                2.8 km/L ✓
              </span>
            </div>
          </div>

          <div className="mt-2 text-[9px] text-slate-400 flex items-center justify-between font-mono bg-slate-900/40 px-2 py-1 rounded-lg">
            <span>Frenos Retarder: <span className="text-cyan-400 font-bold">AUTOMÁTICO</span></span>
            <span>•</span>
            <span>Eje Tractor: <span className="text-emerald-400 font-bold">ÓPTIMO</span></span>
          </div>
        </div>

        {/* Right Side: Meteorological & Station Details */}
        {selectedCity ? (
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/90 p-4 rounded-2xl flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-[9px] text-amber-400 font-extrabold uppercase tracking-wider font-mono">
                  🌦️ Estación Meteorológica e Info
                </span>
              </div>
              <span className="text-[8.5px] bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded font-mono text-slate-400 font-black leading-none">
                {selectedCity.altitude}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-amber-400 shadow-inner">
                  {selectedCity.label === 'La Paz' || selectedCity.label === 'Oruro' ? (
                    <CloudRain className="w-5 h-5 text-sky-400" />
                  ) : selectedCity.label === 'Santa Cruz' ? (
                    <Sun className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Wind className="w-5 h-5 text-sky-300" />
                  )}
                </div>
                <div className="text-left">
                  <h5 className="text-white text-xs font-black tracking-tight leading-none">
                    {selectedCity.label}: <span className="text-sky-300 font-bold">{selectedCity.weather}</span>
                  </h5>
                  <p className="text-[9.5px] text-slate-400 leading-normal mt-1 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-sky-400" />
                    {selectedCity.status}
                  </p>
                  <span className="text-[8px] text-slate-500 font-mono block mt-0.5">Coords: {selectedCity.coords}</span>
                </div>
              </div>

              <div className="flex flex-col items-end text-right shrink-0 bg-slate-900/50 p-2 rounded-xl border border-slate-850">
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider leading-none">Temperatura</span>
                <div className="flex items-center gap-0.5 mt-1 text-white font-black text-xs leading-none">
                  <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                  {selectedCity.temp}
                </div>
              </div>
            </div>

            <div className="mt-2 text-[9px] text-slate-400 flex items-center justify-between font-mono bg-slate-900/40 px-2 py-1 rounded-lg">
              <span>Humedad: <span className="text-slate-300 font-bold">64%</span></span>
              <span>•</span>
              <span>Presión Atmo: <span className="text-slate-300 font-bold">1012 hPa</span></span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/90 p-4 rounded-2xl flex items-center justify-center shadow-xl text-center text-slate-400 text-xs">
            Toque un nodo de la ruta en el mapa para ver la telemetría climática local.
          </div>
        )}
      </div>
      )}

    </div>
  );
}
