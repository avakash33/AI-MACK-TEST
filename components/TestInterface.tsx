
import React, { useState, useEffect } from 'react';
import { Question } from '../types';

interface TestInterfaceProps {
  questions: Question[];
  durationMinutes: number;
  onComplete: (answers: Record<string, number>, timeSpent: number, anomalies: number) => void;
}

export const TestInterface: React.FC<TestInterfaceProps> = ({ 
  questions, 
  durationMinutes, 
  onComplete 
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [anomalies, setAnomalies] = useState(0);
  const [isFocusLost, setIsFocusLost] = useState(false);
  const [showHint, setShowHint] = useState(false);

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
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Test Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 sticky top-20 z-40 bg-[#f8fafc]/80 backdrop-blur-md py-4">
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-full font-mono text-xl font-bold ${
            timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700 shadow-inner'
          }`}>
            ⏱️ {formatTime(timeLeft)}
          </div>
          <div className="text-slate-500 font-medium">
            Question <span className="text-indigo-600 font-bold">{currentIdx + 1}</span> of {questions.length}
          </div>
        </div>
        
        {isFocusLost && (
          <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-amber-200 animate-bounce">
            ⚠️ Warning: Focus lost!
          </div>
        )}

        <button 
          onClick={() => onComplete(answers, (durationMinutes * 60) - timeLeft, anomalies)}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
        >
          Submit Final Exam
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-200 rounded-full mb-12 overflow-hidden shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-2xl border border-slate-100 min-h-[500px] flex flex-col justify-between relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 p-4 opacity-5 select-none text-8xl font-black text-indigo-600">
          {currentIdx + 1}
        </div>

        <div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider border border-indigo-100">
                {currentQuestion.category}
              </span>
              <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider border ${
                currentQuestion.difficulty === 'Easy' ? 'bg-green-50 text-green-600 border-green-100' :
                currentQuestion.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                'bg-red-50 text-red-600 border-red-100'
              }`}>
                {currentQuestion.difficulty}
              </span>
            </div>
            
            <button 
              onClick={() => setShowHint(!showHint)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                showHint ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100'
              }`}
            >
              <span>💡</span> {showHint ? 'Hide Hint' : 'Get a Hint'}
            </button>
          </div>

          {showHint && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl animate-in slide-in-from-top-2 duration-300">
              <p className="text-sm text-amber-800 font-medium">
                <span className="font-bold">Hint:</span> {currentQuestion.hint || "Think about the core concepts mentioned in the text."}
              </p>
            </div>
          )}
          
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight mb-10">
            {currentQuestion.question}
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className={`w-full p-6 text-left rounded-2xl border-2 transition-all flex items-center gap-5 group relative ${
                  answers[currentQuestion.id] === idx 
                    ? 'border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-50' 
                    : 'border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-white'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-all ${
                  answers[currentQuestion.id] === idx 
                    ? 'bg-indigo-600 text-white rotate-6 scale-110' 
                    : 'bg-white border border-slate-200 text-slate-400 group-hover:border-indigo-400 group-hover:text-indigo-600'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className={`text-lg font-medium ${
                  answers[currentQuestion.id] === idx ? 'text-indigo-900' : 'text-slate-700'
                }`}>
                  {option}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between mt-12 pt-8 border-t border-slate-100">
          <button
            disabled={currentIdx === 0}
            onClick={prevQuestion}
            className="px-8 py-3 font-bold text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none transition-colors rounded-xl hover:bg-slate-50"
          >
            ← Previous
          </button>
          <button
            onClick={nextQuestion}
            disabled={currentIdx === questions.length - 1}
            className="bg-slate-100 text-slate-700 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            {currentIdx === questions.length - 1 ? 'End of Test' : 'Next Question →'}
          </button>
        </div>
      </div>
      
      {/* Quick Access Grid for large question sets */}
      <div className="mt-8 grid grid-cols-5 md:grid-cols-10 lg:grid-cols-20 gap-2">
        {questions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIdx(idx)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
              currentIdx === idx ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 scale-110' :
              answers[questions[idx].id] !== undefined ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
};
