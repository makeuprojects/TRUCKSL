import React, { useState } from 'react';
import { CloudRain, Compass, Eye, ShieldCheck, Sun, Thermometer, Wind, AlertCircle } from 'lucide-react';

interface RouteMiniMapProps {
  origen: string;
  destino: string;
  idViaje?: string;
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

export default function RouteMiniMap({ origen, destino, idViaje }: RouteMiniMapProps) {
  const originNode = findCityNode(origen);
  const destNode = findCityNode(destino);
  const metadata = getRouteMetadata(origen, destino);

  const [selectedCity, setSelectedCity] = useState<CityNode | null>(destNode || originNode || null);

  const isRouteConnected = originNode && destNode;
  const highwayPath = isRouteConnected ? getHighwayPath(originNode.id, destNode.id) : '';

  return (
    <div id={`minimap-${idViaje || 'demo'}`} className="space-y-3 w-full">
      <div className="bg-[#030915] border border-slate-800/80 rounded-2xl overflow-hidden relative w-full aspect-[8/3] min-h-[145px] transition duration-300 select-none shadow-2xl">
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
            .animate-route-dash {
              animation: dashEffect 0.6s linear infinite;
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
            .gpu-accelerated {
              transform: translate3d(0,0,0);
              will-change: transform, opacity;
            }
          `}</style>

        {/* Ambient Topography Scanline overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0ea5e9]/5 to-transparent pointer-events-none h-full w-full"
             style={{ animation: 'scanline 4s linear infinite' }} />

        {/* SVG Map view */}
        <svg
          viewBox="0 0 400 150"
          className="w-full h-full text-slate-800/50 gpu-accelerated"
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
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
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

          {/* Tactical grid background overlay */}
          <g stroke="#0ea5e9" strokeWidth="0.15" strokeOpacity="0.15">
            {[25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375].map(x => (
              <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="150" strokeDasharray="1,6" />
            ))}
            {[15, 30, 45, 60, 75, 90, 105, 120, 135].map(y => (
              <line key={`h-${y}`} x1="0" y1={y} x2={400} y2={y} strokeDasharray="1,6" />
            ))}
          </g>

          {/* Topographical Height Contours (Futuristic concentric lines around highlands) */}
          <g stroke="#0ea5e9" strokeWidth="0.2" strokeOpacity="0.15" fill="none">
            {/* La Paz (High Mountain) contours */}
            <circle cx="60" cy="36" r="18" strokeDasharray="2,3" />
            <circle cx="60" cy="36" r="32" strokeDasharray="2,5" />
            {/* Potosí (Extremely High Mountain) contours */}
            <circle cx="120" cy="96" r="15" strokeDasharray="2,3" />
            <circle cx="120" cy="96" r="28" strokeDasharray="2,5" />
          </g>

          {/* BACKGROUND ROAD NETWORK CONNECTIONS (Sleek dark curved highways for 100% realism) */}
          <g stroke="#1e293b" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.6" fill="none">
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
          <g stroke="#071126" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.8" fill="none">
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
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d={highwayPath}
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeOpacity="0.4"
                strokeLinecap="round"
                fill="none"
              />

              {/* Glowing Neon Vector Path Overlay */}
              <path
                d={highwayPath}
                stroke="#0ea5e9"
                strokeWidth="4"
                strokeLinecap="round"
                strokeOpacity="0.6"
                filter="url(#neonGlow)"
                fill="none"
              />
              
              {/* Dynamic highway dash indicators crawling along curve */}
              <path
                d={highwayPath}
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray="6,6"
                className="animate-route-dash"
                fill="none"
              />

              {/* Invisible path wrapper for precise vehicle curve follow */}
              <path
                id={`route-path-${idViaje || 'demo'}`}
                d={highwayPath}
                fill="none"
                stroke="none"
              />

              {/* HEAVY CARGO TRUCK: Ultimate detailed vector design & organic easing motion */}
              <g className="gpu-accelerated">
                <animateMotion 
                  dur="11s" 
                  repeatCount="indefinite" 
                  rotate="auto"
                  calcMode="spline"
                  keyTimes="0;0.12;0.88;1"
                  keyPoints="0;0.05;0.95;1"
                  keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"
                >
                  <mpath href={`#route-path-${idViaje || 'demo'}`} />
                </animateMotion>
                
                {/* Real-time radar range circle surrounding the vehicle */}
                <circle cx="0" cy="0" r="14" fill="#38bdf8" fillOpacity="0.15" className="animate-pulse" />
                
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
                  points="-16,0 -45,-12 -45,12" 
                  fill="url(#taillightGlow)" 
                  pointerEvents="none" 
                  className="animate-taillight-flicker"
                  style={{ mixBlendMode: 'screen' }}
                />

                {/* 🚛 ULTRA HIGH-FIDELITY DETAILED CUSTOM TRUCK VECTOR */}
                <g transform="translate(-4, 0)">
                  {/* Neon chassis underglow */}
                  <rect x="-18" y="2.5" width="26" height="1.5" rx="0.75" fill="#38bdf8" opacity="0.6" filter="url(#neonGlow)" />

                  {/* Heavy double double axle rear chassis */}
                  <rect x="-17" y="-2.5" width="23" height="5" rx="1" fill="#020617" stroke="#0ea5e9" strokeWidth="0.6" />

                  {/* Cargo Container 1 with detailed locking bars, rib panels & structural lines */}
                  <rect x="-16.5" y="-5.5" width="16" height="9.5" rx="1.5" fill="#032b45" stroke="#38bdf8" strokeWidth="0.9" />
                  <line x1="-16.5" y1="-2" x2="-0.5" y2="-2" stroke="#021f32" strokeWidth="0.7" />
                  <line x1="-16.5" y1="1" x2="-0.5" y2="1" stroke="#021f32" strokeWidth="0.7" />
                  
                  {/* Container vertical structural rib columns (Add realistic relief texture) */}
                  <line x1="-13.5" y1="-5" x2="-13.5" y2="3.5" stroke="#38bdf8" strokeWidth="0.5" opacity="0.5" />
                  <line x1="-10.5" y1="-5" x2="-10.5" y2="3.5" stroke="#38bdf8" strokeWidth="0.5" opacity="0.5" />
                  <line x1="-7.5" y1="-5" x2="-7.5" y2="3.5" stroke="#38bdf8" strokeWidth="0.5" opacity="0.5" />
                  <line x1="-4.5" y1="-5" x2="-4.5" y2="3.5" stroke="#38bdf8" strokeWidth="0.5" opacity="0.5" />
                  
                  {/* Warning Chevron stripes at the rear end */}
                  <rect x="-18" y="-4.5" width="1.5" height="8" fill="#f59e0b" opacity="0.9" />
                  <line x1="-18" y1="-3" x2="-16.5" y2="-1.5" stroke="#020617" strokeWidth="0.6" />
                  <line x1="-18" y1="-1" x2="-16.5" y2="0.5" stroke="#020617" strokeWidth="0.6" />
                  <line x1="-18" y1="1" x2="-16.5" y2="2.5" stroke="#020617" strokeWidth="0.6" />

                  {/* Container safety reflectors (Amber side LED dots) */}
                  <circle cx="-13" cy="-4.5" r="0.6" fill="#f59e0b" />
                  <circle cx="-5" cy="-4.5" r="0.6" fill="#f59e0b" />
                  <circle cx="-9" cy="-4.5" r="0.6" fill="#f59e0b" />
                  {/* Additional upper red marker LEDs */}
                  <circle cx="-16" cy="-5" r="0.5" fill="#ef4444" />
                  <circle cx="-1" cy="-5" r="0.5" fill="#ef4444" />

                  {/* Connection coupler bar with safety wires */}
                  <rect x="-2" y="-1" width="3" height="2" fill="#475569" />
                  
                  {/* Sleek metallic long-nose master Cabin structure */}
                  <path d="M 0,-4.5 L 6.5,-4.5 L 9.5,-2 L 10.5,1 L 10.5,3.5 L 0,3.5 Z" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="0.9" />
                  
                  {/* Front chrome metallic radiator grill */}
                  <path d="M 10.5,-0.5 L 10.5,3 L 11,3 L 11,-0.5 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />

                  {/* Modern cybernetic transparent cyan windshield */}
                  <path d="M 5.5,-3.8 L 8.5,-1.8 L 5.5,-1.8 Z" fill="#38bdf8" fillOpacity="0.8" stroke="#e0f2fe" strokeWidth="0.4" />

                  {/* Chrome cylindrical side diesel fuel tank */}
                  <rect x="-7" y="2" width="4.5" height="1.8" rx="0.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.4" />

                  {/* Upper cabin aerodynamic wind-spoiler wing */}
                  <path d="M -1,-5.5 L 4.5,-5.5 L 5,-4.5 L -1,-4.5 Z" fill="#0369a1" />

                  {/* Cab roof amber marker lights */}
                  <circle cx="1.5" cy="-4.8" r="0.5" fill="#f59e0b" className="animate-pulse" />
                  <circle cx="3.5" cy="-4.8" r="0.5" fill="#f59e0b" className="animate-pulse" />

                  {/* Dynamic upright dual Chrome Exhaust Stack (Chimenea metalica) */}
                  <rect x="-0.8" y="-9" width="0.9" height="5.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.4" />
                  
                  {/* 💨 Animated real-time drifting diesel smoke puffs (drifts backward, floats upward, dissolves) */}
                  <circle cx="-0.5" cy="-9.5" r="1" fill="#38bdf8" fillOpacity="0.4">
                    <animate attributeName="r" values="1;4;6" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.3;0" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="cx" values="-0.5;-2;-4.5" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="cy" values="-9.5;-12.5;-14.5" dur="2s" repeatCount="indefinite" />
                  </circle>

                  {/* Micro-Wheels with detailed rubber tire and rotating alloy rims using 100% stable local coordinates (Prevents layout/wobble bugs on iOS and Android!) */}
                  {/* Trailer Wheel 1 */}
                  <g transform="translate(-13.5, 4)">
                    <circle cx="0" cy="0" r="2.2" fill="#020617" stroke="#38bdf8" strokeWidth="0.7" />
                    <g>
                      <line x1="0" y1="-2.2" x2="0" y2="2.2" stroke="#e0f2fe" strokeWidth="0.4" />
                      <line x1="-2.2" y1="0" x2="2.2" y2="0" stroke="#e0f2fe" strokeWidth="0.4" />
                      <animateTransform 
                        attributeName="transform" 
                        type="rotate" 
                        from="0 0 0" 
                        to="360 0 0" 
                        dur="1.2s" 
                        repeatCount="indefinite" 
                      />
                    </g>
                    <circle cx="0" cy="0" r="0.8" fill="#e0f2fe" />
                  </g>

                  {/* Trailer Wheel 2 */}
                  <g transform="translate(-9.5, 4)">
                    <circle cx="0" cy="0" r="2.2" fill="#020617" stroke="#38bdf8" strokeWidth="0.7" />
                    <g>
                      <line x1="0" y1="-2.2" x2="0" y2="2.2" stroke="#e0f2fe" strokeWidth="0.4" />
                      <line x1="-2.2" y1="0" x2="2.2" y2="0" stroke="#e0f2fe" strokeWidth="0.4" />
                      <animateTransform 
                        attributeName="transform" 
                        type="rotate" 
                        from="0 0 0" 
                        to="360 0 0" 
                        dur="1.2s" 
                        repeatCount="indefinite" 
                      />
                    </g>
                    <circle cx="0" cy="0" r="0.8" fill="#e0f2fe" />
                  </g>

                  {/* Drive Axle Wheel */}
                  <g transform="translate(-2, 4)">
                    <circle cx="0" cy="0" r="2.2" fill="#020617" stroke="#38bdf8" strokeWidth="0.7" />
                    <g>
                      <line x1="0" y1="-2.2" x2="0" y2="2.2" stroke="#e0f2fe" strokeWidth="0.4" />
                      <line x1="-2.2" y1="0" x2="2.2" y2="0" stroke="#e0f2fe" strokeWidth="0.4" />
                      <animateTransform 
                        attributeName="transform" 
                        type="rotate" 
                        from="0 0 0" 
                        to="360 0 0" 
                        dur="1.2s" 
                        repeatCount="indefinite" 
                      />
                    </g>
                    <circle cx="0" cy="0" r="0.8" fill="#e0f2fe" />
                  </g>

                  {/* Steer Axle Wheel */}
                  <g transform="translate(6, 4)">
                    <circle cx="0" cy="0" r="2.2" fill="#020617" stroke="#38bdf8" strokeWidth="0.7" />
                    <g>
                      <line x1="0" y1="-2.2" x2="0" y2="2.2" stroke="#e0f2fe" strokeWidth="0.4" />
                      <line x1="-2.2" y1="0" x2="2.2" y2="0" stroke="#e0f2fe" strokeWidth="0.4" />
                      <animateTransform 
                        attributeName="transform" 
                        type="rotate" 
                        from="0 0 0" 
                        to="360 0 0" 
                        dur="1.2s" 
                        repeatCount="indefinite" 
                      />
                    </g>
                    <circle cx="0" cy="0" r="0.8" fill="#e0f2fe" />
                  </g>
                </g>
              </g>
            </g>
          )}

          {/* HIGH-TECH RADAR SWEEP LINE (Sweeps across the tactical map continuously) */}
          <g className="gpu-accelerated" style={{ pointerEvents: 'none' }}>
            <line 
              x1="200" 
              y1="75" 
              x2="400" 
              y2="150" 
              stroke="#0ea5e9" 
              strokeWidth="0.8" 
              strokeOpacity="0.2" 
              className="animate-radar-sweep"
            />
            <circle cx="200" cy="75" r="140" fill="url(#radarSweepGrad)" pointerEvents="none" />
          </g>

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
                />

                {/* Pulsing warning aura for current destination */}
                {isDest && (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r="15"
                    fill="#38bdf8"
                    fillOpacity="0.18"
                    className="animate-ping"
                  />
                )}

                {/* City node outer ring with high-contrast tactical design */}
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={isSelected ? 7 : isActive ? 5.5 : 4}
                  fill={isSelected ? '#0284c7' : isActive ? '#034a75' : '#04122b'}
                  stroke={isSelected ? '#38bdf8' : isActive ? '#0ea5e9' : '#1e3a8a'}
                  strokeWidth={isSelected ? 2.5 : isActive ? 1.8 : 1.2}
                  className="transition-all duration-300 cursor-pointer hover:stroke-sky-300"
                  onClick={() => setSelectedCity(city)}
                />

                {/* Glowing Core center dot */}
                {isSelected && (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r="2.2"
                    fill="#ffffff"
                    className="animate-pulse"
                  />
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
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-0.5 pointer-events-none">
          <span className="backdrop-blur-md bg-slate-950/85 text-[#38bdf8] text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-[#0ea5e9]/30 shadow-lg leading-none flex items-center gap-1.5">
            <Compass className="w-2.5 h-2.5 animate-spin-slow text-[#38bdf8]" />
            SATELLITE TRUCK LOCK • {metadata.dist}
          </span>
          <span className="text-[8px] text-slate-300 font-bold uppercase tracking-wide pl-0.5 leading-none mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
            {metadata.msg}
          </span>
        </div>

        {/* Alert box warning indicators in upper right */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 pointer-events-none">
          <span className="backdrop-blur-md bg-rose-950/40 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-2 h-2 text-rose-400" />
            {metadata.alert}
          </span>
        </div>

        {/* Real-time telemetry connection status indicators (Bottom Right) */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 backdrop-blur-md bg-slate-950/90 px-2.5 py-0.5 rounded-md border border-slate-800/90 shadow-xl">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0ea5e9] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0ea5e9]"></span>
          </span>
          <span className="text-[8px] font-mono font-black text-slate-300 uppercase tracking-widest">
            {isRouteConnected ? 'RT_FEED_ACTIVE' : 'FEED_WAIT'}
          </span>
        </div>
        </div>
      </div>

      {/* Dynamic Telemetry Box (Updated instantly upon tapping any map node!) */}
      {selectedCity && (
        <div className="bg-[#030915]/85 backdrop-blur-md border border-slate-800/90 p-3 rounded-2xl flex items-center justify-between gap-4 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0ea5e9]/10 text-[#38bdf8] border border-[#0ea5e9]/20 shadow-inner">
              {selectedCity.label === 'La Paz' || selectedCity.label === 'Oruro' ? (
                <CloudRain className="w-4 h-4 text-[#38bdf8]" />
              ) : selectedCity.label === 'Santa Cruz' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Wind className="w-4 h-4 text-sky-300" />
              )}
            </div>
            <div className="text-left">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">ESTACIÓN METEOROLÓGICA</span>
                <span className="text-[8.5px] bg-slate-950 border border-slate-800/80 px-1 py-0.5 rounded font-mono text-slate-400 font-extrabold">
                  {selectedCity.altitude}
                </span>
                <span className="text-[8px] text-slate-500 font-mono">
                  [{selectedCity.coords}]
                </span>
              </div>
              <h5 className="text-white text-xs font-black tracking-tight leading-none mt-1">
                {selectedCity.label}: <span className="text-[#38bdf8]">{selectedCity.weather}</span>
              </h5>
              <p className="text-[10px] text-slate-400 leading-normal mt-1 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#38bdf8]" />
                {selectedCity.status}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end text-right shrink-0">
            <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider leading-none">Temperatura</span>
            <div className="flex items-center gap-0.5 mt-1 text-white font-black text-xs">
              <Thermometer className="w-3.5 h-3.5 text-rose-400" />
              {selectedCity.temp}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
