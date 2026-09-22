// Service Worker для PWA "Тренажёр промптинга QWEN"
const CACHE_NAME = 'prompt-trainer-v1';
const OFFLINE_URL = '/';

// Список ключевых ресурсов для кеширования
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Установка: предзагружаем ключевые ресурсы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Обработка запросов: стратегия "stale-while-revalidate"
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к внешним API (OpenRouter, Groq, DashScope)
  if (event.request.url.includes('openrouter.ai') ||
      event.request.url.includes('api.groq.com') ||
      event.request.url.includes('dashscope.aliyuncs.com') ||
      event.request.url.includes('huggingface.co') ||
      event.request.url.includes('chat.qwen.ai')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Кешируем успешные ответы
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Если сеть недоступна, возвращаем офлайн-страницу для навигационных запросов
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
