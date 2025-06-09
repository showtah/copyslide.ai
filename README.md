# Slide Image ⇨ HTML Slide Converter (AI-powered)

A React + Vite application that turns **static slide images** (JPEG/PNG/WebP/GIF, up to 3 at once) into **fully-editable, 16:9 HTML presentation slides**.  
It leverages **Google Gemini 2.5** to
1. extract a structured JSON representation of each slide, and
2. generate modern HTML using Tailwind CSS, Font Awesome, and Chart.js.

You can then tweak the generated slides directly in the browser, give feedback to Gemini, and export the final result in several formats.

---

## ✨ Key Features

• **Image → JSON → HTML pipeline** — run by Gemini 2.5.  
• **Live streaming UI** shows the model's *thoughts* and partial outputs as they arrive.  
• **Side-by-side tabs** for Structured Data (JSON) and Slide Code/Preview.  
• **Text edit mode** — click any textual element and edit it inline (*contenteditable*).  
• **Component edit mode** — select, drag, resize, or delete any element; edit Chart.js datasets through a GUI.  
• **Feedback workflow** — open the feedback modal, describe what to change, and trigger a regeneration that considers your notes.  
• **Export options** — download each slide as **HTML, PNG, PDF,** or **SVG** or simply copy the raw HTML code.  
• **Dark UI** built with Tailwind for a pleasant editing experience.

---

## 🛠 Prerequisites

1. **Node.js 18+** (or LTS 20).
2. **pnpm** package manager (`npm i -g pnpm`).
3. A **Gemini API key** (get one from Google AI Studio).

---

## 🚀 Run Locally

```bash
# 1. Install dependencies
pnpm install

# 2. Provide your Gemini key (never commit this file)
#    Create a file called .env.local in the project root:
#
#    GEMINI_API_KEY="your-secret-key"
#
#   Vite will expose it to the client; geminiService.ts reads it via process.env.API_KEY.

# 3. Start the dev server
pnpm run dev

# 4. Open the app
#    Vite will print the local URL (typically http://localhost:5173)
```

---

## 🎯 Basic Usage

1. **Upload images** — Click the file input (or drag-and-drop) and choose up to **3** slide screenshots.
2. Hit **Generate** — The app sends each image plus a carefully crafted prompt to Gemini.  
   • First stream: *structure extraction* → JSON appears in the *Structured Data* tab.  
   • Second stream: *HTML generation* → code + live preview appear in the *Slide Code/Preview* tab.
3. **Review / edit** —
   • Toggle **Text Edit** to change wording.  
   • Toggle **Component Edit** to drag/resize elements, delete items, or edit charts.
4. **Iterate with feedback** — Click the feedback icon 💬, describe what you want fixed, and regenerate the HTML for that slide only.
5. **Export** — Use the export icon ⬇️ to download the slide in your preferred format.

---

## ⚙️ Environment Variables

Variable | Purpose
---------|---------
`GEMINI_API_KEY` | Your Google Gemini API key. Placed in `.env.local` and automatically injected as `process.env.API_KEY` by vite.config.ts.

---

## 📦 Production Build

```bash
pnpm run build     # Bundles the app for production – output in dist/
pnpm run preview   # Serve the built files locally for a final check
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, Firebase Hosting, GitHub Pages, etc.). Ensure the `GEMINI_API_KEY` is still provided at **build time** or injected through your hosting platform's environment settings.

---

## 📝 License

MIT © 2024
