
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ImageUploadStep } from './components/ImageUploadStep';
import { OutputArtifact } from './components/OutputArtifact';
import { extractStructureWithGemini, generateHtmlWithGemini } from './services/geminiService';
import type { SlideData, GeminiStreamOutput } from './types';
import { OutputTabKey, MAX_FILES } from './types';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ChevronLeftIcon, ChevronRightIcon, DocumentIcon } from './components/icons';

const App: React.FC = () => {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadedImagePreviews, setUploadedImagePreviews] = useState<string[]>([]);
  
  const [structuredDataArray, setStructuredDataArray] = useState<Array<SlideData | null>>([]);
  const [htmlOutputArray, setHtmlOutputArray] = useState<string[]>([]);
  
  const [isLoadingStructureArray, setIsLoadingStructureArray] = useState<boolean[]>([]);
  const [isLoadingHtmlArray, setIsLoadingHtmlArray] = useState<boolean[]>([]);
  
  const [errorArray, setErrorArray] = useState<(string | null)[]>([]);
  
  const [currentThoughtStructureArray, setCurrentThoughtStructureArray] = useState<(string | null)[]>([]);
  const [currentThoughtHtmlArray, setCurrentThoughtHtmlArray] = useState<(string | null)[]>([]);

  const [activeOutputTab, setActiveOutputTab] = useState<OutputTabKey>(OutputTabKey.StructuredData);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  
  const [isTextEditModeActiveArray, setIsTextEditModeActiveArray] = useState<boolean[]>([]);
  const [isComponentEditModeActiveArray, setIsComponentEditModeActiveArray] = useState<boolean[]>([]);

  const [htmlFeedbackArray, setHtmlFeedbackArray] = useState<string[]>([]);
  const [isFeedbackModalOpenArray, setIsFeedbackModalOpenArray] = useState<boolean[]>([]);

  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

  const toggleLeftPanel = () => {
    setIsLeftPanelOpen(prev => !prev);
  };

  const initializeOutputArrays = (count: number) => {
    setStructuredDataArray(new Array(count).fill(null));
    setHtmlOutputArray(new Array(count).fill(''));
    setIsLoadingStructureArray(new Array(count).fill(false));
    setIsLoadingHtmlArray(new Array(count).fill(false));
    setErrorArray(new Array(count).fill(null));
    setCurrentThoughtStructureArray(new Array(count).fill(null));
    setCurrentThoughtHtmlArray(new Array(count).fill(null));
    setIsTextEditModeActiveArray(new Array(count).fill(false));
    setIsComponentEditModeActiveArray(new Array(count).fill(false));
    setHtmlFeedbackArray(new Array(count).fill(''));
    setIsFeedbackModalOpenArray(new Array(count).fill(false));
  };

  useEffect(() => {
    if (imageFiles.length === 0) {
      initializeOutputArrays(0);
      setActiveSlideIndex(0);
    } else if (activeSlideIndex >= imageFiles.length) {
      setActiveSlideIndex(Math.max(0, imageFiles.length - 1));
    }
  }, [imageFiles.length]);

  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'editedHtml') {
        const { html, slideIndex: updatedSlideIndex } = event.data;
        if (typeof updatedSlideIndex === 'number' && updatedSlideIndex >= 0 && updatedSlideIndex < htmlOutputArray.length) {
          setHtmlOutputArray(prev => {
            const newArray = [...prev];
            newArray[updatedSlideIndex] = html;
            return newArray;
          });
        }
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [htmlOutputArray.length]);


  const handleFilesSelected = async (newFiles: File[]) => {
    setImageFiles(newFiles);
    initializeOutputArrays(newFiles.length); 
    setActiveOutputTab(OutputTabKey.StructuredData);
    setActiveSlideIndex(0);

    if (newFiles.length > 0) {
      const previews = await Promise.all(newFiles.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }));
      setUploadedImagePreviews(previews);
    } else {
      setUploadedImagePreviews([]);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    const newImageFiles = imageFiles.filter((_, i) => i !== indexToRemove);
    const newImagePreviews = uploadedImagePreviews.filter((_, i) => i !== indexToRemove);
    
    setImageFiles(newImageFiles);
    setUploadedImagePreviews(newImagePreviews);

    setStructuredDataArray(prev => prev.filter((_, i) => i !== indexToRemove));
    setHtmlOutputArray(prev => prev.filter((_, i) => i !== indexToRemove));
    setIsLoadingStructureArray(prev => prev.filter((_, i) => i !== indexToRemove));
    setIsLoadingHtmlArray(prev => prev.filter((_, i) => i !== indexToRemove));
    setErrorArray(prev => prev.filter((_, i) => i !== indexToRemove));
    setCurrentThoughtStructureArray(prev => prev.filter((_, i) => i !== indexToRemove));
    setCurrentThoughtHtmlArray(prev => prev.filter((_, i) => i !== indexToRemove));
    setIsTextEditModeActiveArray(prev => prev.filter((_,i) => i !== indexToRemove));
    setIsComponentEditModeActiveArray(prev => prev.filter((_,i) => i !== indexToRemove));
    setHtmlFeedbackArray(prev => prev.filter((_, i) => i !== indexToRemove));
    setIsFeedbackModalOpenArray(prev => prev.filter((_, i) => i !== indexToRemove));


    if (activeSlideIndex >= newImageFiles.length) {
      setActiveSlideIndex(Math.max(0, newImageFiles.length - 1));
    }
    if (newImageFiles.length === 0) setActiveOutputTab(OutputTabKey.StructuredData); 
  };
  
  const isOverallLoading = imageFiles.some((_, idx) => isLoadingStructureArray[idx] || isLoadingHtmlArray[idx]);

  const userProvidedHtmlGenerationPrompt = `
<role_and_purpose>
    <description>
      あなたは、HTMLスライド生成エキスパートです。ユーザーから提供されるJSON形式の入力データに基づいて、16:9規格の高品質なHTMLベースのプレゼンテーションスライドを生成します。生成されるHTMLは、Tailwind CSS、Font Awesome、Chart.js（必要な場合）を活用し、モダンで視覚的に魅力的なデザインを持つものとします。あなたは、ユーザーの入力JSONで指示される構造、スタイル、コンポーネントを忠実に解釈し、高品質なHTMLスライドを生成する能力を持ちます。
    </description>
  </role_and_purpose>

  <instructions>
    <instruction id="1">
      <content>
        ユーザーから提供される単一のJSON入力オブジェクトに基づいて、単一のHTML文字列を生成します。入力JSONは、スライドの構成要素（全体テーマ、ヘッダー、メインコンテンツ、フッター、カラム、テキスト、チャート、リストなど）を具体的に記述したものです。
      </content>
    </instruction>
    
    <instruction id="2">
      <content>生成するHTMLスライドは以下の要件を満たしてください。</content>
      <requirements>
        <requirement name="aspect_ratio">
          <description>16:9アスペクト比: 固定サイズ (例: \`width: 1280px; min-height: 720px;\`) で実現してください。</description>
        </requirement>
        
        <requirement name="structure">
          <description>入力JSONの指示に基づき、明確なヘッダー、メインコンテンツ、フッターセクションを持つ構造を基本とします。カラムレイアウト（2カラム、3カラム等）も適切に実装してください。</description>
        </requirement>
        
        <requirement name="styling">
          <items>
            <item>Tailwind CSSを全面的に活用し、ユーティリティファーストでスタイリングしてください。入力JSON内の\`classes\`配列やスタイル関連キー（例: \`font_size_key\`, \`color_type\`）を解釈し、適切なTailwindクラスを適用してください。</item>
            <item>入力JSON内の\`theme.colors\`で定義されたブランドカラーやその他の色を基調とし、それから派生する濃淡の色を適切に使用して、統一感のあるデザインを作成してください。確立されたデザイン原則に基づき、視覚的な階層と一貫性を持つ配色を心掛けてください。</item>
            <item>入力JSON内の\`theme.fonts.body\`で指定されたフォントをスライド全体に適用してください。</item>
            <item>必要に応じて、\`&lt;style&gt;\`タグ内に少量のカスタムCSSを記述することも可能です。特に、入力JSON内の\`inline_style\`キーの値や、CSS変数で定義された色を使用するカスタムクラス（例: \`.header-tag\`, \`.organization-box\`）などを記述します。</item>
          </items>
        </requirement>
        
        <requirement name="components">
          <items>
            <item>Font Awesomeを使用して、適切なアイコンを配置してください (入力JSON内の指示や文脈に応じて)。</item>
            <item>チャート（棒グラフ、折れ線グラフ等）が必要な場合は、Chart.jsを使用して描画してください。データや設定は入力JSONから解釈してください。</item>
          </items>
        </requirement>
        
        <requirement name="code_quality">
          <description>整形され、読みやすく、メンテナンスしやすいHTML、CSS、JavaScriptコードを生成してください。コメントも適切に活用してください。</description>
        </requirement>
        
        <requirement name="external_libraries">
          <description>Tailwind CSS, Font Awesome, Chart.js, 指定フォントはCDN経由で読み込んでください。</description>
        </requirement>
      </requirements>
    </instruction>

    <instruction id="2.5" optional="true">
      <title>Feedback on Previous Attempt (If Any)</title>
      <content>
        If user feedback on a previous HTML generation attempt is provided in the section below, please carefully consider it. Try to address the points raised in this new HTML generation. If the feedback is "No specific feedback provided...", you can ignore this section.
      </content>
    </instruction>
    
    <instruction id="3">
      <content>入力JSONの解釈:</content>
      <interpretation_rules>
        <rule>入力JSONは、スライドの構成要素とその内容、スタイル指示を階層的に記述したものです。この指示を忠実にHTML構造にマッピングしてください。</rule>
        <rule>例えば、JSON内に\`header\`オブジェクトがあり、その中に\`title_main\`や\`tags\`といったキーがあれば、それに対応するHTMLとTailwind CSSクラスを生成します。</rule>
        <rule>JSON内に\`charts\`配列があり、各要素がチャートの定義（タイプ、データ、オプションなど）を含んでいれば、Chart.jsでそれを描画します。</rule>
        <rule>\`classes\`キーの値はTailwind CSSクラスの配列として解釈し、対応するHTML要素に適用します。</rule>
        <rule>\`font_size_key\`や\`color_type\`のようなキーは、\`theme\`オブジェクト内の定義を参照して具体的なスタイルに変換します。</rule>
      </interpretation_rules>
    </instruction>
  </instructions>

  <detailed_instructions>
    <html_structure>
      <head_section>
        <item>\`&lt;!DOCTYPE html&gt;\`で開始し、適切な\`lang\`属性を持つ\`&lt;html&gt;\`タグを使用してください（例: \`lang="ja"\`）。</item>
        <item>\`&lt;head&gt;\`セクションには以下を含めてください:
          <subitems>
            <subitem>\`charset\` (UTF-8) と \`viewport\` 設定。</subitem>
            <subitem>\`&lt;title&gt;\`タグ。タイトルは入力JSONの\`page_title\`キーから取得してください。</subitem>
            <subitem>Tailwind CSS CDNリンク。</subitem>
            <subitem>Font Awesome CDNリンク。</subitem>
            <subitem>入力JSONの\`theme.fonts.body\`で指定されたフォントのGoogle Fonts CDNリンク（フォント名から適切なURLを生成してください）。</subitem>
            <subitem>基本的な\`body\`スタイルや、スライドコンテナ用の基本CSS、入力JSONで示唆されるカスタムクラス（例: \`.header-tag\`, \`.organization-box\`など）の定義を\`&lt;style&gt;\`タグ内に記述。CSS変数は入力JSONの\`theme.colors\`に基づいて定義してください。</subitem>
          </subitems>
        </item>
      </head_section>
      
      <body_section>
        <item>スライド全体をラップする\`&lt;div class="slide-container"&gt;\`を作成。このdivに固定サイズ（例: \`width: 1280px; min-height: 720px; margin: 20px auto; background-color: white; box-shadow: ...; position: relative; display: flex; flex-direction: column;\`）のスタイルを適用。</item>
        <item>入力JSONの\`header\`, \`main_content\`, \`footer\`オブジェクトに基づいて、各セクションを\`&lt;div&gt;\`やセマンティックタグで構成。</item>
        <item>メインコンテンツ部分は、\`flex-grow: 1;\` を利用して高さを可変にすることを検討してください。</item>
      </body_section>
    </html_structure>

    <color_scheme_and_fonts>
      <item>入力JSONの\`theme.colors\`オブジェクトで定義された色をCSS変数として\`:root\`に定義します。</item>
      <item>これらのCSS変数やTailwindのカラーユーティリティ（例: \`text-gray-700\`は\`theme.colors.text_gray_700\`の値に対応）を使用して、スライド全体で調和の取れたカラースキームを適用してください。</item>
      <item>入力JSONの\`theme.fonts.body\`で指定されたフォントを\`body\`の\`font-family\`に設定し、見出し等では入力JSONの指示（例: \`font-bold\`クラス）に従ってウェイトを調整してください。</item>
    </color_scheme_and_fonts>

    <tailwind_css_usage>
      <item>レイアウト（Flexbox, Grid）、スペーシング（margin, padding）、タイポグラフィ（font size, weight, color）、ボーダー、シャドウなど、可能な限りTailwindのユーティリティクラスを使用してください。入力JSON内の\`classes\`配列の値をそのままクラス属性に適用します。</item>
      <item>入力JSON内のカラムレイアウト指示（例: \`grid-cols-2\`, \`flex-grow\`）を解釈し、適切に構築してください。</item>
    </tailwind_css_usage>

    <chartjs_implementation>
      <item>入力JSONに\`charts\`配列があり、その要素にチャートの指定がある場合、\`&lt;canvas&gt;\`要素をHTMLに配置してください（\`id\`属性もJSONから取得）。</item>
      <item>\`&lt;script&gt;\`タグ内で、Chart.jsライブラリ(バージョン2.9.4を推奨)を使用してチャートを初期化し、描画するJavaScriptコードを記述してください。</item>
      <item>データ (\`labels\`, \`data\`など)、チャートタイプ (\`type\`)、オプション (\`options\`) は入力JSONのチャートオブジェクト内の対応するキーから設定してください。</item>
      <item>棒グラフの各セグメントの色は、入力JSONの\`segments\`内の\`category_class\`や\`category\`キーに基づいて、\`theme.colors\`で定義された色を適用するようにしてください。</item>
      <item>\`responsive: true\`, \`maintainAspectRatio: false\` を適切に設定してください。</item>
    </chartjs_implementation>

    <icons>
      <item>Font Awesomeのアイコンを使用します。入力JSON内でアイコンの使用が示唆される箇所（例: 特定のコンポーネントタイプやプロパティ）があれば、適切なクラス名（例: \`fas fa-rocket\`）で挿入してください。</item>
    </icons>
  </detailed_instructions>

  <output_format>
    <description>生成物は、完全なHTMLコードの文字列そのものとしてください。JSONオブジェクトでラップしないでください。出力は \`<!DOCTYPE html>\` で始まる純粋なHTML文字列であるべきです。他のテキストや説明、JSONキーは含めないでください。</description>
  </output_format>

  <reasoning_steps>
    <description>モデルがHTMLスライドを生成するために内部的にたどるべき思考プロセスは以下の通りです。</description>
    <step number="1" name="入力JSONの完全理解">...</step>
    <step number="2" name="基本HTML構造のセットアップ">...</step>
    <step number="3" name="スライドコンテナの作成">...</step>
    <step number="4" name="入力JSONに基づくスライド構造の構築">...</step>
    <step number="5" name="コンテンツ要素の配置とスタイリング">...</step>
    <step number="6" name="カラースキームの適用">...</step>
    <step number="7" name="JavaScriptの記述 (特にChart.js)">...</step>
    <step number="8" name="ユーザーフィードバックの考慮 (提供されている場合)">
      <actions>
        <action>もし \`&lt;user_feedback_on_previous_attempt&gt;\` セクションに具体的なフィードバックがあれば、それを注意深く読みます。</action>
        <action>フィードバックで指摘された問題点（例：レイアウト、色、コンテンツの誤りなど）を特定します。</action>
        <action>HTMLの生成プロセスにおいて、これらの指摘事項を修正するように努めます。例えば、特定の要素のスタイルを変更したり、コンポーネントの構造を見直したりします。</action>
      </actions>
    </step>
    <step number="9" name="最終レビューと調整">...</step>
    <step number="10" name="出力">...</step>
  </reasoning_steps>
  
  <user_feedback_on_previous_attempt>
  {{ $user_feedback_for_html }}
  </user_feedback_on_previous_attempt>

  <json_input>
  {{ $json.output }}
  </json_input> 
  `;

  const generateHtmlForSingleSlide = async (slideIndex: number, structuredJson: string, feedback: string | null) => {
    setIsLoadingHtmlArray(prev => { const updated = [...prev]; updated[slideIndex] = true; return updated; });
    setCurrentThoughtHtmlArray(prev => { const updated = [...prev]; updated[slideIndex] = null; return updated; });
    setHtmlOutputArray(prev => { const updated = [...prev]; updated[slideIndex] = ''; return updated; }); 
    setErrorArray(prev => { const updated = [...prev]; updated[slideIndex] = null; return updated; }); 

    console.log(`Generating HTML for slide ${slideIndex + 1} ${feedback ? 'with feedback' : ''}...`);

    const htmlGenerationPromptWithData = userProvidedHtmlGenerationPrompt
        .replace("{{ $json.output }}", structuredJson)
        .replace("{{ $user_feedback_for_html }}", feedback?.trim() || "No specific feedback provided for this regeneration.");

    let accumulatedHtmlResponse = "";
    try {
        for await (const item of generateHtmlWithGemini(htmlGenerationPromptWithData)) {
            if (item.type === 'thought') {
                console.log(`Gemini Thought (HTML Slide ${slideIndex + 1}):`, item.content);
                setCurrentThoughtHtmlArray(prev => { const updated = [...prev]; updated[slideIndex] = item.content; return updated; });
            } else {
                accumulatedHtmlResponse += item.content;
            }
        }
        setCurrentThoughtHtmlArray(prev => { const updated = [...prev]; updated[slideIndex] = null; return updated; });

        let finalHtmlString = accumulatedHtmlResponse.trim();
        const htmlFenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const htmlMatch = finalHtmlString.match(htmlFenceRegex);
        if (htmlMatch && htmlMatch[2]) {
            finalHtmlString = htmlMatch[2].trim();
        }
        
        if (!finalHtmlString.toLowerCase().trim().startsWith("<!doctype html>") && !finalHtmlString.toLowerCase().trim().startsWith("<html")) {
            console.warn(`HTML response for slide ${slideIndex + 1} does not look like valid HTML after cleaning fences. Raw response:`, finalHtmlString.substring(0, 200));
            if (finalHtmlString.length < 500 && (finalHtmlString.includes("error") || finalHtmlString.includes("failed"))) {
                 setErrorArray(prev => { const updated = [...prev]; updated[slideIndex] = `HTML生成モデルがエラーを返しました: ${finalHtmlString.substring(0,100)}...`; return updated; });
            }
        }
        setHtmlOutputArray(prev => { const updated = [...prev]; updated[slideIndex] = finalHtmlString; return updated; });

    } catch (err) {
        console.error(`HTML Generation error (Slide ${slideIndex + 1}):`, err);
        const errorMessage = err instanceof Error ? `HTML生成エラー: ${err.message}` : "不明なHTML生成エラーが発生しました。";
        setErrorArray(prev => { const updated = [...prev]; updated[slideIndex] = errorMessage; return updated; });
        setCurrentThoughtHtmlArray(prev => { const updated = [...prev]; updated[slideIndex] = null; return updated; });
        setHtmlOutputArray(prev => { const updated = [...prev]; updated[slideIndex] = `HTML生成中にエラーが発生しました: ${errorMessage}\n蓄積された応答 (一部の可能性あり):\n${accumulatedHtmlResponse.substring(0, 1000)}`; return updated; });
    } finally {
        setIsLoadingHtmlArray(prev => { const updated = [...prev]; updated[slideIndex] = false; return updated; });
        console.log(`HTML generation attempt finished for slide ${slideIndex + 1}.`);
    }
  };

  const handleGeneration = useCallback(async () => {
    if (imageFiles.length === 0) {
      const newErrorArray = [...errorArray];
      if (newErrorArray.length === 0 && MAX_FILES > 0) newErrorArray[0] = "まず画像をアップロードしてください。";
      else if (newErrorArray.length > 0) newErrorArray[0] = "まず画像をアップロードしてください。";
      setErrorArray(newErrorArray);
      return;
    }

    setErrorArray(new Array(imageFiles.length).fill(null));
    setIsTextEditModeActiveArray(new Array(imageFiles.length).fill(false));
    setIsComponentEditModeActiveArray(new Array(imageFiles.length).fill(false));
    setHtmlFeedbackArray(new Array(imageFiles.length).fill('')); 
    setIsFeedbackModalOpenArray(new Array(imageFiles.length).fill(false));
    setActiveOutputTab(OutputTabKey.StructuredData);

    const generationPromises = imageFiles.map(async (file, index) => {
      try {
        setStructuredDataArray(prev => { const updated = [...prev]; updated[index] = null; return updated; });
        setHtmlOutputArray(prev => { const updated = [...prev]; updated[index] = ''; return updated; });
        setCurrentThoughtStructureArray(prev => { const updated = [...prev]; updated[index] = null; return updated; });
        setCurrentThoughtHtmlArray(prev => { const updated = [...prev]; updated[index] = null; return updated; });

        setIsLoadingStructureArray(prev => { const updated = [...prev]; updated[index] = true; return updated; });
        setIsLoadingHtmlArray(prev => { const updated = [...prev]; updated[index] = false; return updated; });

        console.log(`Starting structure extraction for slide ${index + 1}...`);

        const structurePrompt = `
<role_and_purpose>
あなたはHTMLマークアップを解析し、構造化されたJSONデータに変換する専門家です。HTMLの構造、コンテンツ、スタイル情報を正確に抽出し、再利用可能で保守性の高いJSON形式に変換します。特にTailwind CSSクラスを適切に識別し、レイアウト構造を明確に表現することに重点を置きます。
</role_and_purpose>

<instructions>
- 提供されたHTMLコードを詳細に解析し、DOM構造を理解してください
- HTMLの意味的な構造（ヘッダー、メインコンテンツ、フッターなど）を識別してください
- CSSクラス、インラインスタイル、テキストコンテンツを正確に抽出してください
- Tailwind CSSクラスを識別し、レイアウト関連とスタイル関連で分類してください
- 繰り返し要素（リスト、カード、タグなど）を配列として構造化してください
- チャートやデータビジュアライゼーションは特別な注意を払って構造化してください
- 色や定数値はthemeオブジェクトに集約し、再利用可能にしてください
</instructions>

<html_parsing_requirements>
- HTMLタグの階層構造を維持しつつ、意味的なグループにまとめてください
- classAttributeは配列形式でクラス名を保持してください
- idやdata属性などの重要な属性も保持してください
- テキストノードは適切なキー名（text, title, label等）で保存してください
- 空白やインデントは正規化し、意味のない空白は削除してください
- コメントは無視してください（重要な情報がある場合を除く）
</html_parsing_requirements>

<json_structuring_principles>
- トップレベルキーは論理的なセクション（page_title, theme, header, main_content, footer等）で分割してください
- レイアウト情報はlayout_classesキーに格納してください
- スタイル情報はclassesキーに格納し、必要最小限のinline_styleを使用してください
- 繰り返し要素は配列として表現し、各要素は同じ構造を持つようにしてください
- ネストは適切な深さに保ち、過度に深いネストは避けてください
- プロパティ名は明確で一貫性のある命名規則を使用してください
</json_structuring_principles>

<reasoning_steps>
1. HTML全体構造の把握：
   - DOCTYPE、html、head、bodyタグの確認
   - メタ情報とタイトルの抽出
   - 全体的なレイアウト構造の理解

2. セマンティック構造の識別：
   - ヘッダー、ナビゲーション、メイン、サイドバー、フッターの識別
   - セクションやアーティクルなどの論理的グループの特定
   - 意味的に関連する要素のグルーピング

3. スタイルとテーマの抽出：
   - 使用されている色の収集とCSS変数の識別
   - フォントファミリーとサイズの抽出
   - スペーシングパターンの識別
   - Tailwind CSSクラスの分類

4. コンテンツ要素の構造化：
   - テキストコンテンツの抽出と適切なキー割り当て
   - 画像、リンク、ボタンなどのインタラクティブ要素の処理
   - リストやテーブルなどの構造化データの変換
   - フォーム要素の適切な表現

5. チャートとデータビジュアライゼーションの処理：
   - チャートタイプの識別
   - データポイントの抽出と構造化
   - 凡例、軸ラベル、注釈の処理
   - 視覚的表現のためのスタイル情報の保持

6. 最適化と整理：
   - 重複する値のthemeオブジェクトへの集約
   - 一貫性のあるプロパティ名への統一
   - 不要な情報の削除
   - JSONの妥当性確認
</reasoning_steps>

<context>
<html_input>
今回はなし
</html_input>

<json_sample>
{
  "page_title": "TESLAのバッテリー開発体制",
  "theme": {
    "colors": {
      "primary_accent": "#9333ea",
      "secondary_accent": "#c084fc",
      "text_on_primary": "white",
      "default_text": "black",
      "border_light": "#d1d5db",
      "border_dark": "black",
      "grey": "#6b7280",
      "text_gray_700": "#374151",
      "text_gray_600": "#4B5563",
      "background_f3f4f6": "#f3f4f6",
      "organization_box_bg": "#f8fafc",
      "other_hires_bg": "#e5e7eb",
      "other_hires_text": "#374151"
    },
    "fonts": {
      "body": "'Noto Sans JP', sans-serif"
    },
    "font_sizes_tailwind": {
      "h1": "text-4xl",
      "h2": "text-2xl",
      "h3_section_title": "text-xl",
      "description": "text-lg",
      "organization_box_text": "text-base",
      "details_list_title": "text-base",
      "details_list_item": "text-sm",
      "vertical_label": "text-sm",
      "header_tag": "text-xs",
      "legend_item": "text-xs",
      "chart_y_axis_label": "text-xs",
      "chart_company_label": "text-xs",
      "chart_total_label": "text-xs",
      "chart_note": "text-xs",
      "footer_text": "text-xs",
      "unit_label": "text-xs",
      "chart_segment_value": "text-[10px]"
    },
    "spacing_tailwind": {
      "header_padding_x": "px-8",
      "header_padding_top": "pt-6",
      "header_padding_bottom": "pb-4",
      "main_padding_x": "px-8",
      "main_padding_y": "py-4",
      "footer_padding_x": "px-8",
      "footer_padding_y": "py-3",
      "grid_gap": "gap-8",
      "tag_gap": "gap-2",
      "organization_box_group_gap": "space-x-4",
      "list_item_spacing": "space-y-1"
    }
  },
  "header": {
    "layout_classes": ["flex", "justify-between", "items-start", "mb-3"],
    "left_column": {
      "layout_classes": ["flex-grow", "pr-8"],
      "title_sub": {
        "text": "2. TESLAのバリューチェンから見た競争優位の\"源泉\"",
        "classes": ["text-2xl", "font-bold", "text-black", "mb-1"]
      },
      "title_main": {
        "text": "TESLAのバッテリー開発体制",
        "classes": ["text-4xl", "font-bold", "text-black"]
      }
    },
    "right_column": {
      "layout_classes": ["flex-shrink-0"],
      "tags_container_classes": ["flex", "flex-wrap", "gap-2", "justify-end"],
      "tags": [
        {"text": "企画", "is_highlighted": false, "classes_base": ["header-tag"]},
        {"text": "開発", "is_highlighted": true, "classes_base": ["header-tag"], "classes_highlighted": ["highlighted"]},
        {"text": "調達", "is_highlighted": false, "classes_base": ["header-tag"]},
        {"text": "製造", "is_highlighted": false, "classes_base": ["header-tag"]},
        {"text": "販売", "is_highlighted": false, "classes_base": ["header-tag"]},
        {"text": "アフターサポート", "is_highlighted": false, "classes_base": ["header-tag"]}
      ]
    },
    "description_section": {
      "text": "大学との共同研究やM&Aによる技術を獲得し、バッテリー人材を積極的に採用することで高性能・高効率なバッテリー開発体制を構築している",
      "classes": ["text-lg", "text-gray-700"]
    }
  },
  "main_content": {
    "layout_classes": ["flex-1", "px-8", "py-4"],
    "grid_container_classes": ["grid", "grid-cols-2", "gap-8", "h-full"],
    "columns": [
      {
        "id": "left_column_dev_capability",
        "layout_classes": ["flex", "flex-col"],
        "title": {
          "text": "バッテリー開発ケイパビリティ獲得の為の取り組み",
          "classes": ["text-xl", "font-bold", "text-center", "mb-6", "pb-2", "border-b", "border-gray-300"]
        },
        "sections": [
          {
            "type": "university_research",
            "container_classes": ["content-block", "flex"],
            "vertical_label": {
              "text": "大学との研究契約",
              "classes": ["vertical-label", "text-sm", "text-gray-600"]
            },
            "content_area_classes": ["flex-1"],
            "organization_box": {
              "text": "DALHOUSIE UNIVERSITY",
              "classes": ["organization-box", "text-base", "font-bold"]
            },
            "details_container_classes": ["mb-3"],
            "details_title": {
              "text": "共同研究によるバッテリー性能の高度化・人材獲得",
              "classes": ["text-base", "font-bold", "mb-2"],
              "inline_style": "color: var(--primary-accent);"
            },
            "list_items_container_classes": ["text-sm", "space-y-1", "text-gray-700"],
            "list_items_container_inline_style": "line-height: 1.4;",
            "list_items": [
              "- カナダ、ダルハウジー大学のリチウムイオン電池の世界的な権威であるJeff Dahn氏との研究契約を16年より締結",
              "- 同氏の研究は世界中のリチウムイオン電池に採用される等、強い影響力を持つ",
              "- TESLAは同研究室の卒業生の採用も行っている"
            ]
          },
          {
            "type": "m_and_a",
            "container_classes": ["content-block", "no-bottom-border", "flex"],
            "vertical_label": {
              "text": "M&Aによる技術獲得",
              "classes": ["vertical-label", "text-sm", "text-gray-600"]
            },
            "content_area_classes": ["flex-1"],
            "organization_boxes_container_classes": ["flex", "space-x-4", "mb-3"],
            "organization_boxes": [
              {"text": "HIBAR", "classes": ["organization-box", "text-base", "font-bold", "flex-1"]},
              {"text": "MAXWELL", "classes": ["organization-box", "text-base", "font-bold", "flex-1"]}
            ],
            "details_container_classes": ["mb-3"],
            "details_title": {
              "text": "買収を通じたバッテリー製造効率・性能の高度化",
              "classes": ["text-base", "font-bold", "mb-2"],
              "inline_style": "color: var(--primary-accent);"
            },
            "list_items_container_classes": ["text-sm", "space-y-1", "text-gray-700"],
            "list_items_container_inline_style": "line-height: 1.4;",
            "list_items": [
              "- 19年、バッテリーの高速製造システムを専門とする会社であるHibar Systems Ltd.を買収",
              "- 19年5月にバッテリーメーカーのMaxwell社を買収し、同社が保有するドライ電極技術を獲得"
            ],
            "action_button": {
              "text": "次頁詳細",
              "classes": ["button-primary"]
            }
          }
        ]
      },
      {
        "id": "right_column_hr_initiatives",
        "layout_classes": ["flex", "flex-col"],
        "title": {
          "text": "バッテリー関連人材採用への取り組み",
          "classes": ["text-xl", "font-bold", "text-center", "mb-6", "pb-2", "border-b", "border-gray-300"]
        },
        "charts": [
          {
            "id": "hp_hires_chart_section",
            "container_classes": ["mb-6"],
            "unit_label": {
              "text": "単位：人",
              "container_classes": ["flex", "justify-end", "mb-2"],
              "text_classes": ["text-xs", "text-gray-600"]
            },
            "legend": {
              "container_classes": ["mb-4", "space-y-1"],
              "items": [
                {"label": "バッテリーエンジニア(設計・ソフトウェア開発等)", "color_style": "background-color: var(--primary-accent);", "text_classes": ["legend-item", "text-xs"]},
                {"label": "その他バッテリー関連(生産、品質管理等)", "color_style": "background-color: var(--secondary-accent);", "text_classes": ["legend-item", "text-xs"]},
                {"label": "その他採用職種", "color_style": "background-color: #e5e7eb; border: 1px solid var(--border-light);", "text_classes": ["legend-item", "text-xs"]}
              ]
            },
            "chart_visualization_container_classes": ["flex"],
            "y_axis_label": {
              "text": "各社公式HP採用人数",
              "classes": ["y-axis-label", "text-xs", "text-gray-600", "mr-2"]
            },
            "chart_data_area_classes": ["flex-1"],
            "data_rows": [
              {
                "company": "Tesla", "total_value": 226,
                "company_label_classes": ["w-12", "text-xs", "text-right", "mr-2"],
                "bar_container_classes": ["flex-1", "flex", "h-[1.2rem]"],
                "total_label_classes": ["w-8", "text-xs", "text-center", "ml-2"],
                "segments": [
                  {"value_text": "153", "category_class": "other-hires", "width_style": "width: 67.7%;"},
                  {"value_text": "45", "category_class": "other-battery-related", "width_style": "width: 19.9%;"},
                  {"value_text": "28", "category_class": "battery-engineer", "width_style": "width: 12.4%;"}
                ]
              },
              {
                "company": "トヨタ", "total_value": 105,
                "company_label_classes": ["w-12", "text-xs", "text-right", "mr-2"],
                "bar_container_classes": ["flex-1", "flex", "h-[1.2rem]"],
                "total_label_classes": ["w-8", "text-xs", "text-center", "ml-2"],
                "segments": [
                  {"value_text": "97", "category_class": "other-hires", "width_style": "width: 42.9%;"},
                  {"value_text": "2", "category_class": "other-battery-related", "width_style": "width: 0.9%;"},
                  {"value_text": "6", "category_class": "battery-engineer", "width_style": "width: 2.7%;"}
                ]
              },
              {
                "company": "日産", "total_value": 13,
                "company_label_classes": ["w-12", "text-xs", "text-right", "mr-2"],
                "bar_container_classes": ["flex-1", "flex", "h-[1.2rem]"],
                "total_label_classes": ["w-8", "text-xs", "text-center", "ml-2"],
                "segments": [
                  {"value_text": "12", "category_class": "other-hires", "width_style": "width: 5.3%;"},
                  {"value_text": "1", "category_class": "battery-engineer", "width_style": "width: 0.4%;"}
                ]
              },
              {
                "company": "ホンダ", "total_value": 48,
                "company_label_classes": ["w-12", "text-xs", "text-right", "mr-2"],
                "bar_container_classes": ["flex-1", "flex", "h-[1.2rem]"],
                "total_label_classes": ["w-8", "text-xs", "text-center", "ml-2"],
                "segments": [
                  {"value_text": "45", "category_class": "other-hires", "width_style": "width: 19.9%;"},
                  {"value_text": "2", "category_class": "other-battery-related", "width_style": "width: 0.9%;"},
                  {"value_text": "1", "category_class": "battery-engineer", "width_style": "width: 0.4%;"}
                ]
              }
            ],
            "note": {
              "text": "TESLAと比較し日系OEMのバッテリー関連の採用は僅か",
              "container_classes": ["text-center", "mt-3"],
              "text_classes": ["text-xs"],
              "inline_style": "color: var(--primary-accent);"
            }
          },
          {
            "id": "linkedin_chart_section",
            "chart_visualization_container_classes": ["flex"],
             "y_axis_label": {
              "text": "LinkedIn登録者数",
              "classes": ["y-axis-label", "text-xs", "text-gray-600", "mr-2"]
            },
            "chart_data_area_classes": ["flex-1"],
            "data_rows": [
               {
                "company": "Tesla", "total_value": "42,000",
                "company_label_classes": ["w-12", "text-xs", "text-right", "mr-2"],
                "bar_container_classes": ["flex-1", "flex", "items-center", "h-[1.2rem]"],
                "total_label_classes": ["w-12", "text-xs", "text-center", "ml-2"],
                "segments": [
                  {"value_text": "40,200 //", "category_class": "other-hires", "width_style": "width: 70%; min-width: 60px;"},
                  {"value_text": "700", "category_class": "other-battery-related", "width_style": "width: 10%;"},
                  {"value_text": "1,100", "category_class": "battery-engineer", "width_style": "width: 20%;"}
                ]
              }
            ],
            "note": {
              "text": "※従業員全体は20年12月末時点で70,757人",
              "container_classes": ["text-right", "mt-2"],
              "text_classes": ["text-xs", "text-gray-600"]
            }
          }
        ]
      }
    ]
  },
  "footer": {
    "container_classes": ["px-8", "py-3", "border-t", "border-gray-200"],
    "grid_container_classes": ["grid", "grid-cols-12", "gap-2", "items-center"],
    "items": [
      {
        "text": "出所:現状のエンジニア数はLinkedIn登録数を参照、採用人数は各社公式HPより。いずれも4/21時点",
        "layout_classes": ["col-span-7"],
        "text_classes": ["text-xs"],
        "inline_style": "color: var(--grey);"
      },
      {
        "text": "Copyright © 2021 Accenture. All rights reserved.",
        "layout_classes": ["col-span-4", "text-right"],
        "text_classes": ["text-xs"],
        "inline_style": "color: var(--grey);"
      },
      {
        "text": "22",
        "layout_classes": ["col-span-1", "text-right"],
        "text_classes": ["text-xs"],
        "inline_style": "color: var(--grey);"
      }
    ]
  }
}
</json_sample>
</context>

<final_instructions_and_thinking_prompt>
与えられたHTMLコードを解析し、上記のサンプルJSONと同様の構造に変換してください。まずHTML全体の構造を把握し、主要なセクション（ヘッダー、メインコンテンツ、フッター）を識別します。次に各セクション内の要素を詳細に解析し、テキスト、クラス、スタイル情報を抽出します。Tailwind CSSクラスは特に注意深く識別し、レイアウト用とスタイル用で適切に分類してください。

繰り返し要素（タグ、リストアイテム、チャートデータなど）は配列として構造化し、各要素が同じプロパティ構造を持つようにしてください。色やフォントサイズなどの定数値はthemeオブジェクトに集約し、実際の使用箇所では変数参照として表現することを検討してください。

チャートやデータビジュアライゼーションが含まれる場合は、データ構造を適切に表現し、視覚的な情報（幅、色、ラベル）も保持してください。最終的なJSONは、元のHTMLの視覚的・構造的情報を完全に保持しつつ、プログラムで処理しやすい形式になるようにしてください。

出力は有効なJSON形式で、適切にインデントされ、読みやすい構造にしてください。
</final_instructions_and_thinking_prompt>
        `; 
        
        let tempStructuredJson = "";
        let parsedStructuredDataForHtml: SlideData | null = null;

        for await (const item of extractStructureWithGemini(uploadedImagePreviews[index], file.type, structurePrompt)) {
          if (item.type === 'thought') {
            setCurrentThoughtStructureArray(prev => { const updated = [...prev]; updated[index] = item.content; return updated; });
          } else {
            tempStructuredJson += item.content;
            try {
              let previewJsonToParse = tempStructuredJson.trim();
              const fenceRegexPreview = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
              const matchPreview = previewJsonToParse.match(fenceRegexPreview);
              if (matchPreview && matchPreview[2]) {
                previewJsonToParse = matchPreview[2].trim();
              }
              const parsed = JSON.parse(previewJsonToParse) as SlideData;
              setStructuredDataArray(prev => { const updated = [...prev]; updated[index] = parsed; return updated; });
            } catch (parseError) {
              setStructuredDataArray(prev => {
                const updated = [...prev];
                updated[index] = {
                  rawText: tempStructuredJson, 
                  page_title: "抽出中...", 
                };
                return updated;
              });
            }
          }
        }
        setCurrentThoughtStructureArray(prev => { const updated = [...prev]; updated[index] = null; return updated; });
        
        let finalJsonStringToParse = tempStructuredJson.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = finalJsonStringToParse.match(fenceRegex);
        if (match && match[2]) {
          finalJsonStringToParse = match[2].trim();
        }

        try {
          const finalParsedData = JSON.parse(finalJsonStringToParse) as SlideData;
          setStructuredDataArray(prev => { const updated = [...prev]; updated[index] = finalParsedData; return updated; });
          parsedStructuredDataForHtml = finalParsedData;
        } catch (finalParseError) {
          console.error(`Final JSON parsing error for slide ${index + 1}:`, finalParseError);
          setErrorArray(prev => { const updated = [...prev]; updated[index] = "抽出された構造化データの解析に失敗しました。"; return updated; });
          setStructuredDataArray(prev => {
            const updated = [...prev];
            updated[index] = { rawText: finalJsonStringToParse, page_title: "解析エラー" };
            return updated;
          });
          parsedStructuredDataForHtml = null;
        }
        
        setIsLoadingStructureArray(prev => { const updated = [...prev]; updated[index] = false; return updated; });
        console.log(`Structure extraction complete for slide ${index + 1}.`);

        if (!parsedStructuredDataForHtml) { 
          setErrorArray(prev => { 
            const updated = [...prev]; 
            if (!updated[index]) { 
              updated[index] = "構造化データの抽出または解析に失敗しました。HTMLを生成できません。";
            }
            return updated; 
          });
          return; 
        }
        
        if (index === activeSlideIndex) { 
          setActiveOutputTab(OutputTabKey.HtmlSlide);
        }
        await generateHtmlForSingleSlide(index, finalJsonStringToParse, null); 

      } catch (err) {
        console.error(`生成エラー (Slide ${index + 1}):`, err);
        const errorMessage = err instanceof Error ? `エラー: ${err.message}` : "不明なエラーが発生しました。";
        setErrorArray(prev => { const updated = [...prev]; updated[index] = errorMessage; return updated; });
        setCurrentThoughtStructureArray(prev => { const updated = [...prev]; updated[index] = null; return updated; });
        setCurrentThoughtHtmlArray(prev => { const updated = [...prev]; updated[index] = null; return updated; });
        setIsLoadingStructureArray(prev => { const updated = [...prev]; updated[index] = false; return updated; });
        setIsLoadingHtmlArray(prev => { const updated = [...prev]; updated[index] = false; return updated; });
      }
    });

    await Promise.allSettled(generationPromises);
    console.log("All generation processes finished.");

  }, [imageFiles, uploadedImagePreviews, activeSlideIndex, errorArray]);

  const handleToggleTextEditMode = (slideIndex: number) => {
    setIsTextEditModeActiveArray(prev => {
      const newArray = [...prev];
      newArray[slideIndex] = !newArray[slideIndex]; 
      if (newArray[slideIndex]) { 
        setIsComponentEditModeActiveArray(p => {
          const n = [...p];
          n[slideIndex] = false;
          return n;
        });
      }
      return newArray;
    });
  };

  const handleToggleComponentEditMode = (slideIndex: number) => {
    setIsComponentEditModeActiveArray(prev => {
      const newArray = [...prev];
      newArray[slideIndex] = !newArray[slideIndex]; 
      if (newArray[slideIndex]) { 
        setIsTextEditModeActiveArray(p => {
          const n = [...p];
          n[slideIndex] = false;
          return n;
        });
      }
      return newArray;
    });
  };


  const handleOpenFeedbackModal = (slideIndex: number) => {
    setIsFeedbackModalOpenArray(prev => {
      const newArray = [...prev];
      newArray[slideIndex] = true;
      return newArray;
    });
  };

  const handleCloseFeedbackModal = (slideIndex: number) => {
    setIsFeedbackModalOpenArray(prev => {
      const newArray = [...prev];
      newArray[slideIndex] = false;
      return newArray;
    });
  };

  const handleSubmitFeedback = async (slideIndex: number, feedback: string) => {
    setHtmlFeedbackArray(prev => {
      const newArray = [...prev];
      newArray[slideIndex] = feedback;
      return newArray;
    });
    handleCloseFeedbackModal(slideIndex); 

    const currentStructuredData = structuredDataArray[slideIndex];
    if (currentStructuredData) {
      const dataString = typeof currentStructuredData.rawText === 'string' && Object.keys(currentStructuredData).length <= (currentStructuredData.page_title ? 2:1) 
        ? currentStructuredData.rawText 
        : JSON.stringify(currentStructuredData);
        
      if (dataString) {
        await generateHtmlForSingleSlide(slideIndex, dataString, feedback);
      } else {
         setErrorArray(prev => { const updated = [...prev]; updated[slideIndex] = "HTML再生成不可: 構造化データが空です。"; return updated;});
      }
    } else {
      setErrorArray(prev => { const updated = [...prev]; updated[slideIndex] = "HTML再生成不可: 構造化データがありません。"; return updated;});
    }
  };


  const currentError = errorArray[activeSlideIndex] || null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 p-4 md:p-8 selection:bg-sky-500 selection:text-sky-900">
      <div className="flex-grow flex flex-col md:flex-row gap-6 pt-4 md:pt-0">
        {/* Left Panel */}
        <div 
          className={`
            ${isLeftPanelOpen ? 'w-full md:w-3/12 p-6' : 'w-16 md:w-16 p-2'} 
            bg-slate-800 rounded-lg shadow-xl flex flex-col 
            opacity-100
            transition-all duration-300 ease-in-out overflow-hidden transform
          `}
          aria-hidden={!isLeftPanelOpen}
        >
          {isLeftPanelOpen ? (
            <div className="overflow-y-auto custom-scrollbar flex-grow">
              <ImageUploadStep 
                onFilesChange={handleFilesSelected}
                onRemoveFile={handleRemoveFile}
                currentFiles={imageFiles}
                currentImagePreviews={uploadedImagePreviews}
              />
              {imageFiles.length > 0 && (
                <button
                  onClick={handleGeneration}
                  disabled={isOverallLoading}
                  className="mt-6 w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  aria-label={isOverallLoading ? "処理中" : "生成開始"}
                >
                  {isOverallLoading && <LoadingSpinner size="sm" color="text-white" />}
                  <span className="ml-2">
                    {isOverallLoading ? "処理中..." : "生成開始"}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <DocumentIcon className="w-8 h-8 text-slate-400" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Right Panel (OutputArtifact) */}
        <div 
          className={`
            transition-all duration-300 ease-in-out flex flex-col bg-slate-800 p-6 rounded-lg shadow-xl relative 
            ${isLeftPanelOpen ? 'w-full md:w-9/12' : 'w-full'}
          `}
        >
          <button
            onClick={toggleLeftPanel}
            className={`absolute top-1/2 transform -translate-y-1/2 z-20 
                       md:left-[-12px] md:-translate-x-1/2  
                       left-1 
                       p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full 
                       focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-lg`}
            aria-label={isLeftPanelOpen ? "左パネルを閉じる" : "左パネルを開く"}
            aria-expanded={isLeftPanelOpen}
            title={isLeftPanelOpen ? "左パネルを閉じる" : "左パネルを開く"}
          >
            {isLeftPanelOpen ? <ChevronLeftIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
          </button>
          
          {imageFiles.length > 0 && (
            <div className="flex border-b border-slate-700 mb-4 overflow-x-auto whitespace-nowrap custom-scrollbar pb-1">
              {imageFiles.map((file, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSlideIndex(index)}
                  className={`px-4 py-3 text-sm font-medium focus:outline-none transition-colors duration-150 flex items-center shrink-0 ${
                    activeSlideIndex === index
                      ? 'border-b-2 border-sky-500 text-sky-400'
                      : 'text-slate-400 hover:text-sky-300 border-b-2 border-transparent'
                  } ${ (isLoadingStructureArray[index] || isLoadingHtmlArray[index]) ? 'opacity-70 cursor-wait' : '' } `}
                  disabled={isLoadingStructureArray[index] || isLoadingHtmlArray[index]}
                  aria-current={activeSlideIndex === index ? 'page' : undefined}
                  title={file.name}
                >
                  スライド {index + 1}
                  {(isLoadingStructureArray[index] || isLoadingHtmlArray[index]) && <LoadingSpinner size="xs" color="text-sky-400" className="ml-2" />}
                </button>
              ))}
            </div>
          )}

          {imageFiles.length > 0 && uploadedImagePreviews[activeSlideIndex] !== undefined ? (
            <OutputArtifact
              activeSlideIndex={activeSlideIndex}
              structuredData={structuredDataArray[activeSlideIndex]}
              htmlOutput={htmlOutputArray[activeSlideIndex]}
              isLoadingJson={isLoadingStructureArray[activeSlideIndex]}
              isLoadingHtml={isLoadingHtmlArray[activeSlideIndex]}
              imagePreviewUrl={uploadedImagePreviews[activeSlideIndex]}
              activeTab={activeOutputTab}
              onTabChange={setActiveOutputTab}
              currentThoughtStructure={currentThoughtStructureArray[activeSlideIndex]}
              currentThoughtHtml={currentThoughtHtmlArray[activeSlideIndex]}
              error={currentError}
              isTextEditModeActive={isTextEditModeActiveArray[activeSlideIndex] || false}
              onToggleTextEditMode={handleToggleTextEditMode}
              isComponentEditModeActive={isComponentEditModeActiveArray[activeSlideIndex] || false}
              onToggleComponentEditMode={handleToggleComponentEditMode}
              htmlFeedback={htmlFeedbackArray[activeSlideIndex] || ''}
              isFeedbackModalOpen={isFeedbackModalOpenArray[activeSlideIndex] || false}
              onOpenFeedbackModal={handleOpenFeedbackModal}
              onCloseFeedbackModal={handleCloseFeedbackModal}
              onSubmitFeedback={handleSubmitFeedback}
            />
          ) : (
            <div className="flex-grow flex items-center justify-center text-slate-500">
              <p>画像をアップロードして「生成開始」をクリックしてください。</p>
            </div>
          )}
           {currentError && ( 
            <p className="mt-4 text-red-400 text-sm px-1" role="alert">
              スライド {activeSlideIndex + 1} エラー: {currentError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
