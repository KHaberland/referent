import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { content, title } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Контент статьи не указан' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API ключ OpenRouter не настроен' },
        { status: 500 }
      );
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - Article Analyzer',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `Ты — профессиональный аналитик контента. Твоя задача — прочитать англоязычную статью и кратко описать на русском языке, о чём она.

Требования к ответу:
- Напиши 3-5 предложений
- Выдели главную идею статьи
- Укажи ключевые моменты и выводы
- Пиши простым и понятным языком
- Не добавляй своих оценок, только факты из статьи`
          },
          {
            role: 'user',
            content: `Проанализируй статью и кратко опиши, о чём она:\n\n${title ? `Заголовок: ${title}\n\n` : ''}${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error:', errorData);
      const errorMessage = errorData?.error?.message || errorData?.message || JSON.stringify(errorData);
      return NextResponse.json(
        { error: `Ошибка API OpenRouter: ${response.status} - ${errorMessage}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      return NextResponse.json(
        { error: 'Не удалось получить анализ статьи' },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summary error:', error);
    return NextResponse.json(
      { error: `Ошибка анализа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` },
      { status: 500 }
    );
  }
}

