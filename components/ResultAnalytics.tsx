
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { TestResult, Question } from '../types';

interface ResultAnalyticsProps {
  result: TestResult;
  questions: Question[];
  onRestart: () => void;
}

export const ResultAnalytics: React.FC<ResultAnalyticsProps> = ({ result, questions, onRestart }) => {
  const percentage = Math.round((result.score / result.totalQuestions) * 100);
  const incorrectCount = result.totalQuestions - result.score;
  
  const radarData = (Object.entries(result.categoryBreakdown) as [string, { correct: number; total: number }][]).map(([subject, data]) => ({
    subject,
    score: Math.round((data.correct / data.total) * 100),
    fullMark: 100
  }));

  const getAccuracyColor = (pct: number) => {
    if (pct >= 80) return 'text-green-500';
    if (pct >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Summary Banner */}
      <div className="flex flex-col md:flex-row gap-4 w-full">
        <div className="flex-1 bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center justify-between overflow-hidden relative">
          <div className="z-10">
            <h4 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Performance</h4>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-black ${getAccuracyColor(percentage)}`}>{percentage}%</span>
              <span className="text-slate-400 font-bold">Accuracy</span>
            </div>
          </div>
          <div className="flex gap-4 z-10">
            <div className="text-center bg-green-50 px-4 py-2 rounded-2xl border border-green-100">
               <span className="block text-green-600 font-black text-2xl">{result.score}</span>
               <span className="text-green-600/70 text-[10px] font-bold uppercase">Correct</span>
            </div>
            <div className="text-center bg-red-50 px-4 py-2 rounded-2xl border border-red-100">
               <span className="block text-red-600 font-black text-2xl">{incorrectCount}</span>
               <span className="text-red-600/70 text-[10px] font-bold uppercase">Incorrect</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-10 -mt-10 blur-2xl" />
        </div>
        
        <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-xl text-white flex items-center gap-6">
           <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">🏆</div>
           <div>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Test Completed</p>
              <h3 className="text-xl font-bold">Great Effort!</h3>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Detailed Chart Card */}
        <div className="md:col-span-2 bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 relative overflow-hidden">
          <h2 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
            <span className="w-2 h-8 bg-indigo-600 rounded-full" /> Topical Proficiency
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fill="#4f46e5"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100">
             <h3 className="text-lg font-bold text-slate-800 mb-6">Execution Stats</h3>
             <div className="space-y-4">
               <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 font-medium">Time Taken</span>
                  <span className="font-bold text-slate-800">
                    {Math.floor(result.timeSpent / 60)}m {result.timeSpent % 60}s
                  </span>
               </div>
               <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 font-medium">Anomalies</span>
                  <span className={`font-bold ${result.anomalies > 5 ? 'text-red-500' : 'text-green-500'}`}>
                    {result.anomalies} detected
                  </span>
               </div>
               <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 font-medium">Pace</span>
                  <span className="font-bold text-slate-800">
                    {Math.round(result.timeSpent / result.totalQuestions)}s / question
                  </span>
               </div>
             </div>
          </div>
          
          <button 
            onClick={onRestart}
            className="w-full bg-slate-800 text-white py-6 rounded-[2rem] font-bold text-xl hover:bg-slate-900 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0"
          >
            Retake Exam
          </button>
        </div>
      </div>

      {/* Review Section */}
      <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100">
        <h3 className="text-2xl font-bold text-slate-800 mb-8">Detailed Review</h3>
        <div className="space-y-8">
          {questions.map((q, idx) => {
            const userAnswerIdx = result.answers[q.id];
            const isCorrect = userAnswerIdx === q.correctAnswer;
            return (
              <div key={q.id} className={`p-8 rounded-[2rem] border-2 transition-all ${isCorrect ? 'border-green-100 bg-green-50/20' : 'border-red-100 bg-red-50/20'}`}>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                       <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded border border-slate-200">{q.category}</span>
                       {!isCorrect && <span className="text-red-500 text-xs font-bold italic">Check this one again</span>}
                    </div>
                    <p className="text-xl font-bold text-slate-800 mb-6 leading-tight">{q.question}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className={`px-5 py-3 rounded-xl text-sm flex items-center justify-between border-2 ${
                          oIdx === q.correctAnswer ? 'bg-green-100 border-green-300 text-green-900 font-bold' :
                          oIdx === userAnswerIdx ? 'bg-red-100 border-red-300 text-red-900 font-bold' :
                          'bg-white border-slate-100 text-slate-500'
                        }`}>
                          <span>{opt}</span>
                          {oIdx === q.correctAnswer && <span className="text-green-600 font-bold">CORRECT</span>}
                          {oIdx === userAnswerIdx && !isCorrect && <span className="text-red-600 font-bold">YOUR CHOICE</span>}
                        </div>
                      ))}
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-black text-indigo-600 uppercase mb-2 flex items-center gap-2">
                        <span className="w-1 h-3 bg-indigo-600 rounded-full" /> Solution & Explanation
                      </p>
                      <p className="text-slate-600 leading-relaxed font-medium">"{q.explanation}"</p>
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
