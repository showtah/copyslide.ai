
import React from 'react';
import type { SlideData } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface JsonOutputTabProps {
  data: SlideData | null;
  isLoading: boolean;
  currentThought: string | null;
  error?: string | null; // Optional error message
}

export const JsonOutputTab: React.FC<JsonOutputTabProps> = ({ data, isLoading, currentThought, error }) => {
  if (error && !isLoading) { // Prioritize showing error if one exists and not actively loading new data
    return (
      <div className="p-6 text-red-400 text-center">
        <h3 className="text-xl font-semibold text-red-500 mb-3">エラー</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (isLoading && !data && !currentThought) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-slate-400">
        <LoadingSpinner />
        <p className="mt-3">構造化データを生成中...</p>
      </div>
    );
  }

  if (!data && !isLoading && !error) {
    return (
      <div className="p-6 text-slate-500 text-center">
        <p>まだ構造化データがありません。</p>
        <p className="text-sm mt-1">画像をアップロードして「生成開始」をクリックしてください。</p>
      </div>
    );
  }
  
  const displayData = data?.rawText && Object.keys(data).length === 1 ? { rawText: data.rawText } : data;


  return (
    <div className="p-4 md:p-6 h-full">
      <h3 className="text-xl font-semibold text-sky-400 mb-3">抽出された情報</h3>
      {isLoading && currentThought && (
        <p className="text-xs text-slate-400 mt-1 mb-2 italic animate-pulse">
          Geminiの思考: {currentThought.length > 150 ? currentThought.substring(0, 147) + "..." : currentThought}
        </p>
      )}
      {isLoading && data && <p className="text-sm text-sky-400 mb-2 animate-pulse">データをストリーミング中...</p>}
      
      {(data || (isLoading && displayData)) && (
        <pre className="bg-slate-900 p-4 rounded-lg text-sm text-slate-200 overflow-auto custom-scrollbar whitespace-pre-wrap break-all max-h-[calc(100vh-350px)] md:max-h-[calc(100vh-320px)]">
          {JSON.stringify(displayData, null, 2)}
        </pre>
      )}
    </div>
  );
};