'use client';

import { useState } from 'react';

type ActionType = 'parse' | 'summary' | 'theses' | 'telegram' | 'translate' | null;

interface ParsedArticle {
  date: string | null;
  title: string | null;
  content: string | null;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [parsedData, setParsedData] = useState<ParsedArticle | null>(null);

  const parseArticle = async (): Promise<ParsedArticle | null> => {
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка парсинга');
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  const handleAction = async (action: ActionType) => {
    if (!url.trim()) {
      setResult('Пожалуйста, введите URL статьи');
      return;
    }

    setLoading(true);
    setActiveAction(action);
    setResult('');
    setParsedData(null);

    try {
      // Сначала парсим статью
      const parsed = await parseArticle();
      setParsedData(parsed);

      if (!parsed || !parsed.content) {
        setResult('Не удалось извлечь контент статьи');
        setLoading(false);
        return;
      }

      if (action === 'parse') {
        // Просто показываем результат парсинга
        const jsonResult = JSON.stringify(parsed, null, 2);
        setResult(jsonResult);
      } else if (action === 'translate') {
        // Перевод статьи через OpenRouter AI (DeepSeek)
        const translateResponse = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: parsed.content,
            title: parsed.title 
          }),
        });

        const translateData = await translateResponse.json();

        if (!translateResponse.ok) {
          throw new Error(translateData.error || 'Ошибка перевода');
        }

        setResult(`📄 ${parsed.title}\n📅 Дата: ${parsed.date || 'не указана'}\n\n────────────────────────────\n\n${translateData.translation}`);
      } else if (action === 'summary') {
        // Анализ статьи — о чём она
        const summaryResponse = await fetch('/api/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: parsed.content,
            title: parsed.title 
          }),
        });

        const summaryData = await summaryResponse.json();

        if (!summaryResponse.ok) {
          throw new Error(summaryData.error || 'Ошибка анализа');
        }

        setResult(`📄 ${parsed.title}\n📅 Дата: ${parsed.date || 'не указана'}\n\n────────────────────────────\n\n${summaryData.summary}`);
      } else if (action === 'theses') {
        // Тезисы статьи
        const thesesResponse = await fetch('/api/theses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: parsed.content,
            title: parsed.title 
          }),
        });

        const thesesData = await thesesResponse.json();

        if (!thesesResponse.ok) {
          throw new Error(thesesData.error || 'Ошибка генерации тезисов');
        }

        setResult(`📄 ${parsed.title}\n📅 Дата: ${parsed.date || 'не указана'}\n\n────────────────────────────\n\n${thesesData.theses}`);
      } else if (action === 'telegram') {
        // Пост для Telegram
        const telegramResponse = await fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: parsed.content,
            title: parsed.title,
            url: url
          }),
        });

        const telegramData = await telegramResponse.json();

        if (!telegramResponse.ok) {
          throw new Error(telegramData.error || 'Ошибка генерации поста');
        }

        setResult(`✈️ Пост для Telegram\n\n────────────────────────────\n\n${telegramData.post}`);
      }
    } catch (error) {
      setResult(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Referent
          </h1>
          <p className="text-slate-600 text-lg">
            AI-помощник для анализа англоязычных статей
          </p>
        </div>

        {/* Форма ввода URL */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-2">
            URL англоязычной статьи
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-slate-800 placeholder:text-slate-400"
          />

          {/* Кнопки действий */}
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={() => handleAction('parse')}
              disabled={loading}
              className={`flex-1 min-w-[140px] px-6 py-3 rounded-xl font-medium transition-all duration-200
                ${activeAction === 'parse' && loading
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-600 hover:text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {activeAction === 'parse' && loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Парсинг...
                </span>
              ) : (
                '🔍 Парсинг'
              )}
            </button>

            <button
              onClick={() => handleAction('translate')}
              disabled={loading}
              className={`flex-1 min-w-[140px] px-6 py-3 rounded-xl font-medium transition-all duration-200
                ${activeAction === 'translate' && loading
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {activeAction === 'translate' && loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Перевод...
                </span>
              ) : (
                '🌐 Перевод'
              )}
            </button>

            <button
              onClick={() => handleAction('summary')}
              disabled={loading}
              className={`flex-1 min-w-[140px] px-6 py-3 rounded-xl font-medium transition-all duration-200
                ${activeAction === 'summary' && loading
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {activeAction === 'summary' && loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Анализ...
                </span>
              ) : (
                '📝 О чем статья?'
              )}
            </button>

            <button
              onClick={() => handleAction('theses')}
              disabled={loading}
              className={`flex-1 min-w-[140px] px-6 py-3 rounded-xl font-medium transition-all duration-200
                ${activeAction === 'theses' && loading
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {activeAction === 'theses' && loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Анализ...
                </span>
              ) : (
                '📋 Тезисы'
              )}
            </button>

            <button
              onClick={() => handleAction('telegram')}
              disabled={loading}
              className={`flex-1 min-w-[140px] px-6 py-3 rounded-xl font-medium transition-all duration-200
                ${activeAction === 'telegram' && loading
                  ? 'bg-sky-600 text-white'
                  : 'bg-sky-100 text-sky-700 hover:bg-sky-600 hover:text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {activeAction === 'telegram' && loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Генерация...
                </span>
              ) : (
                '✈️ Пост для Telegram'
              )}
            </button>
          </div>
        </div>

        {/* Блок результата */}
        {(result || loading) && (
          <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Результат
            </h2>
            <div className="bg-slate-50 rounded-xl p-6 min-h-[200px] overflow-auto max-h-[500px]">
              {loading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500">
                      {activeAction === 'parse' ? 'Парсинг статьи...' : 
                       activeAction === 'translate' ? 'Перевод статьи...' : 'AI анализирует статью...'}
                    </p>
                  </div>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-slate-700 font-mono text-sm leading-relaxed">
                  {result}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Футер */}
        <p className="text-center text-slate-400 text-sm mt-8">
          Вставьте ссылку на англоязычную статью и выберите действие
        </p>
      </div>
    </main>
  );
}
