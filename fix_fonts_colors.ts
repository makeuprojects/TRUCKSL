import * as fs from 'fs';

const cssPath = 'src/index.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

cssContent = cssContent.replace(/family=Plus\+Jakarta\+Sans:wght@[^&]+&family=Geist\+Mono:wght@[^&]+&display=swap/, 'family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
cssContent = cssContent.replace(/"Plus Jakarta Sans"/g, '"Inter"');
cssContent = cssContent.replace(/"Geist Mono"/g, '"JetBrains Mono"');

fs.writeFileSync(cssPath, cssContent);
console.log('Updated index.css');

function replaceInFile(filePath: string, replacements: [RegExp, string][]) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    for (const [regex, replacement] of replacements) {
      newContent = newContent.replace(regex, replacement);
    }
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Updated ${filePath}`);
    }
  } catch (e) {
    console.error(`Error processing ${filePath}:`, e);
  }
}

const driverFiles = [
  'src/App.tsx',
  'src/components/DriverApp.tsx',
  'src/components/RutaCard.tsx',
  'src/components/GastoForm.tsx'
];

const adminFiles = [
  'src/components/DashboardDonSaul.tsx',
  'src/components/ChoferProfileCard.tsx',
  'src/components/EditSlideOver.tsx',
  'src/components/LiveExpenseFeed.tsx',
  'src/components/RouteMiniMap.tsx',
  'src/components/RouteDetailDrawer.tsx',
  'src/components/TripHistoryArchive.tsx',
  'src/components/AdminDashboard.tsx'
];

const driverReplacements: [RegExp, string][] = [
  [/text-slate-200/g, 'text-slate-100'],
  [/text-slate-300/g, 'text-slate-200'],
  [/text-slate-400/g, 'text-slate-300'],
  [/text-slate-500/g, 'text-slate-400'],
];

const adminReplacements: [RegExp, string][] = [
  [/text-slate-800/g, 'text-slate-900'],
  [/text-slate-700/g, 'text-slate-800'],
  [/text-slate-600/g, 'text-slate-700'],
  [/text-slate-500/g, 'text-slate-600'],
  [/text-blue-900/g, 'text-[#1E3A8A]'],
  [/text-blue-600/g, 'text-[#1E3A8A]'],
];

for (const file of driverFiles) {
  if (fs.existsSync(file)) replaceInFile(file, driverReplacements);
}

for (const file of adminFiles) {
  if (fs.existsSync(file)) replaceInFile(file, adminReplacements);
}
