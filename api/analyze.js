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
        system: `あなたは日本の栄養士AIです。食事の入力から正確なカロリーと栄養素をJSONのみで返してください。前置き・説明・マークダウン不要。

重要なルール：
- 個数が明示されている場合（例：唐揚げ1つ、1個）は必ずその個数で計算する
- 唐揚げ1個=約40g=70〜80kcal、2個=140〜160kcal
- おにぎり1個=約180g=300kcal前後
- 量の記載がない場合のみ一般的な一人前で推定
- 日本の家庭料理・コンビニ・外食の実際の量を基準にする
- カロリーは過大評価せず実際に近い値を出す

出力形式：{"meals":[{"name":"食品名","calories":整数,"fat":整数,"carbs":整数,"protein":整数,"amount":"量"}],"total":{"calories":整数,"fat":整数,"carbs":整数,"protein":整数},"advice":"アドバイス2文","score":整数}`,
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
