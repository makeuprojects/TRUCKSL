import React from 'react';

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
}

const BOLIVIA_CITIES: CityNode[] = [
  { id: 'lapaz', label: 'La Paz', x: 60, y: 36, matchKeys: ['la paz', 'lapaz', 'el alto'] },
  { id: 'oruro', label: 'Oruro', x: 80, y: 66, matchKeys: ['oruro', 'or'] },
  { id: 'potosi', label: 'Potosí', x: 120, y: 96, matchKeys: ['potosí', 'potosi'] },
  { id: 'cochabamba', label: 'Cochabamba', x: 180, y: 54, matchKeys: ['cochabamba', 'cbba', 'cocha'] },
  { id: 'santacruz', label: 'Santa Cruz', x: 300, y: 66, matchKeys: ['santa cruz', 'santacruz', 'scz'] },
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

  if (o.includes('la paz') && d.includes('oruro') || o.includes('oruro') && d.includes('la paz')) {
    return { dist: '~230 km', msg: 'Tránsito por Doble Vía LP-OR' };
  }
  if (o.includes('la paz') && d.includes('cochabamba') || o.includes('cochabamba') && d.includes('la paz')) {
    return { dist: '~380 km', msg: 'Ruta Troncal Central (El Sillar)' };
  }
  if (o.includes('la paz') && d.includes('santa cruz') || o.includes('santa cruz') && d.includes('la paz')) {
    return { dist: '~850 km', msg: 'Ruta de Integración Oriental' };
  }
  if (o.includes('oruro') && d.includes('cochabamba') || o.includes('cochabamba') && d.includes('oruro')) {
    return { dist: '~210 km', msg: 'Carretera Interdepartamental' };
  }
  if (o.includes('oruro') && d.includes('potosi') || o.includes('potosi') && d.includes('oruro')) {
    return { dist: '~310 km', msg: 'Carretera Panamericana' };
  }
  if (o.includes('cochabamba') && d.includes('santa cruz') || o.includes('santa cruz') && d.includes('cochabamba')) {
    return { dist: '~480 km', msg: 'Carretera Al Oriente' };
  }
  return { dist: 'Variables', msg: 'Ruta Logística Fletada' };
};

export default function RouteMiniMap({ origen, destino, idViaje }: RouteMiniMapProps) {
  const originNode = findCityNode(origen);
  const destNode = findCityNode(destino);
  const metadata = getRouteMetadata(origen, destino);

  const isRouteConnected = originNode && destNode;

  return (
    <div id={`minimap-${idViaje || 'demo'}`} className="bg-[#0B1329] border border-[#1E293B] rounded-xl overflow-hidden relative h-[120px] transition duration-300 w-full select-none shadow-inner">
      {/* SVG Vector Drawing */}
      <svg
        viewBox="0 0 400 120"
        className="w-full h-full text-[#16223f]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <defs>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <style>{`
          @keyframes dashEffect {
            to {
              stroke-dashoffset: -20;
            }
          }
          .animate-route-dash {
            animation: dashEffect 0.8s linear infinite;
          }
        `}</style>

        {/* Tactical grid background overlay */}
        <g stroke="currentColor" strokeWidth="0.25" strokeOpacity="0.4">
          <line x1="50" y1="0" x2="50" y2="120" strokeDasharray="2,4" />
          <line x1="100" y1="0" x2="100" y2="120" strokeDasharray="2,4" />
          <line x1="150" y1="0" x2="150" y2="120" strokeDasharray="2,4" />
          <line x1="200" y1="0" x2="200" y2="120" strokeDasharray="2,4" />
          <line x1="250" y1="0" x2="250" y2="120" strokeDasharray="2,4" />
          <line x1="300" y1="0" x2="300" y2="120" strokeDasharray="2,4" />
          <line x1="350" y1="0" x2="350" y2="120" strokeDasharray="2,4" />
          
          <line x1="0" y1="30" x2="400" y2="30" strokeDasharray="2,4" />
          <line x1="0" y1="60" x2="400" y2="60" strokeDasharray="2,4" />
          <line x1="0" y1="90" x2="400" y2="90" strokeDasharray="2,4" />
        </g>

        {/* All static roads background (Navy military roads) */}
        <g stroke="#16223f" strokeWidth="1" strokeOpacity="0.75">
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

        {/* ACTIVE ROUTE LINE (Neon Green #00ff9d with glow filter & marching dash animation) */}
        {isRouteConnected && (
          <g>
            {/* Glowing duplicate background line */}
            <line
              x1={originNode.x}
              y1={originNode.y}
              x2={destNode.x}
              y2={destNode.y}
              stroke="#00ff9d"
              strokeWidth="4"
              strokeLinecap="round"
              strokeOpacity="0.3"
              filter="url(#neonGlow)"
            />
            {/* High-visibility primary active vector */}
            <line
              x1={originNode.x}
              y1={originNode.y}
              x2={destNode.x}
              y2={destNode.y}
              stroke="#00ff9d"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray="6,4"
              className="animate-route-dash"
            />
          </g>
        )}

        {/* Draw City Nodes */}
        {BOLIVIA_CITIES.map((city) => {
          const isOrigin = originNode?.id === city.id;
          const isDest = destNode?.id === city.id;
          const isActive = isOrigin || isDest;

          return (
            <g key={city.id} className="transition-all duration-300">
              {/* Ping electromagnetic emitter for location active */}
              {isDest && (
                <circle
                  cx={city.x}
                  cy={city.y}
                  r="12"
                  fill="#00ff9d"
                  fillOpacity="0.15"
                  className="animate-ping"
                />
              )}

              {/* Node Outer Ring */}
              <circle
                cx={city.x}
                cy={city.y}
                r={isActive ? 5.5 : 3.5}
                fill={isActive ? '#00ff9d' : '#111827'}
                stroke={isActive ? '#34d399' : '#1e2943'}
                strokeWidth={isActive ? 1.5 : 1}
                className="transition-all duration-300"
              />

              {/* Node Core Core */}
              {isActive && (
                <circle
                  cx={city.x}
                  cy={city.y}
                  r="1.8"
                  fill="#070a13"
                />
              )}

              {/* Node Labels */}
              <text
                x={city.x}
                y={city.y - 8}
                textAnchor="middle"
                fill={isActive ? '#ffffff' : '#475569'}
                fontSize="7.5"
                fontWeight={isActive ? '900' : '600'}
                fontFamily="monospace"
                className="transition-all duration-300 select-none pointer-events-none"
              >
                {city.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* CLIMA WIDGET OVERLAY (Destino) */}
      {destNode && (
        <div 
          className="absolute pointer-events-none z-10"
          style={{ 
            left: `${(destNode.x / 400) * 100}%`, 
            top: `${(destNode.y / 120) * 100}%`, 
            transform: 'translate(10px, -15px)' 
          }}
        >
          <div className="bg-[#1E293B]/80 backdrop-blur-md border border-[#233554]/50 text-slate-300 text-[10px] px-2 py-1 rounded-md flex items-center gap-1 shadow-xl w-max">
            {destNode.label === 'Oruro' || destNode.label === 'Potosí' ? '❄️ Nieve/Hielo' 
              : destNode.label === 'Santa Cruz' ? '☀️ Despejado'
              : '🌧️ Lluvia Fuerte'}
          </div>
        </div>
      )}

      {/* Top Left Floating Indicator Overlay */}
      <div className="absolute top-2 left-2 flex flex-col gap-0.5">
        <span className="backdrop-blur-md bg-[#1E293B]/80 text-[#00ff9d] text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-[#00ff9d]/30 shadow-lg leading-none">
          GPS LOCK • {metadata.dist}
        </span>
        <span className="text-[7.5px] text-slate-400 font-mono pl-1 leading-none mt-0.5">
          {metadata.msg}
        </span>
      </div>

      {/* Connection verification status in right corner */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 backdrop-blur-sm bg-[#1E293B]/60 px-1.5 py-0.5 rounded border border-[#233554]/50">
        <span className={`w-1.5 h-1.5 rounded-full ${isRouteConnected ? 'bg-[#00ff9d]' : 'bg-orange-500 animate-pulse'}`}></span>
        <span className="text-[7.5px] font-mono text-slate-300 uppercase">
          {isRouteConnected ? 'COORD_LOCKED' : 'SYS_GEOPATH_DEFAULT'}
        </span>
      </div>
    </div>
  );
}
