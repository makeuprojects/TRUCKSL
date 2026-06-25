import React, { useState } from 'react';
import { CloudRain, Compass, Eye, ShieldCheck, Sun, Thermometer, Wind } from 'lucide-react';

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
    status: 'Peaje libre, sin demoras' 
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
    status: 'Nevada parcial en cumbre' 
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
    status: 'Control policial rutinario' 
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
    status: 'Doble vía expedita' 
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
    status: 'Tránsito fluido, calor alto' 
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
    return { dist: '~230 km', msg: 'Tránsito por Doble Vía LP-OR' };
  }
  if ((o.includes('la paz') && d.includes('cochabamba')) || (o.includes('cochabamba') && d.includes('la paz'))) {
    return { dist: '~380 km', msg: 'Ruta Troncal Central (El Sillar)' };
  }
  if ((o.includes('la paz') && d.includes('santa cruz')) || (o.includes('santa cruz') && d.includes('la paz'))) {
    return { dist: '~850 km', msg: 'Ruta de Integración Oriental' };
  }
  if ((o.includes('oruro') && d.includes('cochabamba')) || (o.includes('cochabamba') && d.includes('oruro'))) {
    return { dist: '~210 km', msg: 'Carretera Interdepartamental' };
  }
  if ((o.includes('oruro') && d.includes('potosi')) || (o.includes('potosi') && d.includes('oruro'))) {
    return { dist: '~310 km', msg: 'Carretera Panamericana' };
  }
  if ((o.includes('cochabamba') && d.includes('santa cruz')) || (o.includes('santa cruz') && d.includes('cochabamba'))) {
    return { dist: '~480 km', msg: 'Carretera Al Oriente' };
  }
  return { dist: 'Variables', msg: 'Ruta Logística Fletada' };
};

export default function RouteMiniMap({ origen, destino, idViaje }: RouteMiniMapProps) {
  const originNode = findCityNode(origen);
  const destNode = findCityNode(destino);
  const metadata = getRouteMetadata(origen, destino);

  const [selectedCity, setSelectedCity] = useState<CityNode | null>(destNode || originNode || null);

  const isRouteConnected = originNode && destNode;

  return (
    <div id={`minimap-${idViaje || 'demo'}`} className="space-y-3 w-full">
      <div className="bg-[#040D1E] border border-slate-800/80 rounded-2xl overflow-hidden relative h-[140px] transition duration-300 w-full select-none shadow-2xl">
        
        {/* Neon style overrides */}
        <style>{`
          @keyframes dashEffect {
            to {
              stroke-dashoffset: -24;
            }
          }
          .animate-route-dash {
            animation: dashEffect 0.7s linear infinite;
          }
          .gpu-accelerated {
            transform: translate3d(0,0,0);
            will-change: transform, opacity;
          }
        `}</style>

        {/* SVG Map view */}
        <svg
          viewBox="0 0 400 140"
          className="w-full h-full text-slate-800/50 gpu-accelerated"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <defs>
            {/* Ultra-glow Filter for futuristic logistics line */}
            <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComponentTransfer in="blur" result="boost">
                <feFuncA type="linear" slope="1.8" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="boost" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* Background Map Gradient */}
            <radialGradient id="gridGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid ambient glow overlay */}
          <rect width="400" height="140" fill="url(#gridGlow)" pointerEvents="none" />

          {/* Tactical grid background overlay */}
          <g stroke="currentColor" strokeWidth="0.2" strokeOpacity="0.25">
            {[50, 100, 150, 200, 250, 300, 350].map(x => (
              <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="140" strokeDasharray="1,4" />
            ))}
            {[30, 60, 90, 120].map(y => (
              <line key={`h-${y}`} x1="0" y1={y} x2={400} y2={y} strokeDasharray="1,4" />
            ))}
          </g>

          {/* Background Map Paths (Secondary Route Network) */}
          <g stroke="#1e293b" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7">
            {/* LP ➔ OR */}
            <line x1="60" y1="36" x2="80" y2="66" />
            {/* OR ➔ PT */}
            <line x1="80" y1="66" x2="120" y2="96" />
            {/* OR ➔ CB */}
            <line x1="80" y1="66" x2="180" y2="54" />
            {/* CB ➔ SC */}
            <line x1="180" y1="54" x2="300" y2="66" />
            {/* CB ➔ PT */}
            <line x1="180" y1="54" x2="120" y2="96" />
          </g>
          <g stroke="#020617" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.9">
            {/* LP ➔ OR */}
            <line x1="60" y1="36" x2="80" y2="66" />
            {/* OR ➔ PT */}
            <line x1="80" y1="66" x2="120" y2="96" />
            {/* OR ➔ CB */}
            <line x1="80" y1="66" x2="180" y2="54" />
            {/* CB ➔ SC */}
            <line x1="180" y1="54" x2="300" y2="66" />
            {/* CB ➔ PT */}
            <line x1="180" y1="54" x2="120" y2="96" />
          </g>

          {/* ACTIVE TRAVEL TRUNK ROAD */}
          {isRouteConnected && (
            <g>
              {/* Thick dark asphalt highway base */}
              <line
                x1={originNode.x}
                y1={originNode.y}
                x2={destNode.x}
                y2={destNode.y}
                stroke="#090d16"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <line
                x1={originNode.x}
                y1={originNode.y}
                x2={destNode.x}
                y2={destNode.y}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeOpacity="0.4"
                strokeLinecap="round"
              />

              {/* Glowing High-Tech Vector Path overlay */}
              <line
                x1={originNode.x}
                y1={originNode.y}
                x2={destNode.x}
                y2={destNode.y}
                stroke="#059669"
                strokeWidth="4"
                strokeLinecap="round"
                strokeOpacity="0.4"
                filter="url(#neonGlow)"
              />
              
              {/* Dynamic highway dash indicators */}
              <line
                x1={originNode.x}
                y1={originNode.y}
                x2={destNode.x}
                y2={destNode.y}
                stroke="#34d399"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray="6,6"
                className="animate-route-dash"
              />

              {/* Invisible path wrapper for precise vehicle follow */}
              <path
                id={`route-path-${idViaje || 'demo'}`}
                d={`M ${originNode.x} ${originNode.y} L ${destNode.x} ${destNode.y}`}
                fill="none"
                stroke="none"
              />

              {/* Custom Designed Heavy Duty Cargo Semi-Truck (Vectors, No Emojis!) */}
              <g className="gpu-accelerated">
                <animateMotion dur="10s" repeatCount="indefinite" rotate="auto">
                  <mpath href={`#route-path-${idViaje || 'demo'}`} />
                </animateMotion>
                
                {/* Real-time radar radar pulse surrounding the vehicle */}
                <circle cx="0" cy="0" r="10" fill="#10b981" fillOpacity="0.25" className="animate-pulse" />
                
                {/* Yellow High-beam headlight ray pointing forward */}
                <polygon points="12,0 45,-15 45,15" fill="#fef08a" fillOpacity="0.12" pointerEvents="none" />
                <polygon points="12,0 30,-6 30,6" fill="#fef08a" fillOpacity="0.25" pointerEvents="none" />

                {/* Sleek Custom Vector Truck Structure */}
                <g transform="translate(-4, 0)">
                  {/* Trailer load */}
                  <rect x="-16" y="-5" width="16" height="8" rx="1.5" fill="#064e3b" stroke="#10b981" strokeWidth="0.8" />
                  <line x1="-16" y1="-1" x2="0" y2="-1" stroke="#047857" strokeWidth="0.5" />
                  
                  {/* Cabin body */}
                  <path d="M 0,-4.5 L 6,-4.5 L 9.5,-1.5 L 9.5,3 L 0,3 Z" fill="#047857" stroke="#10b981" strokeWidth="0.8" />
                  
                  {/* Windshield */}
                  <path d="M 4.5,-3.5 L 7.5,-1.5 L 4.5,-1.5 Z" fill="#a5f3fc" />

                  {/* Connection coupler bar */}
                  <rect x="-2" y="1" width="3" height="1" fill="#64748b" />

                  {/* Micro-Wheels with rims */}
                  <circle cx="-13" cy="4" r="1.8" fill="#020617" stroke="#34d399" strokeWidth="0.6" />
                  <circle cx="-9" cy="4" r="1.8" fill="#020617" stroke="#34d399" strokeWidth="0.6" />
                  <circle cx="-2" cy="4" r="1.8" fill="#020617" stroke="#34d399" strokeWidth="0.6" />
                  <circle cx="5" cy="4" r="1.8" fill="#020617" stroke="#34d399" strokeWidth="0.6" />
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
                {/* Interactive Expandable Tap Targets - Crucial for Mobile screens! */}
                <circle
                  cx={city.x}
                  cy={city.y}
                  r="16"
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => setSelectedCity(city)}
                />

                {/* Pulsing outer warning beacon for current destination node */}
                {isDest && (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r="14"
                    fill="#10b981"
                    fillOpacity="0.12"
                    className="animate-ping"
                  />
                )}

                {/* Node Outer Ring with focus halo */}
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={isSelected ? 6.5 : isActive ? 5 : 3.5}
                  fill={isSelected ? '#10b981' : isActive ? '#064e3b' : '#020617'}
                  stroke={isSelected ? '#34d399' : isActive ? '#10b981' : '#334155'}
                  strokeWidth={isSelected ? 2 : isActive ? 1.5 : 1}
                  className="transition-all duration-300 cursor-pointer hover:stroke-emerald-400"
                  onClick={() => setSelectedCity(city)}
                />

                {/* Center Core dot */}
                {isSelected && (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r="2"
                    fill="#020617"
                  />
                )}

                {/* Node Text Labels */}
                <text
                  x={city.x}
                  y={city.y - 9}
                  textAnchor="middle"
                  fill={isSelected ? '#34d399' : isActive ? '#e2e8f0' : '#475569'}
                  fontSize={isSelected ? '8.5' : '7.5'}
                  fontWeight={isSelected ? '900' : '700'}
                  fontFamily="sans-serif"
                  className="transition-all duration-300 select-none pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                >
                  {city.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Top Left Floating GPS HUD */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-0.5">
          <span className="backdrop-blur-md bg-slate-950/80 text-[#34d399] text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-[#10b981]/30 shadow-lg leading-none flex items-center gap-1">
            <Compass className="w-2.5 h-2.5 animate-spin-slow text-[#34d399]" />
            GPS LOCK • {metadata.dist}
          </span>
          <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wide pl-0.5 leading-none mt-0.5">
            {metadata.msg}
          </span>
        </div>

        {/* Real-time sync confirmation in lower right */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 backdrop-blur-md bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800/80">
          <span className={`w-1.5 h-1.5 rounded-full ${isRouteConnected ? 'bg-emerald-400' : 'bg-amber-500 animate-pulse'}`}></span>
          <span className="text-[7.5px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            {isRouteConnected ? 'GEO_LOCKED' : 'GEO_PENDING'}
          </span>
        </div>
      </div>

      {/* Dynamic Telemetry Box (Updated instantly upon tapping any map node!) */}
      {selectedCity && (
        <div className="bg-[#040D1E]/80 backdrop-blur-md border border-slate-800/85 p-3 rounded-xl flex items-center justify-between gap-4 transition-all duration-300">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {selectedCity.label === 'La Paz' || selectedCity.label === 'Oruro' ? (
                <CloudRain className="w-4 h-4 text-emerald-400" />
              ) : selectedCity.label === 'Santa Cruz' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Wind className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Reporte Meteorológico</span>
                <span className="text-[9px] bg-slate-900 border border-slate-800 px-1 py-0.5 rounded font-mono text-slate-500 font-bold">
                  {selectedCity.altitude}
                </span>
              </div>
              <h5 className="text-white text-xs font-black tracking-tight leading-none mt-0.5">
                {selectedCity.label}: <span className="text-emerald-400">{selectedCity.weather}</span>
              </h5>
              <p className="text-[10px] text-slate-400 leading-none mt-1">
                {selectedCity.status}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end text-right">
            <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider leading-none">Temperatura</span>
            <div className="flex items-center gap-0.5 mt-0.5 text-white font-black text-xs">
              <Thermometer className="w-3.5 h-3.5 text-rose-400" />
              {selectedCity.temp}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
