# 📱 Как превратить тренажёр в Android-приложение (APK)

## ✅ Что уже готово

Текущий проект настроен как **PWA (Progressive Web App)**:
- ✅ `manifest.json` — описание приложения для Android
- ✅ `sw.js` — Service Worker для офлайн-работы
- ✅ Иконка `icons/icon.svg`
- ✅ Кнопка «Установить приложение» на мобильных устройствах
- ✅ Поддержка safe-area для устройств с «чёлкой»

---

## 🚀 3 способа создать APK

### Способ 1: PWABuilder (самый простой, без кода)

**Время:** 10 минут  
**Сложность:** ⭐ (очень просто)

1. Разместите сайт на хостинге (Netlify, Vercel, GitHub Pages) — **обязательно HTTPS!**
2. Перейдите на https://www.pwabuilder.com/
3. Введите URL вашего сайта
4. Нажмите "Start" → PWABuilder проверит PWA
5. Нажмите "Package for stores" → "Android"
6. Скачайте готовый APK

**Плюсы:** Не нужен компьютер с Android Studio.  
**Минусы:** Нужен публичный HTTPS-сайт.

---

### Способ 2: Bubblewrap (CLI от Google, TWA)

**Время:** 30 минут  
**Сложность:** ⭐⭐ (средне)

Trusted Web Activity — нативный Android-контейнер от Google для PWA.

```bash
# 1. Установите Node.js и Java 11+
# 2. Установите Bubblewrap
npm install -g @bubblewrap/cli

# 3. Инициализируйте проект
bubblewrap init --manifest=https://ваш-сайт.ru/manifest.json

# 4. Соберите APK
bubblewrap build
```

**Плюсы:** Официальный инструмент Google, качественный результат.  
**Минусы:** Нужен JDK 11 и Android SDK.

---

### Способ 3: Capacitor (нативный, с доступом к API устройства)

**Время:** 1-2 часа  
**Сложность:** ⭐⭐⭐ (требует настройки)

Позволяет добавить нативные функции: камера, уведомления, файловая система.

```bash
# 1. Установите Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init "ПромптТренажёр" "com.yourdomain.prompttrainer"

# 2. Добавьте Android-платформу
npm install @capacitor/android
npx cap add android

# 3. Соберите веб-приложение
npm run build

# 4. Синхронизируйте с Android-проектом
npx cap sync

# 5. Откройте в Android Studio
npx cap open android

# 6. В Android Studio: Build → Build APK
```

**Плюсы:** Полный контроль, доступ к нативным API.  
**Минусы:** Нужна Android Studio (3+ ГБ).

---

## 📋 Что нужно для создания APK

| Инструмент | Способ 1 | Способ 2 | Способ 3 |
|------------|----------|----------|----------|
| Публичный HTTPS-сайт | ✅ | ✅ | ❌ |
| Node.js | ❌ | ✅ | ✅ |
| Java JDK 11+ | ❌ | ✅ | ✅ |
| Android SDK | ❌ | ✅ | ✅ |
| Android Studio | ❌ | ❌ | ✅ |

---

## 🎯 Рекомендация

**Для быстрого результата:** Способ 1 (PWABuilder) — 10 минут, без кода.  
**Для публикации в Google Play:** Способ 2 (Bubblewrap) — официальный путь Google.  
**Для нативных функций:** Способ 3 (Capacitor) — если нужны камера, push-уведомления и т.д.

---

## 🔧 Альтернатива: установка как PWA без APK

Пользователи могут установить приложение **без APK** прямо из браузера:
1. Открыть сайт в Chrome на Android
2. Нажать «⋮» → «Добавить на главный экран»
3. Приложение появится как обычное, с иконкой и без адресной строки

**Это уже работает!** Просто разместите сайт на любом хостинге с HTTPS.

---

## 📦 Хостинг (бесплатно)

- **Netlify** — netlify.com (drag & drop папки `dist/`)
- **Vercel** — vercel.com
- **GitHub Pages** — pages.github.com
- **Cloudflare Pages** — pages.cloudflare.com

---

## ⚠️ Важные замечания

1. **HTTPS обязателен** — PWA и Service Worker работают только по HTTPS (кроме localhost)
2. **iframe chat.qwen.ai** — QWEN может блокировать встраивание в нативном WebView. В этом случае используйте кнопку «Открыть в новой вкладке»
3. **API-ключи** — хранятся в localStorage устройства пользователя, не на сервере
4. **Размер APK** — будет около 2-5 МБ (только WebView-обёртка)
