// src/lib/gemini.ts — Perplexity API 기반 AI 생성
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const API_URL = 'https://api.perplexity.ai/chat/completions';

async function callPerplexity(prompt: string): Promise<string> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY가 .env.local에 없습니다');
  }
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: '네이버 스마트스토어 SEO 전문가. 결과만 간결히 출력.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 800,
    }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Perplexity ${response.status}: ${text}`);
  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Perplexity 응답에 content가 없습니다');
  return content;
}

export async function generateNaverKeywords(
  productName: string,
  category?: string,
): Promise<string[]> {
  const prompt = `네이버 스마트스토어 "${productName}"${category ? `(${category})` : ''} 키워드 15개. 쉼표로만 구분, 번호/설명 제외.`;
  const text = await callPerplexity(prompt);
  return text
    .split(',')
    .map((k) => k.trim().replace(/^\d+\.\s*/, ''))
    .filter((k) => k.length > 0 && k.length < 50)
    .slice(0, 15);
}

export async function generateProductTitle(
  productName: string,
  keywords: string[],
): Promise<string[]> {
  const prompt = `네이버 스마트스토어 "${productName}" 제목 5개. 키워드: ${keywords.slice(0, 5).join(', ')}. 50자 이내, 줄바꿈 구분, 번호 제외.`;
  const text = await callPerplexity(prompt);
  return text
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter((line) => line.length > 0 && line.length <= 50)
    .slice(0, 5);
}

export async function generateProductDescription(
  productName: string,
  keywords: string[],
  features?: string[],
): Promise<string> {
  const prompt = `네이버 스마트스토어 "${productName}" 상세 설명 3문단. 키워드: ${keywords.join(', ')}${features ? `. 특징: ${features.join(', ')}` : ''}. HTML 태그 없이.`;
  return await callPerplexity(prompt);
}
