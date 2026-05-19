// api/analyze.js — Proxy serverless seguro a la API de Google Gemini
// Usa el modo JSON estructurado nativo para garantizar respuestas JSON válidas.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido. Usa POST.' });
  }

  const { company, system } = req.body || {};

  if (!company || typeof company !== 'string') {
    return res.status(400).json({ error: 'Falta el campo "company" en el body.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor.' });
  }

  const MODEL = 'gemini-2.5-flash';
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: system || 'Eres un consultor estrategico senior.' }]
        },
        contents: [
          {
            role: 'user',
            parts: [{
              text: `Analiza estrategicamente la siguiente empresa siguiendo exactamente la estructura JSON que se te indico: ${company}`
            }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.6,
          maxOutputTokens: 8192,
          topP: 0.95
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      return res.status(500).json({
        error: 'Respuesta vacia de Gemini',
        raw: data
      });
    }

    return res.status(200).json({
      content: [{ text: text }],
      model: MODEL,
      usage: data?.usageMetadata
    });

  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error desconocido en el servidor.' });
  }
};
