// 제주 역사문화 API 호출 + 병합 (로컬 server.js 와 Vercel api/places.js 공용)
const INFO_URL = 'https://api.odcloud.kr/api/15109587/v1/uddi:56c2b3a4-4b4b-46cd-a1fa-f928ef731ffb';
const LOC_URL = 'https://api.odcloud.kr/api/15109570/v1/uddi:8781448b-81a8-487c-bc95-d26335bafa82';
const PER_PAGE = 1000;
const TTL = 60 * 60 * 1000;

// 키 값 자체는 로그/응답에 노출하지 않는다.
const keyOf = name => {
  const k = process.env[name];
  if (!k) throw new Error(`환경변수 ${name} 가 설정되지 않았습니다.`);
  return k;
};

// 공공데이터포털 키는 인코딩/디코딩 두 형태가 있어, 디코딩된 값으로 통일해 한 번만 인코딩한다.
const decodeKey = k => { try { return decodeURIComponent(k); } catch { return k; } };

async function fetchAll(baseUrl, envName) {
  const key = decodeKey(keyOf(envName));
  const rows = [];
  for (let page = 1; ; page++) {
    const u = `${baseUrl}?page=${page}&perPage=${PER_PAGE}&serviceKey=${encodeURIComponent(key)}`;
    const r = await fetch(u, { headers: { Accept: 'application/json' } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${envName} API 오류 (HTTP ${r.status}${j.msg ? ': ' + j.msg : ''})`);
    const data = j.data || [];
    rows.push(...data);
    const total = j.totalCount ?? j.matchCount ?? 0;
    if (!data.length || rows.length >= total) break;
  }
  return rows;
}

// 컬럼명 공백 차이에 영향받지 않도록 키를 정규화한다.
const norm = row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/\s+/g, ''), v == null ? '' : String(v).trim()]));

function build(infoRows, locRows) {
  const locs = new Map(locRows.map(norm).map(r => [r['데이터고유번호'], r]));
  const items = [];
  for (const raw of infoRows) {
    const r = norm(raw);
    const id = r['데이터고유번호'];
    const l = locs.get(id) || {};
    const lat = parseFloat(r['위도'] || l['위도']);
    const lng = parseFloat(r['경도'] || l['경도']);
    if (!id || !isFinite(lat) || !isFinite(lng)) continue;
    items.push({
      id, name: r['장소명'] || l['장소명'] || '', lat, lng,
      cat: r['분류'], d1: r['디렉토리1'], d2: r['디렉토리2'],
      title: r['제목'], sub: r['부제목'], author: r['저작자'], topic: r['주제'],
      content: r['내용'], toc: r['목차'], abs: r['초록'], pub: r['발행자'], date: r['발행일'],
      type: r['자료유형'], form: r['자료형태'], scope: r['범위'], src: r['출처'],
      addr: l['위치'] || '', zip: l['우편번호'] || '',
      url: l['데이터상세보기URL'] || r['링크'] || r['출처페이지'] || ''
    });
  }
  return items;
}

let cache = null;
async function getPlaces() {
  if (cache && Date.now() - cache.at < TTL) return cache.items;
  const [info, loc] = await Promise.all([
    fetchAll(INFO_URL, 'JEJU_CULTURE_INFO_KEY'),
    fetchAll(LOC_URL, 'JEJU_CULTURE_LOCATION_KEY')
  ]);
  cache = { at: Date.now(), items: build(info, loc) };
  return cache.items;
}

module.exports = { getPlaces };
