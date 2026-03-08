import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  ArrowRight, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Languages,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { parseSrt, stringifySrt, type SrtEntry } from './utils/srtUtils';
import { translateBatch, type TranslationStyle } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [entries, setEntries] = useState<SrtEntry[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [translatedEntries, setTranslatedEntries] = useState<SrtEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<TranslationStyle>('modern');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setTranslatedEntries([]);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          const parsed = parseSrt(text);
          setEntries(parsed);
        } catch (err) {
          setError("Failed to parse SRT file. Please ensure it's a valid subtitle format.");
        }
      };
      reader.readAsText(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.srt'],
      'application/x-subrip': ['.srt']
    },
    multiple: false
  } as any);

  const handleTranslate = async () => {
    if (entries.length === 0) return;
    
    setIsTranslating(true);
    setError(null);
    setProgress(0);
    
    const batchSize = 30; // Reduced batch size for better completeness
    const concurrencyLimit = 10; // Keep high concurrency for speed
    const results: SrtEntry[] = new Array(entries.length);
    let completedCount = 0;
    
    try {
      const batches = [];
      for (let i = 0; i < entries.length; i += batchSize) {
        batches.push({
          startIndex: i,
          items: entries.slice(i, i + batchSize)
        });
      }

      // Helper function to process a single batch
      const processBatch = async (batch: { startIndex: number, items: SrtEntry[] }) => {
        const textsToTranslate = batch.items.map(e => e.text.replace(/\n/g, ' [BR] '));
        const translatedTexts = await translateBatch(textsToTranslate, style);
        
        batch.items.forEach((entry, index) => {
          const translatedText = (translatedTexts[index] || entry.text).replace(/ \[BR\] /g, '\n');
          results[batch.startIndex + index] = {
            ...entry,
            text: translatedText
          };
        });
        
        completedCount += batch.items.length;
        setProgress(Math.min(100, Math.round((completedCount / entries.length) * 100)));
      };

      // Process batches with concurrency limit
      for (let i = 0; i < batches.length; i += concurrencyLimit) {
        const currentBatchGroup = batches.slice(i, i + concurrencyLimit);
        await Promise.all(currentBatchGroup.map(processBatch));
      }
      
      setTranslatedEntries(results);
    } catch (err) {
      setError("ការបកប្រែមានបញ្ហា។ សូមព្យាយាមម្ដងទៀត។ (Translation failed)");
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDownload = () => {
    if (translatedEntries.length === 0) return;
    
    const srtContent = stringifySrt(translatedEntries);
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_${file?.name || 'subtitles.srt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setEntries([]);
    setTranslatedEntries([]);
    setProgress(0);
    setError(null);
  };

  const handleEntryChange = (index: number, newText: string) => {
    const updated = [...translatedEntries];
    updated[index] = { ...updated[index], text: newText };
    setTranslatedEntries(updated);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-5xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500 rounded-lg text-white">
            <Languages size={24} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            SRT Translator
          </h1>
        </div>
        <p className="text-zinc-500 text-lg">
          បកប្រែអត្ថបទរឿងពីភាសាចិន មកភាសាខ្មែរ ដោយស្វ័យប្រវត្តិ
        </p>
      </header>

      <main className="flex flex-col gap-6">
        {/* Upload Section */}
        {!file ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            {...getRootProps()}
            className={cn(
              "relative group cursor-pointer",
              "border-2 border-dashed rounded-3xl p-12 md:p-20",
              "flex flex-col items-center justify-center gap-4 transition-all duration-300",
              isDragActive 
                ? "border-emerald-500 bg-emerald-50/50" 
                : "border-zinc-200 hover:border-emerald-400 hover:bg-zinc-50"
            )}
          >
            <input {...getInputProps()} />
            <div className={cn(
              "p-4 rounded-full bg-zinc-100 text-zinc-400 transition-colors duration-300",
              "group-hover:bg-emerald-100 group-hover:text-emerald-500"
            )}>
              <Upload size={32} />
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-zinc-700">
                {isDragActive ? "ទម្លាក់ឯកសារនៅទីនេះ" : "ជ្រើសរើសឯកសារ SRT"}
              </p>
              <p className="text-zinc-400 mt-1">
                អូស និងទម្លាក់ ឬចុចដើម្បីជ្រើសរើស (Chinese SRT)
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-6 flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900">{file.name}</h3>
                  <p className="text-sm text-zinc-500">{entries.length} lines detected</p>
                </div>
              </div>
              <button 
                onClick={reset}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove file"
              >
                <Trash2 size={20} />
              </button>
            </div>

            {/* Style Selection */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                រចនាបថនៃការបកប្រែ (Translation Style)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStyle('modern')}
                  disabled={isTranslating}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all font-medium",
                    style === 'modern'
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-200"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    style === 'modern' ? "border-emerald-500" : "border-zinc-300"
                  )}>
                    {style === 'modern' && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
                  </div>
                  សម័យបច្ចុប្បន្ន (Modern)
                </button>
                <button
                  onClick={() => setStyle('ancient')}
                  disabled={isTranslating}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all font-medium",
                    style === 'ancient'
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-200"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    style === 'ancient' ? "border-amber-500" : "border-zinc-300"
                  )}>
                    {style === 'ancient' && <div className="w-2 h-2 bg-amber-500 rounded-full" />}
                  </div>
                  បុរាណចិន (Ancient/Historical)
                </button>
              </div>
            </div>

            {/* Progress / Actions */}
            <div className="flex flex-col gap-4">
              {isTranslating ? (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-zinc-600 flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-emerald-500" />
                      កំពុងបកប្រែ...
                    </span>
                    <span className="text-emerald-600">{progress}%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : translatedEntries.length > 0 ? (
                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-3 text-emerald-700">
                    <CheckCircle2 size={20} />
                    <span className="font-medium">ការបកប្រែបានជោគជ័យ!</span>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <Download size={18} />
                    ទាញយក SRT
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-lg"
                >
                  <Languages size={20} />
                  ចាប់ផ្ដើមបកប្រែ (ចិន → ខ្មែរ)
                </button>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Preview Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">Original (Chinese)</span>
                <div className="h-64 overflow-y-auto p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono leading-relaxed">
                  {entries.slice(0, 50).map((entry, i) => (
                    <div key={i} className="mb-4">
                      <div className="text-zinc-400 text-[10px] mb-1">{entry.startTime}</div>
                      <div className="text-zinc-700">{entry.text}</div>
                    </div>
                  ))}
                  {entries.length > 50 && <div className="text-zinc-400 italic text-center py-2">... and {entries.length - 50} more lines</div>}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">Translated (Khmer) - អាចកែសម្រួលបាន</span>
                <div className="h-64 overflow-y-auto p-4 bg-white border border-zinc-200 rounded-xl text-sm leading-relaxed">
                  {translatedEntries.length > 0 ? (
                    translatedEntries.map((entry, i) => (
                      <div key={i} className="mb-4 group">
                        <div className="text-zinc-400 text-[10px] mb-1 flex justify-between items-center">
                          <span>{entry.startTime}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 font-bold">កែសម្រួលបាន</span>
                        </div>
                        <textarea
                          value={entry.text}
                          onChange={(e) => handleEntryChange(i, e.target.value)}
                          className="w-full bg-emerald-50/30 border border-transparent hover:border-emerald-200 focus:border-emerald-500 focus:bg-white rounded-lg p-2 text-emerald-700 font-medium transition-all resize-none outline-none"
                          rows={entry.text.split('\n').length || 1}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-300 italic">
                      រង់ចាំការបកប្រែ...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-auto pt-12 pb-6 border-t border-zinc-100 text-center">
        <p className="text-sm text-zinc-400">
          ប្រើប្រាស់បច្ចេកវិទ្យា Gemini AI សម្រាប់ការបកប្រែដែលមានគុណភាពខ្ពស់
        </p>
      </footer>
    </div>
  );
}
