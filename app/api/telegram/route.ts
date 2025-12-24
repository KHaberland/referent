import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { content, title, url } = await request.json();

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
        'X-Title': 'Referent - Telegram Post Generator',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `Ты — опытный SMM-специалист, который ведёт информационный Telegram-канал. Твоя задача — написать пост для Telegram на русском языке по мотивам англоязычной статьи.

Требования к посту:
- Длина: 150-300 слов
- Пиши информативно и увлекательно
- Используй эмодзи умеренно (2-4 штуки на пост)
- Разбивай текст на короткие абзацы для удобного чтения
- Выдели главную мысль статьи
- В конце добавь призыв к обсуждению или вопрос для подписчиков
- Не копируй статью дословно, а пересказывай своими словами
- Если указана ссылка на оригинал, добавь её в конце поста`
          },
          {
            role: 'user',
            content: `Напиши пост для Telegram по мотивам статьи:\n\n${title ? `Заголовок: ${title}\n\n` : ''}${content}${url ? `\n\nСсылка на оригинал: ${url}` : ''}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
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
    const post = data.choices?.[0]?.message?.content;

    if (!post) {
      return NextResponse.json(
        { error: 'Не удалось сгенерировать пост' },
        { status: 500 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Telegram post error:', error);
    return NextResponse.json(
      { error: `Ошибка генерации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` },
      { status: 500 }
    );
  }
}

