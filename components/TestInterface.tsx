
import React, { useState, useEffect } from 'react';
import { Question } from '../types';

interface TestInterfaceProps {
  questions: Question[];
  durationMinutes: number;
  onComplete: (answers: Record<string, number>, timeSpent: number, anomalies: number) => void;
  language?: 'en' | 'hi';
}

export const TestInterface: React.FC<TestInterfaceProps> = ({ 
  questions, 
  durationMinutes, 
  onComplete,
  language: globalLanguage = 'en'
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [anomalies, setAnomalies] = useState(0);
  const [isFocusLost, setIsFocusLost] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [localLanguage, setLocalLanguage] = useState<'en' | 'hi'>(globalLanguage);

  const isBilingual = questions.some(q => q.hindiQuestion);

  // Auto-detection: Focus monitoring
  useEffect(() => {
    const handleBlur = () => {
      setIsFocusLost(true);
      setAnomalies(prev => prev + 1);
    };
    const handleFocus = () => {
      setIsFocusLost(false);
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete(answers, durationMinutes * 60, anomalies);
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, answers, onComplete, durationMinutes, anomalies]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelect = (optionIdx: number) => {
    setAnswers({ ...answers, [questions[currentIdx].id]: optionIdx });
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setShowHint(false);
    }
  };

  const prevQuestion = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
      setShowHint(false);
    }
  };

  const currentQuestion = questions[currentIdx];
  const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0;

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">No questions available</h2>
        <button 
          onClick={() => onComplete({}, 0, 0)}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Test Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 sticky top-20 z-40 bg-[#f8fafc]/80 backdrop-blur-md py-2">
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full font-mono text-lg font-bold ${
            timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700 shadow-inner'
          }`}>
            ⏱️ {formatTime(timeLeft)}
          </div>
          <div className="text-slate-500 font-medium text-sm">
            {localLanguage === 'hi' ? 'प्रश्न' : 'Question'} <span className="text-indigo-600 font-bold">{currentIdx + 1}</span> {localLanguage === 'hi' ? 'कुल' : 'of'} {questions.length}
          </div>
        </div>
        
        {isFocusLost && (
          <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 border border-amber-200 animate-bounce">
            ⚠️ {localLanguage === 'hi' ? 'चेतावनी: ध्यान भटक गया!' : 'Warning: Focus lost!'}
          </div>
        )}

        <button 
          onClick={() => onComplete(answers, (durationMinutes * 60) - timeLeft, anomalies)}
          className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95 text-sm"
        >
          {localLanguage === 'hi' ? 'परीक्षा जमा करें' : 'Submit Exam'}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 rounded-full mb-6 overflow-hidden shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-[1.5rem] p-4 md:p-6 shadow-xl border border-slate-100 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 p-2 opacity-5 select-none text-6xl font-black text-indigo-600">
          {currentIdx + 1}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full uppercase tracking-wider border border-indigo-100">
                {currentQuestion.category}
              </span>
              <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border flex items-center gap-1.5 ${
                currentQuestion.difficulty === 'Easy' ? 'bg-green-50 text-green-600 border-green-200' :
                currentQuestion.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                'bg-red-50 text-red-600 border-red-200'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {currentQuestion.difficulty}
              </span>
            </div>
            
            <button 
              onClick={() => setShowHint(!showHint)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                showHint ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100'
              }`}
            >
              <span>💡</span> {showHint ? (localLanguage === 'hi' ? 'संकेत छिपाएं' : 'Hide Hint') : (localLanguage === 'hi' ? 'संकेत' : 'Hint')}
            </button>
          </div>

          {showHint && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl animate-in slide-in-from-top-2 duration-300">
              <p className="text-xs text-amber-800 font-medium">
                <span className="font-bold">{localLanguage === 'hi' ? 'संकेत:' : 'Hint:'}</span> {
                  localLanguage === 'hi' && currentQuestion.hindiHint 
                    ? currentQuestion.hindiHint 
                    : (currentQuestion.hint || "Think about the core concepts mentioned in the text.")
                }
              </p>
            </div>
          )}
          
          <h2 className="text-sm md:text-base font-bold text-slate-800 leading-snug mb-6 flex flex-wrap gap-x-2 items-baseline">
            <span>{currentQuestion.question}</span>
            {currentQuestion.hindiQuestion && (
              <span className="text-indigo-600 font-medium border-l-2 border-indigo-100 pl-2">{currentQuestion.hindiQuestion}</span>
            )}
          </h2>

          <div className="grid grid-cols-1 gap-2">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className={`w-full p-2.5 text-left rounded-xl border transition-all flex items-center gap-3 group relative ${
                  answers[currentQuestion.id] === idx 
                    ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                    : 'border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-white'
                }`}
              >
                <div className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                  answers[currentQuestion.id] === idx 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white border border-slate-200 text-slate-400 group-hover:border-indigo-400 group-hover:text-indigo-600'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <div className="flex flex-wrap gap-x-2 items-baseline text-xs md:text-sm font-medium">
                  <span className={answers[currentQuestion.id] === idx ? 'text-indigo-900' : 'text-slate-700'}>
                    {option}
                  </span>
                  {currentQuestion.hindiOptions && currentQuestion.hindiOptions[idx] && (
                    <span className="text-indigo-500 font-normal border-l border-indigo-100 pl-2">
                      {currentQuestion.hindiOptions[idx]}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
          <button
            disabled={currentIdx === 0}
            onClick={prevQuestion}
            className="px-4 py-2 font-bold text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none transition-colors rounded-lg hover:bg-slate-50 text-xs"
          >
            {localLanguage === 'hi' ? '← पिछला' : '← Previous'}
          </button>
          <button
            onClick={nextQuestion}
            disabled={currentIdx === questions.length - 1}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none text-xs"
          >
            {currentIdx === questions.length - 1 ? (localLanguage === 'hi' ? 'समाप्त' : 'End') : (localLanguage === 'hi' ? 'अगला →' : 'Next →')}
          </button>
        </div>
      </div>
      
      {/* Quick Access Grid for large question sets */}
      <div className="mt-8 p-6 bg-white rounded-3xl border border-slate-100 shadow-xl">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{localLanguage === 'hi' ? 'प्रश्न नेविगेटर' : 'Question Navigator'}</h4>
        <div className={`grid grid-cols-5 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-20 gap-2 ${questions.length > 100 ? 'max-h-48 overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
          {questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center ${
                currentIdx === idx ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 scale-110 z-10' :
                answers[questions[idx].id] !== undefined ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
