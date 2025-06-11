import React from 'react';

interface HtmlPasteStepProps {
  htmlText: string;
  onHtmlTextChange: (newHtml: string) => void;
}

const HtmlPasteStep: React.FC<HtmlPasteStepProps> = ({ htmlText, onHtmlTextChange }) => {
  return (
    <div className="space-y-4">
      <label htmlFor="html-input" className="block text-sm font-medium text-slate-300 mb-1">
        HTMLコードを貼り付け
      </label>
      <textarea
        id="html-input"
        value={htmlText}
        onChange={(e) => onHtmlTextChange(e.target.value)}
        rows={12}
        className="block w-full p-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-transparent custom-scrollbar"
        placeholder="ここに<!DOCTYPE html>から始まるHTMLを貼り付けてください"
      />
      <p className="text-xs text-slate-500">コードを貼り付けると右側にプレビューが表示され、テキスト編集やコンポーネント編集モードを使用できます。</p>
    </div>
  );
};

export default HtmlPasteStep; 