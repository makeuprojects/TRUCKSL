import * as fs from 'fs';
let code = fs.readFileSync('server/routes.ts', 'utf8');
code = code.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*message:\s*error\.message\s*\}\);/g, 'return handleApiError(res, error);');
fs.writeFileSync('server/routes.ts', code);
