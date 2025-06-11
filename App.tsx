import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ImageUploadStep } from './components/ImageUploadStep';
import { OutputArtifact } from './components/OutputArtifact';
import { extractStructureWithGemini, generateHtmlWithGemini } from './services/geminiService';
import type { SlideData, GeminiStreamOutput } from './types';
import { OutputTabKey, MAX_FILES } from './types';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ChevronLeftIcon, ChevronRightIcon, DocumentIcon } from './components/icons';
import HtmlPasteStep from './components/HtmlPasteStep';

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

  const [inputMode, setInputMode] = useState<'image' | 'html'>('image');
  const [rawHtmlInput, setRawHtmlInput] = useState<string>('');

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
        <rule>vertical_label 要素は必ず上→下方向（top-to-bottom）で表示されるように抽出してください。JSON には orientation キーを追加し、値を "top_to_bottom" としてください。下から上読みの縦書きテキストは決して存在しないため、transform: rotate(180deg) やその他の回転処理を示唆するような記述は一切含めないでください。</rule>
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
    
    <step number="1" name="入力JSONの完全理解">
      <actions>
        <action>提供された単一のJSONオブジェクトを詳細に解析します。page_title, theme (特に colors, fonts, font_sizes_tailwind), header, main_content, footerの各主要キーとそのネストされたオブジェクト/配列を精査します。</action>
        <action>各要素のtextコンテンツ、適用すべきclasses（Tailwindクラス）、inline_style、コンポーネントタイプ（例: type: "organization_box"）、データ構造（例: charts.data_rows.segments）を正確に把握します。</action>
        <action>theme.colorsとtheme.fonts.bodyを基にデザインの基本方針を固めます。</action>
      </actions>
    </step>
    
    <step number="2" name="基本HTML構造のセットアップ">
      <actions>
        <action>HTMLドキュメントの基本的な骨組みを作成します。</action>
        <action>&lt;head&gt;内に、page_title、文字コード、ビューポート設定、必要なCDNリンク（Tailwind CSS, Font Awesome, 指定フォント）を記述します。</action>
        <action>:rootにCSS変数を定義し、基本的なCSS（例: body { font-family: var(--main-font); }, .slide-containerのスタイル、JSONで示唆されるカスタムクラス）を&lt;style&gt;タグ内に準備します。</action>
      </actions>
    </step>
    
    <step number="3" name="スライドコンテナの作成">
      <actions>
        <action>&lt;div class="slide-container"&gt; を作成し、指定された16:9の固定サイズスタイルを適用します。</action>
      </actions>
    </step>
    
    <step number="4" name="入力JSONに基づくスライド構造の構築">
      <actions>
        <action>入力JSONのheader, main_content, footerオブジェクトの指示に従い、各セクションをHTML要素で構築します。</action>
        <action>各セクションや内部要素に対して、JSON内のlayout_classesやその他のクラス指示に基づいてTailwind CSSクラスを適用します。</action>
      </actions>
    </step>
    
    <step number="5" name="コンテンツ要素の配置とスタイリング">
      <actions>
        <action>JSON内の各テキスト要素（タイトル、説明文、リストアイテム、ラベル等）を適切なHTMLタグに変換し、JSON内のclassesやfont_size_key（theme.font_sizes_tailwindを参照してクラスに変換）に基づいてスタイリングします。inline_styleがあれば適用します。</action>
        <action>header.tagsやaction_buttonのような要素は、JSON内のテキスト、ハイライト状態、スタイルタイプに基づいてHTMLとCSSクラスを生成します。</action>
        <action>organization_boxのようなカスタムコンポーネントは、対応するカスタムCSSクラスとJSON内のテキスト・クラス指示を組み合わせてレンダリングします。</action>
        <action>必要に応じてFont Awesomeアイコンを配置します。</action>
        <action>チャートが必要な場合、&lt;canvas&gt;要素を配置し、そのidもJSONから取得します。コンテナのスタイルも設定します。</action>
      </actions>
    </step>
    
    <step number="6" name="カラースキームの適用">
      <actions>
        <action>CSS変数やTailwindのユーティリティクラスを通じて、JSONのtheme.colorsに基づいた色を計画的に適用します。ext_color_typeのようなキーはCSS変数を参照するようにします。</action>
      </actions>
    </step>
    
    <step number="7" name="JavaScriptの記述 (特にChart.js)">
      <actions>
        <action>入力JSONのcharts配列を処理します。各チャートオブジェクトから種類(type)、データ(data_rowsやその中のsegments)、ラベル、オプションを抽出し、Chart.jsの初期化コードを記述します。</action>
        <action>棒グラフセグメントの色は、segments内のcategory_classやcategoryキーとtheme.colorsをマッピングして適用します。</action>
      </actions>
    </step>
    
    <step number="8" name="最終レビューと調整">
      <actions>
        <action>生成されたHTMLコード全体を見直し、構造の整合性、Tailwind CSSクラスの適切な使用、スタイルの適用漏れや矛盾がないかを確認します。</action>
        <action>コードのインデントや可読性を整えます。</action>
        
      </actions>
    </step>
    
    <step number="9" name="出力">
      <actions>
        <action>完成したHTMLコード文字列を値として持つhtmlキーを含むJSONオブジェクトを生成し、出力します。</action>
      </actions>
    </step>
  </reasoning_steps>
  
  <user_feedback_on_previous_attempt>
  {{ $user_feedback_for_html }}
  </user_feedback_on_previous_attempt>

  <json_input>
  {{ $json.output }}
  </json_input> 

  <final_instructions>
  - 縦書きテキストは、CSSの writing-mode: vertical-rl; を使用して、必ず上から下へ流れるように実装してください。文字が横向きにならないよう、text-orientation: upright; も併用し、各文字が正しい向きを保つようにしてください。
  - 下から上読みの縦書きテキストは決して存在しないため、transform: rotate(180deg) やその他の回転処理は一切使用しないでください。縦書きテキストは常に上から下方向にのみ表示してください。
  </final_instructions>
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

        // Load knowledge base
        const knowledgeBase = await loadKnowledgeBase();

        const structurePrompt = `${knowledgeBase}
<role_and_purpose>
あなたはスライド画像を解析し、構造化されたJSONデータに変換する専門家です。画像内のテキスト、レイアウト、色、図表、表などの視覚的要素を正確に抽出し、再利用可能で保守性の高いJSON形式に変換します。特にグリッドレイアウト、縦書きラベル、チャート要素、テーブル構造の識別に重点を置きます。
</role_and_purpose>

<instructions>
- 提供されたスライド画像を詳細に解析し、視覚的レイアウト構造を理解してください
- 画像の意味的な構造（ヘッダー、メインコンテンツ、フッターなど）を識別してください
- テキスト内容、色、フォントサイズ、配置を正確に抽出してください
- グリッドレイアウト、カラム構造、テーブル、罫線を識別し適切に構造化してください
- 繰り返し要素（リスト、カード、タグ、チャートデータなど）を配列として構造化してください
- チャート、表、凡例、縦書きラベルなどの複雑な要素は特別な注意を払って構造化してください
- 使用されている色、フォントサイズ、間隔をthemeオブジェクトに集約し、再利用可能にしてください
</instructions>

<image_analysis_requirements>
- 画像内の視覚的階層構造を維持しつつ、意味的なグループにまとめてください
- レイアウトクラスは配列形式で適切なTailwind CSSクラス名を推定してください
- テキスト要素は適切なキー名（text, title, label等）で保存してください
- 複数行にわたるテキストは改行を保持し、適切にエスケープしてください
- 罫線、区切り線、背景色の違いを識別し、border や background クラスとして表現してください
- テーブル構造では、ヘッダー行、データ行、縦ラベル列を明確に区別してください
- チャートの凡例と実際のデータ部分の色の対応関係を正確に抽出してください
- グリッドレイアウトの列数を分析し、grid-cols-{数字} として表現してください

<text_direction_analysis>
テキストの向きを正確に判定するため、以下の手順を必ず実行してください：

<text_direction_analysis_step_1>
- **横書きテキスト**: 文字が水平に配置されているか確認
  - 左→右読み: 通常の横書き（CSSクラス不要）
  - 右→左読み: 逆方向横書き（direction: rtl が必要）
</text_direction_analysis_step_1>

<text_direction_analysis_step_2>
- **縦書きテキスト**: 文字が垂直に配置されているか確認
  - 上→下読み: 一般的な縦書き（writing-mode: vertical-rl）
</text_direction_analysis_step_2>

<text_direction_analysis_step_3>
縦書きテキストを発見した場合：
- **文字の配置方向**: 漢字・ひらがな・カタカナが縦に並んでいるか
- **読み順序**: 最初の文字が上にあるか下にあるか
- **文字の正立**: 文字が正しい向きで表示されているか、回転しているか
</text_direction_analysis_step_3>

<text_direction_analysis_step_4>
- **通常の縦書き（上→下読み）**: ["writing-mode-vertical-rl"]
- **テキスト中央揃え**: ["text-center"]
- **文字間隔**: ["whitespace-pre-line"] （改行保持が必要な場合）
</text_direction_analysis_step_4>

<text_direction_analysis_step_5>
- 縦書きラベルの文字が上から下に向かって正しく読めるか
- 同じページ内の複数の縦書き要素の向きの一貫性を確認する
</image_analysis_requirements>

<json_structuring_principles>
- トップレベルキーは論理的なセクション（page_title, slide_dimensions, theme, header, main_content, footer等）で分割してください
- レイアウト情報はlayout_classesやcontainer_classesキーに格納してください
- スタイル情報はclassesキーに格納し、テーマ参照や必要最小限のinline_styleを使用してください
- 繰り返し要素（tags, list_items, data_rows, legend_items等）は配列として表現し、各要素は同じ構造を持つようにしてください
- テーブル構造では category_rows と issue_cells_in_row の階層を明確に分けてください
- チャート要素では legend, data_rows, segments の関係を正確に表現してください
- vertical_label は classes に writing-mode-vertical-rl を含めてください
- ネストは適切な深さに保ち、過度に深いネストは避けてください
- プロパティ名は明確で一貫性のある命名規則を使用してください（good_slides参考）
</json_structuring_principles>

<reasoning_steps>
1. スライド画像全体構造の把握：
   - 画像の幅と高さの確認
   - ページタイトルの識別
   - 全体的なレイアウト構造の理解（ヘッダー、メイン、フッターの配置）

2. セマンティック構造の識別：
   - ヘッダー（タイトル、サブタイトル、タグ、凡例）の識別
   - メインコンテンツ（カラム、セクション、テーブル、チャート）の特定
   - フッター（著作権、ページ番号、出典）の認識
   - 意味的に関連する要素のグルーピング

3. スタイルとテーマの抽出：
   - 使用されている色パレットの収集と名前付け
   - フォントサイズのパターン抽出（text-xs, text-sm, text-base等）
   - スペーシングパターンの識別（px-8, py-4, gap-3等）
   - 背景色、罫線色、テキスト色の分類

4. コンテンツ要素の構造化：
   - テキストコンテンツの抽出と適切なキー割り当て
   - **テキスト方向の詳細分析**: 各テキスト要素の向き（横書き/縦書き、読み方向）を慎重に観察
   - **縦書きテキストの正確な判定**: 文字の配置、読み順序を評価
   - ボタン、タグ、ラベルなどの要素の処理
   - リスト（bullet_list）、テーブル（issue_table）などの構造化データの変換
   - vertical_label の方向判定と適切なCSSクラスの選択

5. チャートとデータビジュアライゼーションの処理：
   - チャートタイプ（bar chart等）の識別
   - 凡例（legend）の色とラベルの対応関係の抽出
   - データポイント（data_rows, segments）の抽出と構造化
   - Y軸ラベル、会社名、数値の配置と構造化
   - 注釈（note）とチャート説明の処理

6. 最適化と整理：
   - 重複する色・フォント・スペーシング値のthemeオブジェクトへの集約
   - 一貫性のあるプロパティ名への統一（good_slides形式に準拠）
   - テーマ参照（theme.colors.primary_accent等）の適切な設定
   - JSONの妥当性確認と構造の最適化
</reasoning_steps>

<context>
<image_input>
提供されたスライド画像を解析対象とします
</image_input>
</context>

<final_instructions_and_thinking_prompt>
提供されたスライド画像を解析し、以下の構造化指針に従ってJSONに変換してください。

## 基本構造
必須のトップレベルキー：
- page_title: スライドのメインタイトル
- slide_dimensions: {"width_px": 1280, "min_height_px": 720}
- theme: 色・フォント・スペーシングの定義
- header: タイトル、サブタイトル、タグ、凡例
- main_content: メインコンテンツエリア
- footer: 著作権、ページ番号、出典（存在する場合）

## スライドタイプ別の構造化パターン

### 1. チャート中心のスライド
- main_content.columns[]: カラムごとに分割
- charts[]: チャートセクション
- legend.items[]: 凡例アイテム（色とラベルのペア）
- data_rows[]: データ行（company, total_value, segments[]）
- segments[]: セグメント（value_text, width_style, category_class）
- vertical_label: 縦書きラベル（text, classes配列）

### 2. 縦書きラベル付きセクション構造
- main_content.sections[]: セクション配列
- content_block.vertical_label: line1_text, line2_text, classes配列
- details_area.items[]: コンテンツアイテム
- text_segments[]: ハイライト対応テキスト（text, is_highlighted）
- page_reference: ページ参照（text, text_classes）

### 3. 複雑なテーブル構造
- header.legend_section.legend_items[]: ヘッダー凡例
- main_table_area: テーブルメインエリア
- column_headers[]: カラムヘッダー
- category_rows[]: カテゴリ行
- vertical_label_cell: 縦ラベルセル（テキスト方向を正確に判定してCSSクラスを設定）
- issue_cells_in_row[]: 課題セル
- issue_items[]: 課題アイテム（id_text, text, tags[], is_bottleneck）

## **テキスト方向判定の手順**
1. **画像内のテキストを慎重に観察**: 文字が縦に並んでいるか横に並んでいるかを確認
2. **縦書きテキストの読み順序を判定**: 最初の文字が上にあるか下にあるかを確認
3. **適切なCSSクラスを選択**:
   - 上→下読みの縦書き: writing-mode-vertical-rl のみ
4. **複数の縦書き要素がある場合**: 一貫した方向性を確認

## 重要な構造化ルール
1. **テキスト方向の正確な判定**: 画像内のテキストの実際の向きを慎重に観察し、適切なCSSクラスを選択する
   - 通常の縦書き（上→下読み）: ["writing-mode-vertical-rl"]
   - 横書きテキスト: 通常はクラス不要、必要に応じてdirection指定
2. colors: primary_accent, secondary_accent, text_gray_700, text_gray_600等をtheme.colorsに定義
3. font_sizes: text-xs, text-sm, text-base, text-xl, text-4xl等をtheme.font_sizes_tailwindに定義
4. layout_classes: grid-cols-数字, gap-サイズ, flex, items-center等を適切に設定
5. 配列要素: tags, list_items, data_rows, legend_items, segments等は一貫した構造を持つ
6. テーマ参照: 実際の使用箇所では"theme.colors.primary_accent"等の参照形式を使用

## チェックポイント
- **テキスト方向の正確性**: 縦書き・横書きテキストの向きが画像と一致しているか
- **縦書きテキストのCSSクラス**: writing-mode-vertical-rl の有無
- **読み方向の確認**: テキストが自然に読める方向になっているか
- グリッド列数の正確な識別（grid-cols-2, grid-cols-12等）
- 罫線・背景色の適切なクラス設定（border-b, bg-gray-300等）
- チャートの色とデータの対応関係
- ハイライトテキストの is_highlighted フラグ
- テーブルセルの階層構造（category_rows → issue_cells_in_row → issue_items）

最終的なJSONは元のスライドの視覚的・構造的情報を完全に保持し、HTMLとして再現可能な形式で、有効なJSON形式で適切にインデントして出力してください。
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

  const handleHtmlInputChange = (htmlText: string) => {
    setRawHtmlInput(htmlText);
    if (htmlText.trim()) {
      if (htmlOutputArray.length === 0) {
        initializeOutputArrays(1);
        setActiveSlideIndex(0);
      }
      setHtmlOutputArray(prev => {
        const updated = [...prev];
        updated[0] = htmlText;
        return updated;
      });
    } else {
      initializeOutputArrays(0);
    }
  };

  useEffect(() => {
    if (inputMode === 'html') {
      setActiveOutputTab(OutputTabKey.HtmlSlide);
    }
  }, [inputMode]);

  const currentError = inputMode === 'image' ? (errorArray[activeSlideIndex] || null) : null;

  const displaySlideIndex = inputMode === 'html' ? 0 : activeSlideIndex;

  // Add knowledge base loader
  const loadKnowledgeBase = async (): Promise<string> => {
    try {
      const knowledgeFiles = [
        'good_slides/json_slide/slide1.md',
        'good_slides/json_slide/slide2.md', 
        'good_slides/json_slide/slide3.md'
      ];
      
      const knowledgePromises = knowledgeFiles.map(async (filePath, index) => {
        try {
          const response = await fetch(`/${filePath}`);
          if (!response.ok) {
            console.warn(`Failed to load ${filePath}: ${response.status}`);
            return null;
          }
          const content = await response.text();
          return `
## 好事例 ${index + 1}: ${filePath.split('/').pop()?.replace('.md', '')}
\`\`\`json
${content}
\`\`\`
`;
        } catch (error) {
          console.warn(`Error loading ${filePath}:`, error);
          return null;
        }
      });

      const knowledgeResults = await Promise.all(knowledgePromises);
      const validKnowledge = knowledgeResults.filter(content => content !== null);
      
      if (validKnowledge.length === 0) {
        return '';
      }

      return `
<knowledge_base>
以下は高品質なスライド構造の実例です。これらのパターンを参考にして、提供された画像を解析してください：
${validKnowledge.join('\n')}
</knowledge_base>

`;
    } catch (error) {
      console.warn('Error loading knowledge base:', error);
      return '';
    }
  };

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
              {/* Input Mode Switch */}
              <div className="mb-4 flex items-center space-x-6">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-sky-600"
                    checked={inputMode === 'image'}
                    onChange={() => setInputMode('image')}
                  />
                  <span className="ml-2 text-slate-300 text-sm">画像アップロード</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-sky-600"
                    checked={inputMode === 'html'}
                    onChange={() => setInputMode('html')}
                  />
                  <span className="ml-2 text-slate-300 text-sm">HTML貼り付け</span>
                </label>
              </div>

              {inputMode === 'image' && (
                <>
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
                      aria-label={isOverallLoading ? '処理中' : '生成開始'}
                    >
                      {isOverallLoading && <LoadingSpinner size="sm" color="text-white" />}
                      <span className="ml-2">
                        {isOverallLoading ? '処理中...' : '生成開始'}
                      </span>
                    </button>
                  )}
                </>
              )}

              {inputMode === 'html' && (
                <HtmlPasteStep htmlText={rawHtmlInput} onHtmlTextChange={handleHtmlInputChange} />
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
          
          {inputMode === 'image' && imageFiles.length > 0 && (
            <div className="flex border-b border-slate-700 mb-4 overflow-x-auto whitespace-nowrap custom-scrollbar pb-1">
              {imageFiles.map((file, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSlideIndex(index)}
                  className={`px-4 py-3 text-sm font-medium focus:outline-none transition-colors duration-150 flex items-center shrink-0 ${
                    activeSlideIndex === index
                      ? 'border-b-2 border-sky-500 text-sky-400'
                      : 'text-slate-400 hover:text-sky-300 border-b-2 border-transparent'
                  } ${
                    (isLoadingStructureArray[index] || isLoadingHtmlArray[index]) ? 'opacity-70 cursor-wait' : ''
                  }`}
                  disabled={isLoadingStructureArray[index] || isLoadingHtmlArray[index]}
                  aria-current={activeSlideIndex === index ? 'page' : undefined}
                  title={file.name}
                >
                  スライド {index + 1}
                  {(isLoadingStructureArray[index] || isLoadingHtmlArray[index]) && (
                    <LoadingSpinner size="xs" color="text-sky-400" className="ml-2" />
                  )}
                </button>
              ))}
            </div>
          )}

          {( (inputMode === 'image' && imageFiles.length > 0 && uploadedImagePreviews[activeSlideIndex] !== undefined) ||
             (inputMode === 'html' && rawHtmlInput.trim() !== '') ) ? (
            <OutputArtifact
              activeSlideIndex={displaySlideIndex}
              structuredData={inputMode === 'html' ? null : structuredDataArray[activeSlideIndex]}
              htmlOutput={htmlOutputArray[displaySlideIndex] || ''}
              isLoadingJson={inputMode === 'html' ? false : isLoadingStructureArray[activeSlideIndex]}
              isLoadingHtml={inputMode === 'html' ? false : isLoadingHtmlArray[activeSlideIndex]}
              imagePreviewUrl={inputMode === 'image' ? uploadedImagePreviews[activeSlideIndex] : null}
              activeTab={activeOutputTab}
              onTabChange={setActiveOutputTab}
              currentThoughtStructure={inputMode === 'html' ? null : currentThoughtStructureArray[activeSlideIndex]}
              currentThoughtHtml={inputMode === 'html' ? null : currentThoughtHtmlArray[activeSlideIndex]}
              error={currentError}
              isTextEditModeActive={isTextEditModeActiveArray[displaySlideIndex] || false}
              onToggleTextEditMode={handleToggleTextEditMode}
              isComponentEditModeActive={isComponentEditModeActiveArray[displaySlideIndex] || false}
              onToggleComponentEditMode={handleToggleComponentEditMode}
              htmlFeedback={htmlFeedbackArray[displaySlideIndex] || ''}
              isFeedbackModalOpen={isFeedbackModalOpenArray[displaySlideIndex] || false}
              onOpenFeedbackModal={handleOpenFeedbackModal}
              onCloseFeedbackModal={handleCloseFeedbackModal}
              onSubmitFeedback={handleSubmitFeedback}
            />
          ) : (
            <div className="flex-grow flex items-center justify-center text-slate-500">
              {inputMode === 'image' ? (
                <p>画像をアップロードして「生成開始」をクリックしてください。</p>
              ) : (
                <p>左側にHTMLコードを貼り付けてください。</p>
              )}
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
