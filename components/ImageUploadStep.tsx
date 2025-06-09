
import React, { useCallback, ChangeEvent } from 'react';
import { MAX_FILES } from '../types';

interface ImageUploadStepProps {
  onFilesChange: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  currentFiles: File[];
  currentImagePreviews: string[];
}

const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);


export const ImageUploadStep: React.FC<ImageUploadStepProps> = ({ onFilesChange, onRemoveFile, currentFiles, currentImagePreviews }) => {
  const [error, setError] = React.useState<string | null>(null);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selectedFileList = event.target.files;
    if (selectedFileList) {
      const newFilesArray = Array.from(selectedFileList);
      const totalFiles = newFilesArray.length;

      if (totalFiles > MAX_FILES) {
        setError(`最大${MAX_FILES}つのファイルまで選択できます。`);
        onFilesChange(newFilesArray.slice(0, MAX_FILES)); // Keep only allowed number of files
        return;
      }
      
      const validFiles = newFilesArray.filter(file => {
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
          setError(`ファイル「${file.name}」は対応していない形式です。(JPEG, PNG, WEBP, GIF のみ)`);
          return false;
        }
        return true;
      });

      if (validFiles.length !== newFilesArray.length && validFiles.length === 0 && newFilesArray.length > 0) {
        // All files were invalid
        setError("選択されたファイルはすべて無効な形式です。");
        onFilesChange([]);
      } else if (validFiles.length < newFilesArray.length) {
         setError(`一部のファイルは対応していない形式のため除外されました。`);
         onFilesChange(validFiles);
      }
      else {
        setError(null);
        onFilesChange(validFiles);
      }
    }
     // Reset the input field value so that selecting the same file again triggers onChange
    if (event.target) {
        event.target.value = '';
    }
  }, [onFilesChange]);

  return (
    <div className="space-y-4">
      <label htmlFor="image-upload" className="block text-sm font-medium text-slate-300 mb-1">
        スライド画像を選択 (最大{MAX_FILES}枚)
      </label>
      <input
        id="image-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFileChange}
        className="block w-full text-sm text-slate-400
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-lg file:border-0
                   file:text-sm file:font-semibold
                   file:bg-sky-700 file:text-sky-100
                   hover:file:bg-sky-600 cursor-pointer"
        aria-describedby="file-error-message"
      />
      {error && <p id="file-error-message" className="text-sm text-red-400">{error}</p>}
      
      {currentFiles.length === 0 && (
         <div className="mt-4 border border-dashed border-slate-700 rounded-lg p-6 text-center">
            <p className="text-sm text-slate-500">ここに画像プレビューが表示されます。</p>
         </div>
       )}

      {currentFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-400">選択された画像 ({currentFiles.length}/{MAX_FILES}):</p>
          {currentImagePreviews.map((previewSrc, index) => (
            <div key={currentFiles[index]?.name + '-' + index} className="relative border border-slate-700 rounded-lg p-2 bg-slate-850">
              <img 
                src={previewSrc} 
                alt={`プレビュー ${index + 1}: ${currentFiles[index]?.name || '不明なファイル'}`} 
                className="max-w-full h-24 object-contain rounded-md mx-auto" 
              />
              <p className="text-xs text-slate-500 mt-1 truncate text-center" title={currentFiles[index]?.name}>
                {currentFiles[index]?.name || '不明なファイル'}
              </p>
              <button
                onClick={() => onRemoveFile(index)}
                className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded-full p-0.5 z-10"
                aria-label={`画像を削除 ${currentFiles[index]?.name || `画像 ${index+1}` }`}
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};