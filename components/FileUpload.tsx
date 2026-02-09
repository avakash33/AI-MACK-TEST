
import React, { useState } from 'react';

interface FileUploadProps {
  onFileSelect: (base64: string, fileName: string) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      processFile(file);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      onFileSelect(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div 
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
          isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white'
        } ${isLoading ? 'opacity-50 pointer-events-none' : 'hover:border-indigo-400'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file?.type === 'application/pdf') processFile(file);
        }}
      >
        <div className="mb-6">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Upload Syllabus or Study Material</h3>
          <p className="text-slate-500 mb-8">PDF files supported. AI will generate questions automatically.</p>
        </div>

        <label className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold cursor-pointer hover:bg-indigo-700 transition-all shadow-lg inline-block">
          Select PDF File
          <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
        </label>
        
        <p className="mt-4 text-xs text-slate-400">Maximum file size: 10MB</p>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Smart Generation", desc: "Advanced AI extracts key concepts accurately." },
          { title: "Timed Practice", desc: "Real exam simulation with configurable timers." },
          { title: "Deep Analysis", desc: "Identify weak areas with topical performance data." }
        ].map((feat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h4 className="font-bold text-slate-800 mb-2">{feat.title}</h4>
            <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
