const { readGist, writeGist } = require('./state')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { signature, txType, solAmount } = req.body || {}
  if (!signature || !txType) return res.status(400).json({ error: 'missing fields' })

  try {
    const state = await readGist()

    // Don't process trades while timer is paused
    if (state.paused) return res.json({ paused: true })

    // Dedup by signature — stored in processed array (last 200 sigs)
    const processed = state.processed || []
    if (processed.includes(signature)) return res.json({ duplicate: true })

    let { detonatesAt, totalBuys = 0, totalSells = 0, totalAdded = 0, totalRemoved = 0 } = state
    const qualifies = Number(solAmount) >= 0.1

    if (txType === 'buy') {
      totalBuys++
      if (qualifies) {
        const sol = Number(solAmount)
        const addMs = sol >= 10 ? 30000 : sol >= 5 ? 10000 : sol >= 3 ? 5000 : 2000
        detonatesAt += addMs
        totalAdded++
      }
    } else if (txType === 'sell') {
      totalSells++
      if (qualifies) { detonatesAt -= 1000; totalRemoved++ }
    }

    // Can't go below "right now + 500ms"
    detonatesAt = Math.max(detonatesAt, Date.now() + 500)

    // Keep last 200 sigs for dedup
    processed.push(signature)
    if (processed.length > 200) processed.splice(0, processed.length - 200)

    const newState = { detonatesAt, totalBuys, totalSells, totalAdded, totalRemoved, processed, paused: !!state.paused, detonated: !!state.detonated }
    await writeGist(newState)

    res.json({ ok: true, detonatesAt })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
