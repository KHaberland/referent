import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { 
  ErrorCode, 
  createError, 
  getErrorCodeFromStatus, 
  getErrorCodeFromMessage 
} from '@/lib/errors';

interface ParsedArticle {
  date: string | null;
  title: string | null;
  content: string | null;
}

// Таймаут для загрузки страницы (15 секунд)
const FETCH_TIMEOUT = 15000;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: createError(ErrorCode.URL_REQUIRED) },
        { status: 400 }
      );
    }

    // Валидация URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: createError(ErrorCode.INVALID_URL) },
        { status: 400 }
      );
    }

    // Создаём AbortController для таймаута
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    let response: Response;
    try {
      // Получаем HTML страницы с заголовками, имитирующими браузер
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Проверяем тип ошибки
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          return NextResponse.json(
            { error: createError(ErrorCode.ARTICLE_TIMEOUT, 'Request aborted due to timeout') },
            { status: 408 }
          );
        }
        
        const errorCode = getErrorCodeFromMessage(fetchError.message);
        return NextResponse.json(
          { error: createError(errorCode, fetchError.message) },
          { status: 502 }
        );
      }
      
      return NextResponse.json(
        { error: createError(ErrorCode.NETWORK_ERROR) },
        { status: 502 }
      );
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorCode = getErrorCodeFromStatus(response.status);
      return NextResponse.json(
        { error: createError(errorCode, `HTTP ${response.status}`) },
        { status: response.status >= 500 ? 502 : 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Извлекаем заголовок
    const title = extractTitle($);

    // Извлекаем дату
    const date = extractDate($);

    // Извлекаем контент
    const content = extractContent($);

    // Проверяем, удалось ли извлечь контент
    if (!content || content.trim().length < 100) {
      return NextResponse.json(
        { error: createError(ErrorCode.ARTICLE_EMPTY_CONTENT) },
        { status: 422 }
      );
    }

    const result: ParsedArticle = {
      date,
      title,
      content,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Parse error:', error);
    
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: createError(ErrorCode.ARTICLE_PARSE_ERROR, details) },
      { status: 500 }
    );
  }
}

function extractTitle($: cheerio.CheerioAPI): string | null {
  // Приоритетный порядок поиска заголовка
  const selectors = [
    'article h1',
    '.post-title',
    '.article-title',
    '.entry-title',
    'h1.title',
    '.content h1',
    'main h1',
    'h1',
    'meta[property="og:title"]',
  ];

  for (const selector of selectors) {
    if (selector.startsWith('meta')) {
      const content = $(selector).attr('content');
      if (content) return content.trim();
    } else {
      const text = $(selector).first().text();
      if (text) return text.trim();
    }
  }

  // Fallback на title страницы
  return $('title').text().trim() || null;
}

function extractDate($: cheerio.CheerioAPI): string | null {
  // Ищем дату в различных форматах
  const dateSelectors = [
    'time[datetime]',
    'meta[property="article:published_time"]',
    'meta[name="date"]',
    'meta[name="pubdate"]',
    '.post-date',
    '.article-date',
    '.entry-date',
    '.published',
    '.date',
    '[class*="date"]',
    '[class*="time"]',
  ];

  for (const selector of dateSelectors) {
    const element = $(selector).first();
    
    if (selector === 'time[datetime]') {
      const datetime = element.attr('datetime');
      if (datetime) return formatDate(datetime);
    }
    
    if (selector.startsWith('meta')) {
      const content = element.attr('content');
      if (content) return formatDate(content);
    }
    
    const text = element.text().trim();
    if (text && isLikelyDate(text)) {
      return text;
    }
  }

  return null;
}

function extractContent($: cheerio.CheerioAPI): string | null {
  // Удаляем ненужные элементы
  $('script, style, nav, header, footer, aside, .sidebar, .comments, .advertisement, .ad, .social-share, .related-posts').remove();

  // Приоритетный порядок поиска контента
  const contentSelectors = [
    'article',
    '[role="article"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '.post-body',
    '.article-body',
    'main',
    '.main-content',
  ];

  for (const selector of contentSelectors) {
    const element = $(selector).first();
    if (element.length) {
      // Получаем текст, сохраняя параграфы
      const paragraphs: string[] = [];
      element.find('p').each((_, p) => {
        const text = $(p).text().trim();
        if (text && text.length > 20) {
          paragraphs.push(text);
        }
      });
      
      if (paragraphs.length > 0) {
        return paragraphs.join('\n\n');
      }
    }
  }

  // Fallback: собираем все параграфы со страницы
  const fallbackParagraphs: string[] = [];
  $('p').each((_, p) => {
    const text = $(p).text().trim();
    if (text && text.length > 50) {
      fallbackParagraphs.push(text);
    }
  });

  return fallbackParagraphs.length > 0 ? fallbackParagraphs.join('\n\n') : null;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  } catch {
    // Возвращаем оригинальную строку, если не удалось распарсить
  }
  return dateString;
}

function isLikelyDate(text: string): boolean {
  // Проверяем, похож ли текст на дату
  const datePatterns = [
    /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/,
    /\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/,
    /\w+\s+\d{1,2},?\s+\d{4}/,
    /\d{1,2}\s+\w+\s+\d{4}/,
  ];
  
  return datePatterns.some(pattern => pattern.test(text)) && text.length < 50;
}
