import { createHash } from 'crypto';

// Vercel Marketplace の Upstash Redis（旧 Vercel KV）を REST で使う
// 接続時の Custom Prefix によって変数名が変わる（KV_REST_API_URL, STORAGE_REST_API_URL など）ので、
// 既定の名前が無ければ *_REST_API_URL / *_REST_API_TOKEN の組を探す
function findRedisEnv() {
  const env = process.env;
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) return [env.KV_REST_API_URL, env.KV_REST_API_TOKEN];
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) return [env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN];
  for (const k of Object.keys(env)) {
    const m = k.match(/^(.*)_REST_API_URL$/);
    if (m && env[m[1] + '_REST_API_TOKEN']) return [env[k], env[m[1] + '_REST_API_TOKEN']];
  }
  return [];
}
const [REDIS_URL, REDIS_TOKEN] = findRedisEnv();

const CODE_RE = /^[A-Z2-9]{8,16}$/;
const ROLES = ['a', 'b'];
const MEAL_KEYS = ['morning', 'lunch', 'snack', 'dinner'];
const INBOX_TTL = 60 * 60 * 24 * 30;   // 未受信の食事は30日で消える
const META_TTL  = 60 * 60 * 24 * 180;
const MAX_ITEM_BYTES = 10000;

async function pipeline(cmds) {
  const r = await fetch(REDIS_URL + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error('storage HTTP ' + r.status);
  const out = await r.json();
  const bad = out.find(x => x.error);
  if (bad) throw new Error('storage: ' + bad.error);
  return out.map(x => x.result);
}

function keys(code) {
  const h = createHash('sha256').update(code).digest('hex').slice(0, 32);
  return { meta: `pair:${h}:meta`, inbox: role => `pair:${h}:inbox:${role}` };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(503).json({ error: '同期ストレージが未設定です（Vercel で Upstash Redis を接続してください）' });
  }

  const { action, code, role, name } = req.body || {};
  if (!CODE_RE.test(code || '')) return res.status(400).json({ error: 'ペアコードが不正です' });
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'role が不正です' });
  const other = role === 'a' ? 'b' : 'a';
  const k = keys(code);
  const myName = String(name || '').slice(0, 20);

  try {
    if (action === 'sync') {
      // 自分の名前を登録し、相手の名前と自分宛ての食事を受け取る
      const [, , partnerName, items] = await pipeline([
        ['HSET', k.meta, role, myName],
        ['EXPIRE', k.meta, META_TTL],
        ['HGET', k.meta, other],
        ['LPOP', k.inbox(role), 100],
      ]);
      const parsed = (items || []).map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
      return res.status(200).json({ partnerName: partnerName || '', items: parsed });
    }

    if (action === 'send') {
      const { item } = req.body;
      if (!item || !MEAL_KEYS.includes(item.mealKey) || !/^\d{4}-\d{2}-\d{2}$/.test(item.date || '') || !item.entry) {
        return res.status(400).json({ error: 'item が不正です' });
      }
      const payload = JSON.stringify({ ...item, fromName: myName, sentAt: Date.now() });
      if (payload.length > MAX_ITEM_BYTES) return res.status(413).json({ error: 'データが大きすぎます' });
      await pipeline([
        ['RPUSH', k.inbox(other), payload],
        ['LTRIM', k.inbox(other), -100, -1],
        ['EXPIRE', k.inbox(other), INBOX_TTL],
      ]);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
