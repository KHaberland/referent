// Коды ошибок приложения
export enum ErrorCode {
  // Ошибки загрузки статьи
  ARTICLE_NOT_FOUND = 'ARTICLE_NOT_FOUND',
  ARTICLE_LOAD_FAILED = 'ARTICLE_LOAD_FAILED',
  ARTICLE_TIMEOUT = 'ARTICLE_TIMEOUT',
  ARTICLE_ACCESS_DENIED = 'ARTICLE_ACCESS_DENIED',
  ARTICLE_PARSE_ERROR = 'ARTICLE_PARSE_ERROR',
  ARTICLE_EMPTY_CONTENT = 'ARTICLE_EMPTY_CONTENT',
  
  // Ошибки валидации
  INVALID_URL = 'INVALID_URL',
  URL_REQUIRED = 'URL_REQUIRED',
  CONTENT_REQUIRED = 'CONTENT_REQUIRED',
  
  // Ошибки AI-сервиса
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  AI_RATE_LIMITED = 'AI_RATE_LIMITED',
  AI_API_KEY_MISSING = 'AI_API_KEY_MISSING',
  
  // Ошибки генерации изображений
  IMAGE_GENERATION_FAILED = 'IMAGE_GENERATION_FAILED',
  IMAGE_API_KEY_MISSING = 'IMAGE_API_KEY_MISSING',
  
  // Общие ошибки
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Дружественные сообщения на русском
export const errorMessages: Record<ErrorCode, string> = {
  // Ошибки загрузки статьи
  [ErrorCode.ARTICLE_NOT_FOUND]: 'Не удалось загрузить статью по этой ссылке. Страница не найдена.',
  [ErrorCode.ARTICLE_LOAD_FAILED]: 'Не удалось загрузить статью по этой ссылке. Сервер недоступен.',
  [ErrorCode.ARTICLE_TIMEOUT]: 'Превышено время ожидания. Сервер статьи отвечает слишком долго.',
  [ErrorCode.ARTICLE_ACCESS_DENIED]: 'Доступ к статье ограничен. Возможно, требуется подписка или авторизация.',
  [ErrorCode.ARTICLE_PARSE_ERROR]: 'Не удалось обработать статью. Попробуйте другую ссылку.',
  [ErrorCode.ARTICLE_EMPTY_CONTENT]: 'Не удалось извлечь текст статьи. Страница может быть пустой или защищённой.',
  
  // Ошибки валидации
  [ErrorCode.INVALID_URL]: 'Указан некорректный URL. Проверьте правильность ссылки.',
  [ErrorCode.URL_REQUIRED]: 'Пожалуйста, введите URL статьи.',
  [ErrorCode.CONTENT_REQUIRED]: 'Отсутствует контент для анализа.',
  
  // Ошибки AI-сервиса
  [ErrorCode.AI_SERVICE_ERROR]: 'Ошибка при анализе статьи. Попробуйте ещё раз.',
  [ErrorCode.AI_SERVICE_UNAVAILABLE]: 'Сервис анализа временно недоступен. Попробуйте позже.',
  [ErrorCode.AI_RATE_LIMITED]: 'Слишком много запросов. Пожалуйста, подождите немного.',
  [ErrorCode.AI_API_KEY_MISSING]: 'Сервис анализа не настроен. Обратитесь к администратору.',
  
  // Ошибки генерации изображений
  [ErrorCode.IMAGE_GENERATION_FAILED]: 'Не удалось сгенерировать изображение. Попробуйте ещё раз.',
  [ErrorCode.IMAGE_API_KEY_MISSING]: 'Сервис генерации изображений не настроен. Обратитесь к администратору.',
  
  // Общие ошибки
  [ErrorCode.NETWORK_ERROR]: 'Ошибка сети. Проверьте подключение к интернету.',
  [ErrorCode.UNKNOWN_ERROR]: 'Произошла непредвиденная ошибка. Попробуйте ещё раз.',
};

// Тип ошибки для API
export interface ApiError {
  code: ErrorCode;
  message: string; // Дружественное сообщение
  details?: string; // Технические детали (для логов)
}

// Создание объекта ошибки
export function createError(code: ErrorCode, details?: string): ApiError {
  return {
    code,
    message: errorMessages[code],
    details,
  };
}

// Определение кода ошибки по HTTP статусу
export function getErrorCodeFromStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.INVALID_URL;
    case 401:
    case 403:
      return ErrorCode.ARTICLE_ACCESS_DENIED;
    case 404:
      return ErrorCode.ARTICLE_NOT_FOUND;
    case 408:
      return ErrorCode.ARTICLE_TIMEOUT;
    case 429:
      return ErrorCode.AI_RATE_LIMITED;
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorCode.ARTICLE_LOAD_FAILED;
    default:
      return ErrorCode.UNKNOWN_ERROR;
  }
}

// Определение кода ошибки из текста ошибки
export function getErrorCodeFromMessage(message: string): ErrorCode {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return ErrorCode.ARTICLE_TIMEOUT;
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return ErrorCode.NETWORK_ERROR;
  }
  if (lowerMessage.includes('api key') || lowerMessage.includes('apikey')) {
    return ErrorCode.AI_API_KEY_MISSING;
  }
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return ErrorCode.AI_RATE_LIMITED;
  }
  
  return ErrorCode.UNKNOWN_ERROR;
}

