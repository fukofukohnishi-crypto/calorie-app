export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { text, apiKey } = req.body;
  if (!text || !apiKey) return res.status(400).json({ error: 'Missing text or apiKey' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1000,
        system: `あなたは栄養士AIです。食事の入力からJSONのみを返してください。前置き・説明・マークダウンは不要です。{"meals":[{"name":"食品名","calories":整数,"fat":整数,"carbs":整数,"protein":整数,"amount":"量"}],"total":{"calories":整数,"fat":整数,"carbs":整数,"protein":整数},"advice":"アドバイス2文","score":整数}量不明は一般的な一人前で推定。`,
        messages: [{ role: 'user', content: text }],
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    const raw = (data.content || []).map(b => b.text || '').join('').trim();
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
