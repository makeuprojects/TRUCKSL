const fs = require('fs');

function applyObsidiana(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // The targeted replacements
  content = content.replace(/bg-slate-950\/40/g, 'bg-[#0d1324]/80');
  content = content.replace(/bg-slate-950\/50/g, 'bg-[#0d1324]/80');
  content = content.replace(/bg-slate-950\/30/g, 'bg-[#0d1324]/60');
  content = content.replace(/bg-slate-950\/80/g, 'bg-[#0d1324]/90');
  content = content.replace(/bg-slate-950\/90/g, 'bg-[#070a13]/95');
  content = content.replace(/bg-slate-950/g, 'bg-[#070a13]');

  content = content.replace(/bg-slate-900\/40/g, 'bg-[#131b31]/50');
  content = content.replace(/bg-slate-900\/60/g, 'bg-[#131b31]/70');
  content = content.replace(/bg-slate-900\/30/g, 'bg-[#131b31]/40');
  content = content.replace(/bg-\[#121A2A\]\/85/g, 'bg-[#0d1324]/80');
  content = content.replace(/bg-\[#1E293B\]\/40/g, 'bg-[#0d1324]/80');
  content = content.replace(/bg-slate-900/g, 'bg-[#0d1324]');
  
  content = content.replace(/bg-slate-850/g, 'bg-[#16223f]');
  content = content.replace(/bg-slate-800/g, 'bg-[#1e2943]');
  content = content.replace(/border-slate-800\/80/g, 'border-[#1e2943]/80');
  content = content.replace(/border-slate-800/g, 'border-[#1e2943]/60');
  content = content.replace(/border-white\/\[0\.02\]/g, 'border-[#1e2943]/30');
  content = content.replace(/border-white\/\[0\.05\]/g, 'border-[#1e2943]/50');
  content = content.replace(/border-white\/\[0\.06\]/g, 'border-[#1e2943]/60');
  content = content.replace(/border-white\/\[0\.08\]/g, 'border-[#1e2943]/70');
  content = content.replace(/border-slate-900/g, 'border-[#1e2943]/50');
  content = content.replace(/border-slate-850/g, 'border-[#1e2943]/80');

  // Typography adjustments
  content = content.replace(/text-slate-500/g, 'text-slate-400');
  content = content.replace(/text-slate-404/g, 'text-slate-300'); // special case in App.tsx
  content = content.replace(/text-slate-450/g, 'text-emerald-400'); // some errors text, maybe keep? actually, I'll let it be for now or change to slate-300 below
  content = content.replace(/text-slate-400/g, 'text-slate-300');
  content = content.replace(/text-slate-350/g, 'text-slate-200');

  fs.writeFileSync(filePath, content);
}

try {
  applyObsidiana('src/components/DashboardDonSaul.tsx');
  applyObsidiana('src/App.tsx');

  let mapContent = fs.readFileSync('src/components/RouteMiniMap.tsx', 'utf8');
  mapContent = mapContent.replace(/stroke-\[#64748B\]/g, 'stroke-[#16223f]');
  mapContent = mapContent.replace(/stroke-\[#475569\]/g, 'stroke-[#16223f]');
  mapContent = mapContent.replace(/stroke-\[emerald-400\]/g, 'stroke-[#00ff9d]');
  mapContent = mapContent.replace(/stroke-\[#10B981\]/g, 'stroke-[#00ff9d]');
  mapContent = mapContent.replace(/from-slate-900/g, 'from-[#070a13]');
  mapContent = mapContent.replace(/via-slate-800/g, 'via-[#1e2943]');
  // Also explicitly replace all inactive line strokes
  // We'll replace default stroke 
  mapContent = mapContent.replace(/stroke="currentColor"/g, 'stroke="currentColor"');

  fs.writeFileSync('src/components/RouteMiniMap.tsx', mapContent);
  console.log('Done');
} catch (e) {
  console.error(e);
}
