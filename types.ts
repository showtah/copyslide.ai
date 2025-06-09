
export const MAX_FILES = 3;

export interface SlideElement {
  type: 'title' | 'text' | 'list_item' | 'image_description';
  content: string;
}

// This interface is a placeholder for the complex JSON structure.
// The actual structure is defined by the Gemini prompt's json_sample.
// For TypeScript type safety with that complex structure,
// you would typically generate types from the JSON schema or define them exhaustively.
// For this application, we'll treat it as a generic object for flexibility.
export interface SlideData {
  [key: string]: any; // Allows for any structure, matching the complex JSON
  // Minimal expected fields for display during streaming or error
  rawText?: string;
  page_title?: string; // from the complex JSON, used as primary title key
  // Fallback fields if parsing the full structure fails during streaming - image_description is more specific
  // main_points might be too broad if not parsed fully.
  image_description?: string; // Can be used as a fallback descriptor if page_title isn't available yet.
}


export enum OutputTabKey {
  StructuredData = "structured-data",
  HtmlSlide = "html-slide",
}

export interface GeminiStreamOutput {
  type: 'thought' | 'answer';
  content: string;
}