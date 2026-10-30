// Vercel 서버리스 함수: GET /api/places
const { getPlaces } = require('../lib/places');

module.exports = async (req, res) => {
  try {
    const items = await getPlaces();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ count: items.length, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
