// 로컬 개발용 서버 (정적 파일 + /api/places). Vercel 에서는 api/places.js 가 대신한다.
// 실행: JEJU_CULTURE_INFO_KEY, JEJU_CULTURE_LOCATION_KEY 환경변수(또는 .env)를 설정한 뒤 npm run dev
const http = require('http');
const fs = require('fs');
const path = require('path');

// 같은 폴더의 .env 파일이 있으면 읽는다 (이미 설정된 환경변수가 우선).
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch {}

const { getPlaces } = require('./lib/places');
const PORT = process.env.PORT || 3000;

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/api/places') {
    try {
      const items = await getPlaces();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ count: items.length, items }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  const name = pathname === '/' ? 'index.html' : path.basename(decodeURIComponent(pathname));
  if (!['index.html', 'nearby.html'].includes(name)) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(__dirname, name), (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buf);
  });
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
