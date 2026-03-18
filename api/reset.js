const { writeGist } = require('./state')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { seconds = 600, paused = false } = req.body || {}

  try {
    const detonatesAt = Date.now() + Number(seconds) * 1000
    await writeGist({
      detonatesAt,
      totalBuys: 0,
      totalSells: 0,
      totalAdded: 0,
      totalRemoved: 0,
      processed: [],
      paused: !!paused,
      detonated: false,
    })
    res.json({ ok: true, detonatesAt, paused: !!paused })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
