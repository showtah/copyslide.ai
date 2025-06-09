
import React from 'react';
import type { SlideData } from '../types';
import { OutputTabKey } from '../types';
import { JsonOutputTab } from './JsonOutputTab';
import HtmlOutputTab from './HtmlOutputTab'; 
import { Tab, Tabs } from './Tabs';

interface OutputArtifactProps {
  activeSlideIndex: number;
  structuredData: SlideData | null;
  htmlOutput: string;
  isLoadingJson: boolean;
  isLoadingHtml: boolean;
  imagePreviewUrl: string | null;
  activeTab: OutputTabKey;
  onTabChange: (tabKey: OutputTabKey) => void;
  currentThoughtStructure: string | null;
  currentThoughtHtml: string | null;
  error: string | null;
  isTextEditModeActive: boolean; // Renamed from isEditModeActive
  onToggleTextEditMode: (slideIndex: number) => void; // Renamed from onToggleEditMode
  isComponentEditModeActive: boolean;
  onToggleComponentEditMode: (slideIndex: number) => void;
  // Feedback related props
  htmlFeedback: string;
  isFeedbackModalOpen: boolean;
  onOpenFeedbackModal: (slideIndex: number) => void;
  onCloseFeedbackModal: (slideIndex: number) => void;
  onSubmitFeedback: (slideIndex: number, feedbackText: string) => void;
}

export const OutputArtifact: React.FC<OutputArtifactProps> = ({
  activeSlideIndex,
  structuredData,
  htmlOutput,
  isLoadingJson,
  isLoadingHtml,
  imagePreviewUrl,
  activeTab,
  onTabChange,
  currentThoughtStructure,
  currentThoughtHtml,
  error,
  isTextEditModeActive,
  onToggleTextEditMode,
  isComponentEditModeActive,
  onToggleComponentEditMode,
  htmlFeedback,
  isFeedbackModalOpen,
  onOpenFeedbackModal,
  onCloseFeedbackModal,
  onSubmitFeedback,
}) => {

  return (
    <div className="h-full flex flex-col flex-grow">
      <Tabs>
        <Tab
          label="構造化データ"
          isActive={activeTab === OutputTabKey.StructuredData}
          onClick={() => onTabChange(OutputTabKey.StructuredData)}
          isLoading={isLoadingJson}
        />
        <Tab
          label="スライドコード/プレビュー"
          isActive={activeTab === OutputTabKey.HtmlSlide}
          onClick={() => onTabChange(OutputTabKey.HtmlSlide)}
          isLoading={isLoadingHtml}
        />
      </Tabs>
      <div className="flex-grow bg-slate-850 p-1 rounded-b-lg overflow-auto custom-scrollbar mt-[-1px]">
        {activeTab === OutputTabKey.StructuredData && (
          <JsonOutputTab 
            data={structuredData} 
            isLoading={isLoadingJson} 
            currentThought={currentThoughtStructure}
            error={error && activeTab === OutputTabKey.StructuredData ? error : null}
          />
        )}
        {activeTab === OutputTabKey.HtmlSlide && (
          <HtmlOutputTab 
            htmlContent={htmlOutput} 
            isLoading={isLoadingHtml} 
            imageForSlide={imagePreviewUrl}
            currentThought={currentThoughtHtml}
            error={error && activeTab === OutputTabKey.HtmlSlide ? error : null}
            isTextEditModeActive={isTextEditModeActive} // Renamed
            onToggleTextEditMode={onToggleTextEditMode} // Renamed
            isComponentEditModeActive={isComponentEditModeActive}
            onToggleComponentEditMode={onToggleComponentEditMode}
            activeSlideIndex={activeSlideIndex}
            // Feedback related props
            htmlFeedback={htmlFeedback}
            isFeedbackModalOpen={isFeedbackModalOpen}
            onOpenFeedbackModal={onOpenFeedbackModal}
            onCloseFeedbackModal={onCloseFeedbackModal}
            onSubmitFeedback={onSubmitFeedback}
          />
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #334155; /* slate-700 */
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #64748b; /* slate-500 */
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; /* slate-400 */
        }
        .bg-slate-850 { background-color: #1e293b; } 
      `}</style>
    </div>
  );
};
