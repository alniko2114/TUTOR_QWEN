import { useState, useCallback, useEffect } from 'react';
import { sections } from './data/sections';
import { exercises, categories } from './data/exercises';

type View = 'welcome' | 'home' | 'section' | 'exercises' | 'sandbox' | 'exercise-detail';

interface APIConfig {
  provider: 'openrouter' | 'dashscope' | 'groq' | 'huggingface' | 'custom';
  apiKey: string;
  model: string;
  remember: boolean;
}

export default function App() {
  const [view, setView] = useState<View>('welcome');
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [currentExercise, setCurrentExercise] = useState<string | null>(null);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [darkMode, setDarkMode] = useState(false);
  const [sandboxPrompt, setSandboxPrompt] = useState('');
  const [showSandbox, setShowSandbox] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // API config state
  const [apiConfig, setApiConfig] = useState<APIConfig>(() => {
    const saved = localStorage.getItem('qwen_api_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { provider: 'openrouter', apiKey: '', model: 'qwen/qwen3.8-27b:free', remember: false };
      }
    }
    return { provider: 'openrouter', apiKey: '', model: 'qwen/qwen-2.5-72b-instruct', remember: false };
  });
  const [showApiForm, setShowApiForm] = useState(false);
  const [apiStatus, setApiStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const totalProgress = Math.round(
    ((completedSections.size + completedExercises.size) / (sections.length + exercises.length)) * 100
  );

  const markSectionComplete = useCallback((id: string) => {
    setCompletedSections(prev => new Set(prev).add(id));
  }, []);

  const markExerciseComplete = useCallback((id: string) => {
    setCompletedExercises(prev => new Set(prev).add(id));
  }, []);

  const openInSandbox = useCallback((prompt: string) => {
    setSandboxPrompt(prompt);
    setShowSandbox(true);
    setView('sandbox');
  }, []);

  const saveApiConfig = useCallback((config: APIConfig) => {
    if (config.remember) {
      localStorage.setItem('qwen_api_config', JSON.stringify(config));
    } else {
      localStorage.removeItem('qwen_api_config');
    }
    setApiConfig(config);
    setApiStatus('saved');
    setTimeout(() => setApiStatus('idle'), 2000);
  }, []);

  const clearApiConfig = useCallback(() => {
    localStorage.removeItem('qwen_api_config');
    setApiConfig({ provider: 'openrouter', apiKey: '', model: 'qwen/qwen3.8-27b:free', remember: false });
    setApiStatus('idle');
  }, []);

  const analyzePrompt = useCallback((_prompt: string, goodPrompt: string) => {
    const checks: string[] = [];
    const p = _prompt.toLowerCase();
    
    if (_prompt.length < 20) {
      checks.push('⚠️ Промпт слишком короткий (менее 20 символов). Добавьте больше деталей.');
    } else if (_prompt.length > 50) {
      checks.push('✅ Хорошая длина промпта.');
    }

    const contextWords = ['я ', 'мне ', 'мой ', 'моя ', 'у меня', 'хочу', 'нужно', 'проблема', 'ситуация', 'живу', 'работаю', 'учусь'];
    if (contextWords.some(w => p.includes(w))) {
      checks.push('✅ Есть контекст (описание ситуации).');
    } else {
      checks.push('⚠️ Добавьте контекст: опишите вашу ситуацию, кто вы, что уже знаете.');
    }

    const specificWords = ['руб', 'минут', 'часов', 'лет', 'метр', 'кг', 'человек', 'раз', 'шаг', 'дн', 'недел'];
    if (specificWords.some(w => p.includes(w))) {
      checks.push('✅ Есть конкретные параметры (числа, размеры, сроки).');
    } else {
      checks.push('💡 Добавьте конкретику: числа, размеры, сроки, бюджет.');
    }

    const formatWords = ['список', 'таблиц', 'пошагов', 'план', 'структур', 'пункт', 'формат', 'нумерован'];
    if (formatWords.some(w => p.includes(w))) {
      checks.push('✅ Указан формат ответа.');
    } else {
      checks.push('💡 Укажите желаемый формат: список, таблица, пошаговая инструкция.');
    }

    const roleWords = ['ты —', 'ты -', 'как ', 'специалист', 'эксперт', 'учитель', 'врач', 'юрист', 'повар', 'мастер', 'репетитор', 'консультант'];
    if (roleWords.some(w => p.includes(w))) {
      checks.push('✅ Указана роль для модели.');
    } else {
      checks.push('💡 Можно добавить роль: «Ты — опытный специалист в...»');
    }

    const limitWords = ['не более', 'не менее', 'без ', 'избегай', 'максимум', 'минимум', 'до ', 'простыми словами', 'коротко', 'подробно'];
    if (limitWords.some(w => p.includes(w))) {
      checks.push('✅ Есть ограничения или указания по стилю.');
    } else {
      checks.push('💡 Можно добавить ограничения: объём, стиль, что исключить.');
    }

    const words1 = new Set(_prompt.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(goodPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const intersection = [...words1].filter(w => words2.has(w));
    const similarity = intersection.length / Math.max(words2.size, 1);
    
    if (similarity > 0.5) {
      checks.push('🎯 Ваш промпт близок к идеальному! Отличная работа.');
    } else if (similarity > 0.25) {
      checks.push('📈 Хорошее начало! Добавьте ещё деталей из примера хорошего промпта.');
    } else {
      checks.push('🔄 Посмотрите на пример хорошего промпта и добавьте похожие элементы.');
    }

    return checks;
  }, []);

  const filteredExercises = selectedCategory === 'all' 
    ? exercises 
    : exercises.filter(e => e.category === selectedCategory);

  const themeClass = darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900';
  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const goodClass = darkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200';
  const badClass = darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200';
  const infoClass = darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200';

  return (
    <div className={`min-h-screen ${themeClass} transition-colors duration-200`}>
      {/* Header */}
      {view !== 'welcome' && (
        <header className={`sticky top-0 z-50 border-b ${cardClass} shadow-sm`}>
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView('home')}
                className="font-bold text-base sm:text-lg hover:opacity-80 transition-opacity"
              >
                🎓 ПромптТренажёр
              </button>
              <span className="text-xs opacity-50 hidden sm:inline">QWEN</span>
            </div>
            <nav className="flex items-center gap-1 sm:gap-3">
              <button onClick={() => setView('home')} className={`text-xs sm:text-sm px-2 py-1 rounded transition-colors ${view === 'home' || view === 'section' ? (darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700') : 'hover:opacity-70'}`}>📖 Разделы</button>
              <button onClick={() => setView('exercises')} className={`text-xs sm:text-sm px-2 py-1 rounded transition-colors ${view === 'exercises' || view === 'exercise-detail' ? (darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700') : 'hover:opacity-70'}`}>🎯 Практика</button>
              <button onClick={() => { setView('sandbox'); setShowSandbox(true); }} className={`text-xs sm:text-sm px-2 py-1 rounded transition-colors ${view === 'sandbox' ? (darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700') : 'hover:opacity-70'}`}>🧪 Песочница</button>
              <button onClick={() => setDarkMode(!darkMode)} className="text-sm px-2 py-1 rounded hover:opacity-70 transition-opacity" title="Переключить тему">
                {darkMode ? '☀️' : '🌙'}
              </button>
            </nav>
          </div>
          {/* Progress bar */}
          <div className={`h-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700 ease-out"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </header>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* WELCOME VIEW */}
        {view === 'welcome' && (
          <div className="min-h-[80vh] flex flex-col items-center justify-center text-center">
            <div className="max-w-2xl">
              <div className="text-5xl mb-6">🎓</div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">Тренажёр промптинга</h1>
              <p className="text-lg opacity-70 mb-2">Научитесь эффективно общаться с ИИ-моделью QWEN</p>
              <p className="text-sm opacity-50 mb-8">Поясняющие разделы • Практические задания • Встроенная песочница</p>
              
              <div className={`border rounded-xl p-6 mb-8 text-left ${cardClass}`}>
                <h2 className="font-semibold mb-3">Что вы узнаете:</h2>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2"><span>✅</span> Что такое ИИ и как он работает</li>
                  <li className="flex items-start gap-2"><span>✅</span> Как писать чёткие и конкретные промпты</li>
                  <li className="flex items-start gap-2"><span>✅</span> Получать от ИИ именно те ответы, которые нужны</li>
                  <li className="flex items-start gap-2"><span>✅</span> Решать бытовые, учебные и рабочие задачи с помощью ИИ</li>
                  <li className="flex items-start gap-2"><span>✅</span> Отличать слабые промпты от сильных</li>
                </ul>
              </div>

              <div className={`border rounded-xl p-6 mb-8 text-left ${cardClass}`}>
                <h2 className="font-semibold mb-3">Как устроен тренажёр:</h2>
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl mb-1">📖</div>
                    <div className="font-medium">6 разделов</div>
                    <div className="opacity-60">Пояснения об ИИ</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">🎯</div>
                    <div className="font-medium">14 заданий</div>
                    <div className="opacity-60">Реальные кейсы</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">🧪</div>
                    <div className="font-medium">Песочница</div>
                    <div className="opacity-60">QWEN прямо здесь</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setView('home')}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-lg"
              >
                Начать обучение →
              </button>
              
              <p className="text-xs opacity-40 mt-6">Бесплатно. Без регистрации. Работает в браузере.</p>
            </div>
          </div>
        )}

        {/* HOME VIEW - Sections list */}
        {view === 'home' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Поясняющие разделы об ИИ</h1>
              <p className="opacity-70 text-sm">Изучайте разделы в любом порядке. Каждый раздел содержит объяснение, примеры и практическое задание.</p>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <div className={`text-sm px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
                  📊 Прогресс: {completedSections.size}/{sections.length} разделов
                </div>
                <div className={`text-sm px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
                  🎯 Заданий выполнено: {completedExercises.size}/{exercises.length}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {sections.map((sec) => (
                <div key={sec.id} className={`border rounded-lg p-4 ${cardClass} transition-all hover:shadow-md cursor-pointer ${completedSections.has(sec.id) ? 'ring-2 ring-green-400/50' : ''}`}
                  onClick={() => { setCurrentSection(sec.id); setUserPrompt(''); setFeedback(null); setView('section'); }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl flex-shrink-0">{sec.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold">{sec.title}</h3>
                        {completedSections.has(sec.id) && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full dark:bg-green-900/30 dark:text-green-400">✓ Изучено</span>
                        )}
                      </div>
                      <p className="text-sm opacity-60">{sec.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => setView('exercises')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                Перейти к практическим заданиям →
              </button>
            </div>
          </div>
        )}

        {/* SECTION VIEW */}
        {view === 'section' && currentSection && (
          <SectionContent 
            section={sections.find(s => s.id === currentSection)!}
            cardClass={cardClass}
            goodClass={goodClass}
            badClass={badClass}
            infoClass={infoClass}
            darkMode={darkMode}
            onComplete={() => markSectionComplete(currentSection)}
            isCompleted={completedSections.has(currentSection)}
            onOpenSandbox={openInSandbox}
            onBack={() => setView('home')}
          />
        )}

        {/* EXERCISES VIEW */}
        {view === 'exercises' && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Практические задания</h1>
            <p className="opacity-70 text-sm mb-4">Выберите область и тренируйтесь на реальных кейсах. Для каждого задания есть слабый и сильный промпт — сравните и попробуйте свой вариант.</p>
            
            {/* Category filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    selectedCategory === cat.id 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                      : `${darkMode ? 'border-gray-600 hover:border-gray-400' : 'border-gray-300 hover:border-gray-400'}`
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            <div className="grid gap-3">
              {filteredExercises.map(ex => (
                <div key={ex.id} className={`border rounded-lg p-4 ${cardClass} transition-all hover:shadow-md ${completedExercises.has(ex.id) ? 'ring-2 ring-green-400/50' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{ex.category}</span>
                        {completedExercises.has(ex.id) && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full dark:bg-green-900/30 dark:text-green-400">✓</span>
                        )}
                      </div>
                      <h3 className="font-semibold">{ex.title}</h3>
                      <p className="text-sm opacity-60 mt-1">{ex.situation}</p>
                    </div>
                    <button
                      onClick={() => { setCurrentExercise(ex.id); setUserPrompt(''); setFeedback(null); setView('exercise-detail'); }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap transition-colors flex-shrink-0"
                    >
                      Решить →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXERCISE DETAIL VIEW */}
        {view === 'exercise-detail' && currentExercise && (
          <ExerciseDetail
            exercise={exercises.find(e => e.id === currentExercise)!}
            cardClass={cardClass}
            goodClass={goodClass}
            badClass={badClass}
            infoClass={infoClass}
            darkMode={darkMode}
            userPrompt={userPrompt}
            setUserPrompt={setUserPrompt}
            feedback={feedback}
            setFeedback={setFeedback}
            analyzePrompt={analyzePrompt}
            onComplete={() => markExerciseComplete(currentExercise)}
            isCompleted={completedExercises.has(currentExercise)}
            onOpenSandbox={openInSandbox}
            onBack={() => setView('exercises')}
          />
        )}

        {/* SANDBOX VIEW */}
        {view === 'sandbox' && (
          <SandboxView
            cardClass={cardClass}
            darkMode={darkMode}
            sandboxPrompt={sandboxPrompt}
            showSandbox={showSandbox}
            setShowSandbox={setShowSandbox}
            apiConfig={apiConfig}
            saveApiConfig={saveApiConfig}
            clearApiConfig={clearApiConfig}
            showApiForm={showApiForm}
            setShowApiForm={setShowApiForm}
            apiStatus={apiStatus}
          />
        )}
      </main>

      {/* Floating sandbox button */}
      {view !== 'sandbox' && view !== 'welcome' && (
        <button
          onClick={() => { setView('sandbox'); setShowSandbox(true); }}
          className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-blue-700 text-sm z-40 transition-all hover:scale-105"
        >
          🧪 Песочница
        </button>
      )}
    </div>
  );
}

// ==================== SECTION CONTENT ====================
function SectionContent({ section: sec, cardClass, goodClass, badClass, infoClass, darkMode, onComplete, isCompleted, onOpenSandbox, onBack }: {
  section: typeof sections[0];
  cardClass: string;
  goodClass: string;
  badClass: string;
  infoClass: string;
  darkMode: boolean;
  onComplete: () => void;
  isCompleted: boolean;
  onOpenSandbox: (prompt: string) => void;
  onBack: () => void;
}) {
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold mt-3">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-4 list-disc text-sm mb-1">{line.replace(/^- /, '').replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
      }
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-sm mb-1">
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>)}
        </p>
      );
    });
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm hover:underline opacity-70 hover:opacity-100 transition-opacity">
        ← Назад к разделам
      </button>

      <div className="flex items-start gap-3">
        <div className="text-4xl flex-shrink-0">{sec.icon}</div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{sec.title}</h1>
          <p className="opacity-70 text-sm mt-1">{sec.description}</p>
        </div>
      </div>

      {/* Content */}
      <div className={`border rounded-lg p-5 ${cardClass}`}>
        <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">📖 Пояснение</h2>
        <div className="max-w-none">
          {renderContent(sec.content)}
        </div>
      </div>

      {/* Good prompt */}
      <div className={`border rounded-lg p-5 ${goodClass}`}>
        <h2 className="font-semibold text-base mb-2 flex items-center gap-2">
          <span className="text-green-600">✅</span> Хороший промпт
        </h2>
        <pre className="text-sm whitespace-pre-wrap font-mono mb-3 leading-relaxed">{sec.goodPrompt}</pre>
        <button
          onClick={() => onOpenSandbox(sec.goodPrompt)}
          className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          🧪 Открыть в песочнице
        </button>
      </div>

      {/* Bad prompt */}
      <div className={`border rounded-lg p-5 ${badClass}`}>
        <h2 className="font-semibold text-base mb-2 flex items-center gap-2">
          <span className="text-red-600">❌</span> Плохой промпт
        </h2>
        <pre className="text-sm font-mono">{sec.badPrompt}</pre>
      </div>

      {/* Explanation */}
      <div className={`border rounded-lg p-5 ${infoClass}`}>
        <h2 className="font-semibold text-base mb-2 flex items-center gap-2">
          <span className="text-blue-600">💡</span> Почему так?
        </h2>
        <p className="text-sm">{sec.explanation}</p>
      </div>

      {/* Tips */}
      <div className={`border rounded-lg p-5 ${cardClass}`}>
        <h2 className="font-semibold text-base mb-3">💡 Ключевые правила</h2>
        <ul className="space-y-2">
          {sec.tips.map((tip, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-blue-500 font-bold mt-0.5 flex-shrink-0">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Takeaway */}
      <div className={`border rounded-lg p-5 ${darkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}`}>
        <h2 className="font-semibold text-base mb-2">📌 Главный вывод</h2>
        <p className="text-sm font-medium">{sec.takeaway}</p>
      </div>

      {/* Action */}
      <div className={`flex items-center justify-between pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={onBack}
          className={`px-4 py-2 rounded-lg border text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
        >
          ← К разделам
        </button>
        
        <div className="flex items-center gap-2">
          {!isCompleted ? (
            <button
              onClick={onComplete}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
            >
              ✓ Отметить как изученное
            </button>
          ) : (
            <span className="text-green-600 font-medium text-sm flex items-center gap-1">✓ Изучено</span>
          )}
        </div>

        <button
          onClick={() => onOpenSandbox('')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
        >
          🧪 В песочницу →
        </button>
      </div>
    </div>
  );
}

// ==================== EXERCISE DETAIL ====================
function ExerciseDetail({ exercise, cardClass, goodClass, badClass, infoClass, darkMode, userPrompt, setUserPrompt, feedback, setFeedback, analyzePrompt, onComplete, isCompleted, onOpenSandbox, onBack }: {
  exercise: typeof exercises[0];
  cardClass: string;
  goodClass: string;
  badClass: string;
  infoClass: string;
  darkMode: boolean;
  userPrompt: string;
  setUserPrompt: (v: string) => void;
  feedback: string | null;
  setFeedback: (v: string | null) => void;
  analyzePrompt: (prompt: string, good: string) => string[];
  onComplete: () => void;
  isCompleted: boolean;
  onOpenSandbox: (prompt: string) => void;
  onBack: () => void;
}) {
  const handleAnalyze = () => {
    if (!userPrompt.trim()) {
      setFeedback('⚠️ Сначала напишите свой промпт в поле выше.');
      return;
    }
    const results = analyzePrompt(userPrompt, exercise.goodPrompt);
    setFeedback(results.join('\n'));
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm hover:underline opacity-70 hover:opacity-100 transition-opacity">← Назад к заданиям</button>
      
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{exercise.category}</span>
          {isCompleted && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full dark:bg-green-900/30 dark:text-green-400">✓ Выполнено</span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold">{exercise.title}</h1>
      </div>

      {/* Situation */}
      <div className={`border rounded-lg p-5 ${cardClass}`}>
        <h2 className="font-semibold mb-2 flex items-center gap-2">📋 Ситуация</h2>
        <p className="text-sm">{exercise.situation}</p>
      </div>

      {/* Bad prompt */}
      <div className={`border rounded-lg p-5 ${badClass}`}>
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <span className="text-red-600">❌</span> Слабый промпт (так НЕ надо)
        </h2>
        <pre className="text-sm font-mono">{exercise.badPrompt}</pre>
      </div>

      {/* Good prompt */}
      <div className={`border rounded-lg p-5 ${goodClass}`}>
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <span className="text-green-600">✅</span> Сильный промпт (образец)
        </h2>
        <pre className="text-sm font-mono whitespace-pre-wrap mb-3 leading-relaxed">{exercise.goodPrompt}</pre>
        <button
          onClick={() => onOpenSandbox(exercise.goodPrompt)}
          className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          🧪 Попробовать этот промпт в QWEN
        </button>
      </div>

      {/* Explanation */}
      <div className={`border rounded-lg p-5 ${infoClass}`}>
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <span className="text-blue-600">💡</span> Разбор: почему сильный лучше
        </h2>
        <p className="text-sm">{exercise.explanation}</p>
      </div>

      {/* Task */}
      <div className={`border rounded-lg p-5 ${cardClass}`}>
        <h2 className="font-semibold mb-2 flex items-center gap-2">🎯 Ваше задание</h2>
        <p className="text-sm mb-4">{exercise.task}</p>
        
        {/* Hints */}
        <details className={`mb-4 rounded-lg border p-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <summary className="text-sm cursor-pointer opacity-70 hover:opacity-100 select-none font-medium">💡 Подсказки (нажмите)</summary>
          <ul className="mt-3 space-y-1.5">
            {exercise.hints.map((hint, i) => (
              <li key={i} className="text-sm opacity-80 flex items-start gap-2">
                <span className="text-blue-500 flex-shrink-0">→</span>
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </details>

        {/* User input */}
        <div className="space-y-3">
          <label className="text-sm font-medium block">✍️ Напишите свой промпт:</label>
          <textarea
            value={userPrompt}
            onChange={(e) => { setUserPrompt(e.target.value); setFeedback(null); }}
            placeholder="Напишите свой вариант промпта здесь... Постарайтесь включить контекст, роль, задачу и формат."
            className={`w-full h-36 p-3 border rounded-lg text-sm resize-y font-mono leading-relaxed ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-400'}`}
          />
          <div className="text-xs opacity-50">
            Символов: {userPrompt.length} | Слов: {userPrompt.trim() ? userPrompt.trim().split(/\s+/).length : 0}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleAnalyze}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
            >
              🔍 Проверить промпт
            </button>
            <button
              onClick={() => onOpenSandbox(userPrompt)}
              disabled={!userPrompt.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              🧪 В песочницу
            </button>
            {!isCompleted && (
              <button
                onClick={onComplete}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-colors"
              >
                ✓ Задание выполнено
              </button>
            )}
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`mt-4 p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className="font-semibold text-sm mb-3">📊 Анализ вашего промпта:</h3>
            <div className="text-sm space-y-2">
              {feedback.split('\n').map((line, i) => (
                <p key={i} className="leading-relaxed">{line}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== SANDBOX VIEW ====================
function SandboxView({ cardClass, darkMode, sandboxPrompt, showSandbox, setShowSandbox, apiConfig, saveApiConfig, clearApiConfig, showApiForm, setShowApiForm, apiStatus }: {
  cardClass: string;
  darkMode: boolean;
  sandboxPrompt: string;
  showSandbox: boolean;
  setShowSandbox: (v: boolean) => void;
  apiConfig: APIConfig;
  saveApiConfig: (config: APIConfig) => void;
  clearApiConfig: () => void;
  showApiForm: boolean;
  setShowApiForm: (v: boolean) => void;
  apiStatus: 'idle' | 'saved' | 'error';
}) {
  const [localPrompt, setLocalPrompt] = useState(sandboxPrompt);
  const [copied, setCopied] = useState(false);
  const [provider, setProvider] = useState(apiConfig.provider);
  const [apiKey, setApiKey] = useState(apiConfig.apiKey);
  const [model, setModel] = useState(apiConfig.model);
  const [remember, setRemember] = useState(apiConfig.remember);
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (sandboxPrompt) setLocalPrompt(sandboxPrompt);
  }, [sandboxPrompt]);

  const handleCopy = () => {
    navigator.clipboard.writeText(localPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = () => {
    if (!apiKey.trim()) {
      alert('Введите API-ключ');
      return;
    }
    saveApiConfig({
      provider,
      apiKey,
      model,
      remember
    });
  };

  const sendToAPI = async () => {
    if (!localPrompt.trim()) {
      alert('Введите промпт');
      return;
    }
    if (!apiConfig.apiKey) {
      alert('Сначала настройте API-ключ в разделе "API-ключ для песочницы"');
      return;
    }

    setIsLoading(true);
    const newHistory = [...chatHistory, { role: 'user', content: localPrompt }];
    setChatHistory(newHistory);

    try {
      let response;
      const messages = newHistory.map(msg => ({ role: msg.role, content: msg.content }));

      if (apiConfig.provider === 'openrouter') {
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`,
            'HTTP-Referer': window.location.origin,
          },
          body: JSON.stringify({
            model: apiConfig.model,
            messages: messages,
          }),
        });
      } else if (apiConfig.provider === 'dashscope') {
        response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: apiConfig.model,
            input: { messages: messages },
          }),
        });
      } else if (apiConfig.provider === 'groq') {
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: apiConfig.model,
            messages: messages,
          }),
        });
      } else if (apiConfig.provider === 'huggingface') {
        response = await fetch(`https://api-inference.huggingface.co/models/${apiConfig.model}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`,
          },
          body: JSON.stringify({
            inputs: localPrompt,
          }),
        });
      }

      if (response && response.ok) {
        const data = await response.json();
        let assistantMessage = '';
        
        if (apiConfig.provider === 'openrouter' || apiConfig.provider === 'groq') {
          assistantMessage = data.choices?.[0]?.message?.content || 'Нет ответа';
        } else if (apiConfig.provider === 'dashscope') {
          assistantMessage = data.output?.text || 'Нет ответа';
        } else if (apiConfig.provider === 'huggingface') {
          assistantMessage = data[0]?.generated_text || 'Нет ответа';
        }

        setChatHistory([...newHistory, { role: 'assistant', content: assistantMessage }]);
      } else {
        const errorText = await response?.text() || 'Ошибка запроса';
        setChatHistory([...newHistory, { role: 'assistant', content: `❌ Ошибка: ${errorText}` }]);
      }
    } catch (error) {
      setChatHistory([...newHistory, { role: 'assistant', content: `❌ Ошибка сети: ${error}` }]);
    } finally {
      setIsLoading(false);
      setLocalPrompt('');
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">🧪 Песочница QWEN</h1>
      <p className="opacity-70 text-sm">Практикуйтесь в написании промптов и проверяйте результат в QWEN через API или откройте chat.qwen.ai напрямую.</p>

      {/* API Key Instructions */}
      <div className={`border rounded-lg p-5 ${cardClass}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            🔑 Как получить бесплатный API-ключ
          </h2>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-sm px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {showInstructions ? 'Скрыть' : 'Показать инструкцию'}
          </button>
        </div>

        {showInstructions && (
          <div className="space-y-4 text-sm">
            <div className={`p-4 rounded-lg border ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
              <h3 className="font-semibold mb-2">🌟 Вариант 1: OpenRouter (рекомендуется)</h3>
              <ol className="list-decimal list-inside space-y-1 opacity-90">
                <li>Перейдите на <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">openrouter.ai</a></li>
                <li>Нажмите "Sign In" → войдите через Google (быстро и просто)</li>
                <li>Перейдите в раздел "Keys" в настройках</li>
                <li>Нажмите "Create Key" → скопируйте ключ</li>
                <li>Бесплатные модели QWEN доступны без пополнения баланса</li>
              </ol>
              <p className="mt-2 text-xs opacity-70">💡 Бесплатная модель: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">qwen/qwen3.8-27b:free</code></p>
            </div>

            <div className={`p-4 rounded-lg border ${darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'}`}>
              <h3 className="font-semibold mb-2">🚀 Вариант 2: Groq</h3>
              <ol className="list-decimal list-inside space-y-1 opacity-90">
                <li>Перейдите на <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">console.groq.com</a></li>
                <li>Зарегистрируйтесь (можно через Google)</li>
                <li>Перейдите в "API Keys" → создайте новый ключ</li>
                <li>Скопируйте ключ</li>
                <li>Бесплатный тариф включает QWEN модели</li>
              </ol>
              <p className="mt-2 text-xs opacity-70">💡 Модели: Qwen3 32B, Qwen 2.5 72B (бесплатно с лимитами)</p>
            </div>

            <div className={`p-4 rounded-lg border ${darkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'}`}>
              <h3 className="font-semibold mb-2">🎁 Вариант 3: DashScope (Alibaba Cloud)</h3>
              <ol className="list-decimal list-inside space-y-1 opacity-90">
                <li>Перейдите на <a href="https://dashscope.console.aliyun.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">dashscope.console.aliyun.com</a></li>
                <li>Зарегистрируйте аккаунт Alibaba Cloud</li>
                <li>Активируйте DashScope (дадут 70 млн токенов бесплатно)</li>
                <li>Создайте API-ключ в разделе "API-KEY"</li>
              </ol>
              <p className="mt-2 text-xs opacity-70">💡 70 млн токенов бесплатно при регистрации (хватит на ~1000-2000 запросов)</p>
            </div>

            <div className={`p-4 rounded-lg border ${darkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}`}>
              <h3 className="font-semibold mb-2">🤗 Вариант 4: HuggingFace</h3>
              <ol className="list-decimal list-inside space-y-1 opacity-90">
                <li>Перейдите на <a href="https://huggingface.co" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">huggingface.co</a></li>
                <li>Зарегистрируйтесь</li>
                <li>Перейдите в Settings → Access Tokens → создайте токен</li>
                <li>Используйте модель Qwen/Qwen2.5-72B-Instruct</li>
              </ol>
              <p className="mt-2 text-xs opacity-70">💡 Бесплатный тариф есть, но медленнее и с ограничениями</p>
            </div>
          </div>
        )}
      </div>

      {/* API Configuration */}
      <div className={`border rounded-lg p-5 ${cardClass}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            ⚙️ API-ключ для песочницы
          </h2>
          <button
            onClick={() => setShowApiForm(!showApiForm)}
            className="text-sm px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {showApiForm ? 'Скрыть' : 'Настроить'}
          </button>
        </div>

        {apiConfig.apiKey && !showApiForm && (
          <div className={`p-3 rounded-lg border ${darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'}`}>
            <p className="text-sm">
              ✓ API-ключ сохранён: <strong>{apiConfig.provider}</strong>
              {apiConfig.remember && <span className="ml-2 text-xs opacity-60">(запомнено)</span>}
            </p>
            <button
              onClick={clearApiConfig}
              className="text-xs text-red-600 hover:underline mt-1"
            >
              Очистить сохранённые данные
            </button>
          </div>
        )}

        {showApiForm && (
          <div className="space-y-3">
            <div className={`p-3 rounded-lg text-xs ${darkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
              <strong>⚠️ Важно:</strong> API-ключ сохраняется локально в вашем браузере (localStorage). 
              Он не передаётся на наш сервер. Используйте только на своём устройстве.
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Провайдер:</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as APIConfig['provider'])}
                className={`w-full p-2 border rounded-lg text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              >
                <option value="openrouter">OpenRouter (рекомендуется, есть бесплатные QWEN)</option>
                <option value="groq">Groq (бесплатные QWEN, очень быстрый)</option>
                <option value="dashscope">DashScope (Alibaba Cloud, 70 млн токенов бесплатно)</option>
                <option value="huggingface">HuggingFace (бесплатный тариф)</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">API-ключ:</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Вставьте ваш API-ключ"
                className={`w-full p-2 border rounded-lg text-sm font-mono ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Модель:</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={`w-full p-2 border rounded-lg text-sm font-mono ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              >
                {provider === 'openrouter' && (
                  <>
                    <option value="qwen/qwen3.8-27b:free">🆓 Qwen3.8 27B (бесплатно)</option>
                    <option value="qwen/qwen3.8-flash">💰 Qwen3.8 Flash ($0.15/млн)</option>
                    <option value="qwen/qwen3.8-max-0902">💰 Qwen3.8 Max ($2/млн)</option>
                    <option value="qwen/qwen3.7-plus">💰 Qwen3.7 Plus ($0.32/млн)</option>
                    <option value="qwen/qwen3.6-flash">💰 Qwen3.6 Flash ($0.19/млн)</option>
                    <option value="qwen/qwen3-32b">💰 Qwen3 32B ($0.08/млн)</option>
                    <option value="qwen/qwen3-8b">💰 Qwen3 8B ($0.12/млн)</option>
                  </>
                )}
                {provider === 'groq' && (
                  <>
                    <option value="qwen/qwen3-32b">Qwen3 32B</option>
                    <option value="qwen/qwen-2.5-72b-instruct">Qwen 2.5 72B</option>
                  </>
                )}
                {provider === 'dashscope' && (
                  <>
                    <option value="qwen-turbo">Qwen Turbo (самая дешёвая)</option>
                    <option value="qwen-plus">Qwen Plus (сбалансированная)</option>
                    <option value="qwen-max">Qwen Max (самая мощная)</option>
                  </>
                )}
                {provider === 'huggingface' && (
                  <>
                    <option value="Qwen/Qwen2.5-72B-Instruct">Qwen 2.5 72B Instruct</option>
                    <option value="Qwen/Qwen2.5-32B-Instruct">Qwen 2.5 32B Instruct</option>
                    <option value="Qwen/Qwen2.5-7B-Instruct">Qwen 2.5 7B Instruct</option>
                  </>
                )}
              </select>
              <p className="text-xs opacity-60 mt-1">
                {provider === 'openrouter' && '🆓 = бесплатно. 💰 = платно (цены за 1 млн входных токенов).'}
                {provider === 'groq' && 'Бесплатно, но есть лимиты по запросам в день.'}
                {provider === 'dashscope' && '70 млн токенов бесплатно при регистрации.'}
                {provider === 'huggingface' && 'Бесплатный тариф с ограничениями скорости.'}
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded"
              />
              Запомнить API-ключ для дальнейшей работы
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
              >
                💾 Сохранить
              </button>
              {apiStatus === 'saved' && (
                <span className="text-sm text-green-600 flex items-center">✓ Сохранено!</span>
              )}
            </div>

            {apiConfig.apiKey && (
              <button
                onClick={clearApiConfig}
                className="text-xs text-red-600 hover:underline"
              >
                Удалить сохранённые данные
              </button>
            )}
          </div>
        )}
      </div>

      {/* Open chat.qwen.ai */}
      <div className={`border rounded-lg p-5 ${cardClass}`}>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          🌐 Альтернатива: Открыть chat.qwen.ai напрямую
        </h2>
        <p className="text-sm opacity-80 mb-3">
          Если не хотите настраивать API-ключ, можете использовать официальный веб-чат QWEN (полностью бесплатный, но без возможности встраивания в этот интерфейс).
        </p>
        <a
          href="https://chat.qwen.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-colors inline-flex items-center gap-2"
        >
          🚀 Открыть chat.qwen.ai в новой вкладке ↗
        </a>
      </div>

      {/* Chat Interface */}
      <div className={`border rounded-lg p-5 ${cardClass}`}>
        <h2 className="font-semibold mb-3 flex items-center gap-2">💬 Чат с QWEN через API</h2>
        
        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className={`mb-4 p-3 rounded-lg border max-h-96 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            {chatHistory.map((msg, i) => (
              <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block max-w-full p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : darkMode ? 'bg-gray-600 text-white' : 'bg-white border border-gray-200'
                }`}>
                  <div className="text-xs opacity-70 mb-1">{msg.role === 'user' ? '👤 Вы' : '🤖 QWEN'}</div>
                  <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-left">
                <div className={`inline-block p-3 rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-white border border-gray-200'}`}>
                  <div className="text-sm opacity-60">⏳ QWEN думает...</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prompt Input */}
        <textarea
          value={localPrompt}
          onChange={(e) => setLocalPrompt(e.target.value)}
          placeholder="Напишите промпт для QWEN..."
          className={`w-full h-28 p-3 border rounded-lg text-sm resize-y font-mono leading-relaxed mb-3 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-400'}`}
        />
        
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={sendToAPI}
            disabled={isLoading || !apiConfig.apiKey}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              isLoading || !apiConfig.apiKey
                ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? '⏳ Отправка...' : '🚀 Отправить в QWEN'}
          </button>
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
          >
            {copied ? '✓ Скопировано!' : '📋 Копировать'}
          </button>
          <button
            onClick={() => { setChatHistory([]); setLocalPrompt(''); }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            🗑️ Очистить чат
          </button>
        </div>

        {!apiConfig.apiKey && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${darkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
            ⚠️ Сначала настройте API-ключ в разделе "API-ключ для песочницы" выше.
          </div>
        )}
      </div>

      {/* Quick templates */}
      <div className={`border rounded-lg p-5 ${cardClass}`}>
        <h2 className="font-semibold mb-3">⚡ Быстрые шаблоны промптов</h2>
        <p className="text-xs opacity-60 mb-3">Нажмите на шаблон, чтобы подставить его в поле выше. Замените текст в [скобках] на свой.</p>
        <div className="grid gap-2">
          {[
            { label: '🎓 Объясни простыми словами', template: 'Объясни [ТЕМА] простыми словами, как если бы мне было 12 лет. Приведи 2-3 примера из повседневной жизни.' },
            { label: '📋 Составь пошаговый план', template: 'Составь пошаговый план [ДЕЙСТВИЕ].\nКонтекст: [ОПИСАНИЕ СИТУАЦИИ].\nФормат: пронумерованный список с указанием времени и материалов.' },
            { label: '⚖️ Сравни варианты', template: 'Сравни [ВАРИАНТ 1] и [ВАРИАНТ 2] по критериям: цена, качество, удобство, надёжность.\nОформи в виде таблицы.\nДобавь рекомендацию для [СИТУАЦИЯ].' },
            { label: '✉️ Напиши текст', template: 'Напиши [ТИП ТЕКСТА: письмо/статью/инструкцию] для [АУДИТОРИЯ].\nТема: [ТЕМА].\nТон: [ДЕЛОВОЙ/ДРУЖЕЛЮБНЫЙ/ОФИЦИАЛЬНЫЙ].\nОбъём: [КОЛИЧЕСТВО СЛОВ].' },
            { label: '🔧 Реши проблему', template: 'У меня проблема: [ОПИСАНИЕ].\nЧто уже пробовал: [ДЕЙСТВИЯ].\nМой уровень: [НОВИЧОК/СРЕДНИЙ/ОПЫТНЫЙ].\nПредложи решения от простого к сложному.' },
            { label: '🍳 Подскажи рецепт', template: 'Что можно приготовить из: [СПИСОК ПРОДУКТОВ]?\nДля скольких человек: [ЧИСЛО].\nВремя готовки: до [N] минут.\nДай пошаговый рецепт.' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => setLocalPrompt(item.template)}
              className={`text-left p-3 border rounded-lg text-sm transition-colors ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <span className="font-medium">{item.label}</span>
              <p className="text-xs opacity-50 mt-1 font-mono truncate">{item.template}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Comparison exercise */}
      <div className={`border rounded-lg p-5 ${cardClass}`}>
        <h2 className="font-semibold mb-3">🔄 Упражнение «Сравни промпты»</h2>
        <p className="text-sm mb-4">Попробуйте отправить в QWEN сначала слабый, потом сильный промпт. Сравните ответы.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg border ${darkMode ? 'border-red-800 bg-red-900/10' : 'border-red-200 bg-red-50'}`}>
            <p className="text-xs font-medium text-red-600 mb-1">Слабый:</p>
            <p className="text-sm font-mono">«Как выбрать ноутбук?»</p>
          </div>
          <div className={`p-3 rounded-lg border ${darkMode ? 'border-green-800 bg-green-900/10' : 'border-green-200 bg-green-50'}`}>
            <p className="text-xs font-medium text-green-600 mb-1">Сильный:</p>
            <p className="text-sm font-mono">«Помоги выбрать ноутбук для работы с документами и видеозвонков. Бюджет 50-70 тыс. руб. Важны: лёгкость, батарея от 8 часов, хорошая веб-камера. Предложи 3 модели.»</p>
          </div>
        </div>
      </div>
    </div>
  );
}
