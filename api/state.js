const { Redis } = require('@upstash/redis')

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const START_SECONDS = 60

async function getOrInitState() {
  let state = await redis.hgetall('tb:state')
  if (!state || !state.detonatesAt) {
    state = {
      detonatesAt: Date.now() + START_SECONDS * 1000,
      totalBuys: 0,
      totalSells: 0,
      totalAdded: 0,
      totalRemoved: 0,
      detonated: 0,
    }
    await redis.hset('tb:state', state)
  }
  return state
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')
  try {
    const state = await getOrInitState()
    res.json(state)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
