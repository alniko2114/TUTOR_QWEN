# 📦 Как создать архив с файлами

## Автоматическая упаковка

### На Windows (PowerShell):
```powershell
# Создать ZIP-архив с необходимыми файлами
Compress-Archive -Path "public\autonomous.html","README.md","ANDROID_BUILD.md" -DestinationPath "prompt-trainer.zip"
```

### На macOS/Linux:
```bash
# Создать ZIP-архив
zip -r prompt-trainer.zip public/autonomous.html README.md ANDROID_BUILD.md
```

### На любой системе (Python):
```python
import zipfile
import os

with zipfile.ZipFile('prompt-trainer.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipf.write('public/autonomous.html', 'autonomous.html')
    zipf.write('README.md', 'README.md')
    zipf.write('ANDROID_BUILD.md', 'ANDROID_BUILD.md')

print("✅ Архив создан: prompt-trainer.zip")
```

## 📁 Что включить в архив

### Минимальный набор (только автономный файл):
- ✅ `public/autonomous.html` — работает сразу в браузере

### Полный набор (для разработки):
- ✅ `public/autonomous.html` — автономная версия
- ✅ `dist/` — собранный проект (после `npm run build`)
- ✅ `src/` — исходный код
- ✅ `README.md` — инструкция
- ✅ `ANDROID_BUILD.md` — инструкция по созданию APK
- ✅ `package.json` — зависимости

### Для публикации на хостинге:
- ✅ Вся папка `dist/` (загрузите на Netlify/Vercel/GitHub Pages)

## 🚀 Использование после распаковки

### Вариант 1: Просто открыть в браузере
1. Распакуйте архив
2. Откройте `autonomous.html` двойным кликом
3. Готово! Работает без сервера

### Вариант 2: Запустить локальный сервер
```bash
# Перейдите в папку dist/
cd dist

# Запустите сервер (Python 3)
python -m http.server 8000

# Откройте http://localhost:8000
```

### Вариант 3: Разместить на хостинге
1. Загрузите содержимое `dist/` на Netlify/Vercel/GitHub Pages
2. Получите HTTPS-ссылку
3. Установите как PWA на телефон

## 📱 Установка на Android

### Без APK (PWA):
1. Откройте сайт в Chrome
2. «⋮» → «Добавить на главный экран»
3. Приложение установлено

### С APK:
См. файл `ANDROID_BUILD.md` — 3 способа создания APK.

## ✅ Проверка работоспособности

После распаковки проверьте:
- [ ] `autonomous.html` открывается в браузере
- [ ] Все 6 разделов отображаются
- [ ] 18 заданий доступны
- [ ] Песочница загружает chat.qwen.ai
- [ ] Тёмная/светлая тема переключается
- [ ] Прогресс сохраняется при перезагрузке

## 🔧 Если что-то не работает

1. **iframe не загружается** — используйте кнопку «Открыть в новой вкладке»
2. **Прогресс не сохраняется** — проверьте, что localStorage включён в браузере
3. **Стили не отображаются** — убедитесь, что файл открыт полностью (не обрезан)

## 📞 Поддержка

Если возникли проблемы — проверьте `README.md` или создайте Issue.

---

**Удачи в обучении промптингу! 🎓**
