import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { content, title } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Контент для перевода не указан' },
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
        'X-Title': 'Referent - Article Translator',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `Ты профессиональный переводчик с английского на русский язык. 
Переводи текст точно и естественно, сохраняя смысл и стиль оригинала.
Не добавляй никаких комментариев или пояснений - только перевод.
Сохраняй структуру абзацев оригинального текста.`
          },
          {
            role: 'user',
            content: `Переведи следующую статью на русский язык:\n\n${title ? `Заголовок: ${title}\n\n` : ''}${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error:', errorData);
      return NextResponse.json(
        { error: `Ошибка API OpenRouter: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content;

    if (!translation) {
      return NextResponse.json(
        { error: 'Не удалось получить перевод' },
        { status: 500 }
      );
    }

    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: `Ошибка перевода: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` },
      { status: 500 }
    );
  }
}

