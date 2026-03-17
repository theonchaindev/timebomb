const { Redis } = require('@upstash/redis')

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

async function ablyPublish(data) {
  const key = process.env.ABLY_API_KEY
  if (!key) return
  const [appId, ...rest] = key.split(':')
  const encoded = Buffer.from(key).toString('base64')
  await fetch('https://rest.ably.io/channels/timebomb/messages', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'update', data: JSON.stringify(data) }),
  })
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { signature, txType, solAmount, traderAddr } = req.body || {}
  if (!signature || !txType) return res.status(400).json({ error: 'missing fields' })

  // Dedup — ignore if already processed (10 min TTL)
  const dedupKey = `tb:sig:${signature}`
  const exists = await redis.get(dedupKey)
  if (exists) return res.json({ duplicate: true })
  await redis.setex(dedupKey, 600, '1')

  // Read current state
  let state = await redis.hgetall('tb:state')
  if (!state || !state.detonatesAt) {
    return res.status(500).json({ error: 'state not initialized' })
  }

  let detonatesAt = Number(state.detonatesAt)
  let totalBuys = Number(state.totalBuys)
  let totalSells = Number(state.totalSells)
  let totalAdded = Number(state.totalAdded)
  let totalRemoved = Number(state.totalRemoved)

  const qualifies = Number(solAmount) >= 0.1
  if (txType === 'buy') {
    totalBuys++
    if (qualifies) { detonatesAt += 1000; totalAdded++ }
  } else if (txType === 'sell') {
    totalSells++
    if (qualifies) { detonatesAt -= 1000; totalRemoved++ }
  }

  // Floor: can't detonate before right now (prevents backwards clock)
  const minDetonatesAt = Date.now() + 500
  detonatesAt = Math.max(detonatesAt, minDetonatesAt)

  const newState = { detonatesAt, totalBuys, totalSells, totalAdded, totalRemoved, detonated: state.detonated || 0 }
  await redis.hset('tb:state', newState)

  // Broadcast to all clients via Ably
  await ablyPublish({ ...newState, txType, solAmount, traderAddr, signature })

  res.json({ ok: true, detonatesAt })
}
