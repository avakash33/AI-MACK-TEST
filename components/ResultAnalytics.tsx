
import React, { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { TestResult, Question } from '../types';

interface ResultAnalyticsProps {
  result: TestResult;
  questions: Question[];
  onHome: () => void;
  onRetake: () => void;
}

export const ResultAnalytics: React.FC<ResultAnalyticsProps> = ({ result, questions, onHome, onRetake }) => {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const isBilingual = questions.some(q => q.hindiQuestion);
  
  const percentage = Math.round((result.score / result.totalQuestions) * 100);
  const incorrectCount = result.totalQuestions - result.score;
  
  if (questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">No results to display</h2>
        <button onClick={onHome} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">
          Back to Home
        </button>
      </div>
    );
  }

  const radarData = (Object.entries(result.categoryBreakdown) as [string, { correct: number; total: number }][]).map(([subject, data]) => ({
    subject,
    score: Math.round((data.correct / data.total) * 100),
    fullMark: 100
  }));

  const difficultyBreakdown = questions.reduce((acc, q) => {
    const isCorrect = result.answers[q.id] === q.correctAnswer;
    if (!acc[q.difficulty]) {
      acc[q.difficulty] = { correct: 0, total: 0 };
    }
    acc[q.difficulty].total++;
    if (isCorrect) acc[q.difficulty].correct++;
    return acc;
  }, {} as Record<string, { correct: number; total: number }>);

  const getAccuracyColor = (pct: number) => {
    if (pct >= 80) return 'text-green-500';
    if (pct >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Summary Banner */}
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <div className="flex-1 bg-white p-5 rounded-[1.5rem] shadow-lg border border-slate-100 flex items-center justify-between overflow-hidden relative">
          <div className="z-10">
            <h4 className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-0.5">Performance</h4>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-black ${getAccuracyColor(percentage)}`}>{percentage}%</span>
              <span className="text-slate-400 font-bold text-xs">Accuracy</span>
            </div>
          </div>
          <div className="flex gap-3 z-10">
            <div className="text-center bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
               <span className="block text-green-600 font-black text-xl">{result.score}</span>
               <span className="text-green-600/70 text-[9px] font-bold uppercase">Correct</span>
            </div>
            <div className="text-center bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
               <span className="block text-red-600 font-black text-xl">{incorrectCount}</span>
               <span className="text-red-600/70 text-[9px] font-bold uppercase">Incorrect</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-8 -mt-8 blur-2xl" />
        </div>
        
        <div className="bg-indigo-600 p-5 rounded-[1.5rem] shadow-lg text-white flex items-center gap-4 sm:w-48">
           <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🏆</div>
           <div>
              <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-wider">Status</p>
              <h3 className="text-base font-bold leading-tight">Done!</h3>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Detailed Chart Card */}
        <div className="md:col-span-8 bg-white rounded-[1.5rem] p-6 shadow-lg border border-slate-100 relative overflow-hidden">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-indigo-600 rounded-full" /> Topical Proficiency
          </h2>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="#4f46e5"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Column */}
        <div className="md:col-span-4 space-y-4">
          <div className="bg-white rounded-[1.5rem] p-6 shadow-lg border border-slate-100">
             <h3 className="text-base font-bold text-slate-800 mb-4">Stats</h3>
             <div className="space-y-3">
               <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 text-xs font-medium">Time</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {Math.floor(result.timeSpent / 60)}m {result.timeSpent % 60}s
                  </span>
               </div>
               <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 text-xs font-medium">Anomalies</span>
                  <span className={`font-bold text-xs ${result.anomalies > 5 ? 'text-red-500' : 'text-green-500'}`}>
                    {result.anomalies}
                  </span>
               </div>
               <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 text-xs font-medium">Pace</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {Math.round(result.timeSpent / result.totalQuestions)}s/q
                  </span>
               </div>
             </div>
          </div>

          <div className="bg-white rounded-[1.5rem] p-6 shadow-lg border border-slate-100">
             <h3 className="text-base font-bold text-slate-800 mb-4">Difficulty</h3>
             <div className="space-y-3">
               {['Easy', 'Medium', 'Hard'].map(level => {
                 const data = difficultyBreakdown[level] || { correct: 0, total: 0 };
                 if (data.total === 0) return null;
                 const pct = Math.round((data.correct / data.total) * 100);
                 return (
                   <div key={level} className="space-y-1.5">
                     <div className="flex justify-between text-[10px] font-bold">
                       <span className={
                         level === 'Easy' ? 'text-green-600' :
                         level === 'Medium' ? 'text-amber-600' :
                         'text-red-600'
                       }>{level}</span>
                       <span className="text-slate-400">{data.correct}/{data.total}</span>
                     </div>
                     <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className={`h-full transition-all duration-500 ${
                           level === 'Easy' ? 'bg-green-500' :
                           level === 'Medium' ? 'bg-amber-500' :
                           'bg-red-500'
                         }`}
                         style={{ width: `${pct}%` }}
                       />
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={onRetake}
              className="w-full bg-indigo-600 text-white py-4 rounded-[1.5rem] font-bold text-base hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.98]"
            >
              Retake Exam
            </button>
            <button 
              onClick={onHome}
              className="w-full bg-slate-100 text-slate-700 py-4 rounded-[1.5rem] font-bold text-base hover:bg-slate-200 transition-all active:scale-[0.98]"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div className="bg-white rounded-[1.5rem] p-6 shadow-lg border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="text-xl font-bold text-slate-800">Review</h3>
          
          {isBilingual && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setLanguage('en')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                ENGLISH
              </button>
              <button 
                onClick={() => setLanguage('hi')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'hi' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                हिन्दी
              </button>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {questions.map((q, idx) => {
            const userAnswerIdx = result.answers[q.id];
            const isCorrect = userAnswerIdx === q.correctAnswer;

            return (
              <div key={q.id} className={`p-4 md:p-6 rounded-[1.5rem] border-2 transition-all ${isCorrect ? 'border-green-100 bg-green-50/20' : 'border-red-100 bg-red-50/20'}`}>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                       <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded border border-slate-200">{q.category}</span>
                       {!isCorrect && <span className="text-red-500 text-[10px] font-bold italic">{language === 'hi' ? 'इसे फिर से जांचें' : 'Check this one again'}</span>}
                    </div>
                    
                    <div className="text-sm md:text-base font-bold text-slate-800 mb-4 leading-snug flex flex-wrap gap-x-2 items-baseline">
                      <span>{q.question}</span>
                      {q.hindiQuestion && (
                        <span className="text-indigo-600 font-medium border-l-2 border-indigo-100 pl-2">{q.hindiQuestion}</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-4">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className={`px-4 py-2 rounded-xl text-xs flex items-center justify-between border ${
                          oIdx === q.correctAnswer ? 'bg-green-100 border-green-300 text-green-900 font-bold' :
                          oIdx === userAnswerIdx ? 'bg-red-100 border-red-300 text-red-900 font-bold' :
                          'bg-white border-slate-100 text-slate-500'
                        }`}>
                          <div className="flex flex-wrap gap-x-2 items-baseline">
                            <span>{opt}</span>
                            {q.hindiOptions && q.hindiOptions[oIdx] && (
                              <span className="text-indigo-500 font-normal border-l border-indigo-100 pl-2">{q.hindiOptions[oIdx]}</span>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0 ml-2">
                            {oIdx === q.correctAnswer && <span className="text-green-600 font-bold text-[10px]">{language === 'hi' ? 'सही' : 'CORRECT'}</span>}
                            {oIdx === userAnswerIdx && !isCorrect && <span className="text-red-600 font-bold text-[10px]">{language === 'hi' ? 'आपकी पसंद' : 'YOUR CHOICE'}</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black text-indigo-600 uppercase mb-1 flex items-center gap-2">
                        <span className="w-1 h-2.5 bg-indigo-600 rounded-full" /> {language === 'hi' ? 'समाधान और स्पष्टीकरण' : 'Solution & Explanation'}
                      </p>
                      <div className="text-xs text-slate-600 leading-relaxed font-medium space-y-1">
                        <p>{q.explanation}</p>
                        {q.hindiExplanation && (
                          <p className="text-indigo-500 border-t border-indigo-50 pt-1">{q.hindiExplanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
