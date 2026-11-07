exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { statusCode: 503, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reply: "ИИ ещё не подключён: добавьте GEMINI_API_KEY в переменные окружения Netlify." }) };
  try {
    const { message, city, products = [] } = JSON.parse(event.body || "{}");
    const catalog = products.slice(0, 90).map(p => `${p.name} — ${p.price} ₽ (${p.category})`).join("\n");
    const prompt = `Ты дружелюбный ИИ-продавец российского магазина Apple Shop. Отвечай на русском, помогай сравнивать устройства и выбирать по бюджету. Не выдумывай наличие, скидки, сроки доставки или точные характеристики, если их нет в каталоге. Цены только в рублях. Город покупателя: ${city}. Каталог:\n${catalog}\n\nВопрос покупателя: ${String(message).slice(0, 2000)}`;
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 700 } })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini request failed");
    const reply = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reply: reply || "Не удалось сформировать ответ." }) };
  } catch (e) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reply: "Сейчас не удалось связаться с ИИ. Попробуйте немного позже." }) };
  }
};
