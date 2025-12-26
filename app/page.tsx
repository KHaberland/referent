'use client';

import { useState, useRef, useEffect } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { ErrorCode, errorMessages, ApiError } from '@/lib/errors';

const URL_HISTORY_KEY = 'referent_url_history';
const MAX_HISTORY_SIZE = 5;

type ActionType = 'summary' | 'theses' | 'telegram' | 'illustration' | null;

interface ParsedArticle {
  date: string | null;
  title: string | null;
  content: string | null;
}

interface ErrorState {
  title: string;
  message: string;
  code?: ErrorCode;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [parsedData, setParsedData] = useState<ParsedArticle | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<ErrorState | null>(null);
  const [copied, setCopied] = useState(false);
  const [urlHistory, setUrlHistory] = useState<string[]>([]);
  const [showUrlHistory, setShowUrlHistory] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState<string | null>(null);
  
  const resultRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

  // Загружаем историю URL из localStorage при монтировании
  useEffect(() => {
    const savedHistory = localStorage.getItem(URL_HISTORY_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setUrlHistory(parsed.slice(0, MAX_HISTORY_SIZE));
        }
      } catch {
        // Если старый формат (одиночный URL), конвертируем
        const oldUrl = localStorage.getItem('referent_last_url');
        if (oldUrl) {
          setUrlHistory([oldUrl]);
          localStorage.setItem(URL_HISTORY_KEY, JSON.stringify([oldUrl]));
          localStorage.removeItem('referent_last_url');
        }
      }
    } else {
      // Миграция со старого формата
      const oldUrl = localStorage.getItem('referent_last_url');
      if (oldUrl) {
        setUrlHistory([oldUrl]);
        localStorage.setItem(URL_HISTORY_KEY, JSON.stringify([oldUrl]));
        localStorage.removeItem('referent_last_url');
      }
    }
  }, []);

  // Добавление URL в историю
  const addUrlToHistory = (newUrl: string) => {
    setUrlHistory(prev => {
      // Удаляем дубликаты и добавляем новый URL в начало
      const filtered = prev.filter(u => u !== newUrl);
      const updated = [newUrl, ...filtered].slice(0, MAX_HISTORY_SIZE);
      localStorage.setItem(URL_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Закрываем выпадающий список при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node)
      ) {
        setShowUrlHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Переключение выпадающего списка
  const toggleUrlHistory = () => {
    if (urlHistory.length > 0) {
      setShowUrlHistory(prev => !prev);
    }
  };

  // Выбор URL из истории
  const handleSelectUrl = (selectedUrl: string) => {
    setUrl(selectedUrl);
    setShowUrlHistory(false);
    if (error) setError(null);
  };

  // Получение дружественного сообщения из ошибки API
  const getErrorMessage = (apiError: ApiError | undefined, fallbackMessage: string): ErrorState => {
    if (apiError && apiError.code && apiError.message) {
      return {
        title: getErrorTitle(apiError.code),
        message: apiError.message,
        code: apiError.code,
      };
    }
    return {
      title: 'Ошибка',
      message: fallbackMessage,
    };
  };

  // Заголовок ошибки по коду
  const getErrorTitle = (code: ErrorCode): string => {
    if (code.startsWith('ARTICLE_')) return 'Ошибка загрузки статьи';
    if (code.startsWith('AI_')) return 'Ошибка анализа';
    if (code.startsWith('INVALID_') || code.startsWith('URL_') || code.startsWith('CONTENT_')) return 'Ошибка валидации';
    if (code === ErrorCode.NETWORK_ERROR) return 'Ошибка сети';
    return 'Ошибка';
  };

  const parseArticle = async (): Promise<ParsedArticle | null> => {
    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw getErrorMessage(data.error, 'Не удалось загрузить статью по этой ссылке.');
    }

    return data;
  };

  const handleAction = async (action: ActionType) => {
    if (!url.trim()) {
      setError({
        title: 'Ошибка валидации',
        message: errorMessages[ErrorCode.URL_REQUIRED],
        code: ErrorCode.URL_REQUIRED,
      });
      return;
    }

    // Проверяем URL на корректность
    try {
      new URL(url);
    } catch {
      setError({
        title: 'Ошибка валидации',
        message: errorMessages[ErrorCode.INVALID_URL],
        code: ErrorCode.INVALID_URL,
      });
      return;
    }

    setLoading(true);
    setActiveAction(action);
    setResult('');
    setError(null);
    setParsedData(null);
    setGeneratedImage(null);
    setImagePrompt(null);
    setStatusMessage('Загружаю статью…');

    try {
      // Сначала парсим статью
      const parsed = await parseArticle();
      setParsedData(parsed);
      
      // Сохраняем URL в историю при успешном парсинге
      addUrlToHistory(url);

      if (!parsed || !parsed.content) {
        setError({
          title: 'Ошибка загрузки статьи',
          message: errorMessages[ErrorCode.ARTICLE_EMPTY_CONTENT],
          code: ErrorCode.ARTICLE_EMPTY_CONTENT,
        });
        setLoading(false);
        setStatusMessage('');
        return;
      }

      setStatusMessage('Анализирую контент…');

      if (action === 'summary') {
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
          throw getErrorMessage(summaryData.error, 'Ошибка при анализе статьи.');
        }

        setResult(`📄 ${parsed.title}\n📅 Дата: ${parsed.date || 'не указана'}\n\n────────────────────────────\n\n${summaryData.summary}`);
        scrollToResult();
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
          throw getErrorMessage(thesesData.error, 'Ошибка при генерации тезисов.');
        }

        setResult(`📄 ${parsed.title}\n📅 Дата: ${parsed.date || 'не указана'}\n\n────────────────────────────\n\n${thesesData.theses}`);
        scrollToResult();
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
          throw getErrorMessage(telegramData.error, 'Ошибка при генерации поста.');
        }

        setResult(`✈️ Пост для Telegram\n\n────────────────────────────\n\n${telegramData.post}`);
        scrollToResult();
      } else if (action === 'illustration') {
        // Генерация иллюстрации
        setStatusMessage('Создаю промпт для изображения…');
        
        // Шаг 1: Генерируем промпт через OpenRouter
        const promptResponse = await fetch('/api/image-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: parsed.content,
            title: parsed.title 
          }),
        });

        const promptData = await promptResponse.json();

        if (!promptResponse.ok) {
          throw getErrorMessage(promptData.error, 'Ошибка при создании промпта для изображения.');
        }

        setImagePrompt(promptData.prompt);
        setStatusMessage('Генерирую изображение…');

        // Шаг 2: Генерируем изображение через Hugging Face
        const imageResponse = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptData.prompt }),
        });

        const imageData = await imageResponse.json();

        if (!imageResponse.ok) {
          throw getErrorMessage(imageData.error, 'Ошибка при генерации изображения.');
        }

        setGeneratedImage(imageData.imageUrl);
        setResult(`📄 ${parsed.title}\n📅 Дата: ${parsed.date || 'не указана'}\n\n────────────────────────────\n\n🎨 Промпт: ${promptData.prompt}`);
        scrollToResult();
      }
    } catch (err) {
      // Обрабатываем структурированную ошибку
      if (err && typeof err === 'object' && 'title' in err && 'message' in err) {
        setError(err as ErrorState);
      } else if (err instanceof Error) {
        // Сетевые ошибки
        if (err.message.includes('fetch') || err.message.includes('network')) {
          setError({
            title: 'Ошибка сети',
            message: errorMessages[ErrorCode.NETWORK_ERROR],
            code: ErrorCode.NETWORK_ERROR,
          });
        } else {
          setError({
            title: 'Ошибка',
            message: errorMessages[ErrorCode.UNKNOWN_ERROR],
            code: ErrorCode.UNKNOWN_ERROR,
          });
        }
      } else {
        setError({
          title: 'Ошибка',
          message: errorMessages[ErrorCode.UNKNOWN_ERROR],
          code: ErrorCode.UNKNOWN_ERROR,
        });
      }
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleRetry = () => {
    if (activeAction) {
      handleAction(activeAction);
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  // Функция сброса всех состояний
  const handleClear = () => {
    setUrl('');
    setResult('');
    setError(null);
    setParsedData(null);
    setActiveAction(null);
    setStatusMessage('');
    setCopied(false);
    setGeneratedImage(null);
    setImagePrompt(null);
  };

  // Функция копирования результата
  const handleCopy = async () => {
    if (!result) return;
    
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = result;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Прокрутка к результатам
  const scrollToResult = () => {
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <main className="min-h-screen py-6 px-4 sm:py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 sm:mb-3">
            Referent
          </h1>
          <p className="text-slate-600 text-base sm:text-lg px-2">
            AI-помощник для анализа англоязычных статей
          </p>
        </div>

        {/* Форма ввода URL */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
          <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-2">
            URL англоязычной статьи
          </label>
          <div className="relative">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                id="url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setShowUrlHistory(false);
                  // Сбрасываем ошибку при изменении URL
                  if (error) setError(null);
                }}
                placeholder="https://example.com/article"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 rounded-lg sm:rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-slate-800 placeholder:text-slate-400 text-sm sm:text-base"
              />
              
              {/* Кнопка выпадающего списка */}
              {urlHistory.length > 0 && (
                <button
                  ref={dropdownButtonRef}
                  onClick={toggleUrlHistory}
                  type="button"
                  className="absolute right-2 sm:right-3 p-1 hover:bg-slate-100 rounded transition-colors"
                  title="История URL"
                >
                  <svg 
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showUrlHistory ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Выпадающий список с историей URL */}
            {showUrlHistory && urlHistory.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-10 w-full mt-1 bg-white rounded-lg sm:rounded-xl border border-slate-200 shadow-lg overflow-hidden animate-fade-in"
              >
                {urlHistory.map((historyUrl, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectUrl(historyUrl)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-indigo-50 transition-colors flex items-center gap-2 border-b border-slate-100 last:border-b-0"
                  >
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-slate-600 text-sm truncate">{historyUrl}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500">
              Укажите ссылку на англоязычную статью
            </p>
            {/* Кнопка очистки */}
            {(url || result || error) && (
              <button
                onClick={handleClear}
                disabled={loading}
                className="text-xs text-slate-500 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Очистить
              </button>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
            <button
              onClick={() => handleAction('summary')}
              disabled={loading}
              title="Краткое описание основной темы и содержания статьи"
              className={`w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-200 text-sm sm:text-base
                ${activeAction === 'summary' && loading
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {activeAction === 'summary' && loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
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
              title="Список ключевых тезисов и выводов из статьи"
              className={`w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-200 text-sm sm:text-base
                ${activeAction === 'theses' && loading
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {activeAction === 'theses' && loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
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
              title="Готовый пост для публикации в Telegram-канале"
              className={`w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-200 text-sm sm:text-base
                ${activeAction === 'telegram' && loading
                  ? 'bg-sky-600 text-white'
                  : 'bg-sky-100 text-sky-700 hover:bg-sky-600 hover:text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {activeAction === 'telegram' && loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Генерация...
                </span>
              ) : (
                '✈️ Telegram'
              )}
            </button>

            <button
              onClick={() => handleAction('illustration')}
              disabled={loading}
              title="Сгенерировать иллюстрацию к статье с помощью AI"
              className={`w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-200 text-sm sm:text-base
                ${activeAction === 'illustration' && loading
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {activeAction === 'illustration' && loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Генерация...
                </span>
              ) : (
                '🎨 Иллюстрация'
              )}
            </button>
          </div>
        </div>

        {/* Блок ошибки */}
        {error && (
          <div className="mb-4 sm:mb-6">
            <ErrorAlert
              title={error.title}
              message={error.message}
              onClose={handleCloseError}
              onRetry={activeAction ? handleRetry : undefined}
            />
          </div>
        )}

        {/* Блок статуса процесса */}
        {statusMessage && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg sm:rounded-xl px-3 sm:px-5 py-2.5 sm:py-3 mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3 animate-fade-in">
            <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin flex-shrink-0"></div>
            <span className="text-indigo-700 text-xs sm:text-sm font-medium">{statusMessage}</span>
          </div>
        )}

        {/* Блок результата */}
        {(result || loading || generatedImage) && !error && (
          <div ref={resultRef} className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                Результат
              </h2>
              {/* Кнопка копирования */}
              {result && !loading && !generatedImage && (
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                    copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="hidden xs:inline">Скопировано</span>
                      <span className="xs:hidden">✓</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden sm:inline">Копировать</span>
                    </>
                  )}
                </button>
              )}
              {/* Кнопка скачивания для изображения */}
              {generatedImage && !loading && (
                <a
                  href={generatedImage}
                  download="illustration.png"
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline">Скачать</span>
                </a>
              )}
            </div>
            <div className="bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 min-h-[150px] sm:min-h-[200px] overflow-auto max-h-[600px] sm:max-h-[700px]">
              {loading ? (
                <div className="flex items-center justify-center h-[150px] sm:h-[200px]">
                  <div className="flex flex-col items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm sm:text-base">
                      {activeAction === 'illustration' ? 'AI создаёт иллюстрацию...' : 'AI анализирует статью...'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {generatedImage && (
                    <div className="mb-4">
                      <img 
                        src={generatedImage} 
                        alt="Сгенерированная иллюстрация" 
                        className="w-full max-w-lg mx-auto rounded-lg shadow-md"
                      />
                    </div>
                  )}
                  {result && (
                    <pre className="whitespace-pre-wrap text-slate-700 font-mono text-xs sm:text-sm leading-relaxed break-words">
                      {result}
                    </pre>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Футер */}
        <p className="text-center text-slate-400 text-xs sm:text-sm mt-6 sm:mt-8 px-4">
          Вставьте ссылку на англоязычную статью и выберите действие
        </p>
      </div>
    </main>
  );
}
