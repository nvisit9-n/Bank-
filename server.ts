import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { lookupDeepResearchContext, evaluateWithWordRankEngine } from "./src/services/deepResearchEngine.ts";

const currentDir = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url || "file:"));

dotenv.config();

const app = express();
const PORT = Number(process.env.APP_PORT || 3000);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Container Health check endpoints for Cloud Run and monitoring
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Firebase Auth Hosting Proxy (mirrors vercel.json /__/auth/* rewrites)
app.all("/__/auth/*", async (req, res) => {
  try {
    const targetUrl = `https://plasma-tribute-kf6jr.firebaseapp.com${req.originalUrl}`;
    const headers: Record<string, string> = {};
    for (const [key, val] of Object.entries(req.headers)) {
      if (typeof val === "string" && key.toLowerCase() !== "host") {
        headers[key] = val;
      }
    }
    headers["host"] = "plasma-tribute-kf6jr.firebaseapp.com";

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" && req.body 
        ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body)) 
        : undefined,
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (proxyErr) {
    console.error("Firebase Auth proxy error:", proxyErr);
    res.redirect(`https://plasma-tribute-kf6jr.firebaseapp.com${req.originalUrl}`);
  }
});

// Google OAuth Popup Callback Handler
app.get(["/auth/google/callback", "/auth/google/callback/", "/auth/callback", "/auth/callback/"], (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Google Authentication</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
          .card { text-align: center; background: white; padding: 32px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); max-width: 380px; width: 90%; border: 1px solid #e2e8f0; }
          .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="spinner"></div>
          <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 700;">Google Authentication</h2>
          <p style="margin: 0; font-size: 13px; color: #64748b;">Completing authentication. This window will close automatically...</p>
        </div>
        <script>
          try {
            const hash = window.location.hash.substring(1);
            const hashParams = new URLSearchParams(hash);
            const queryParams = new URLSearchParams(window.location.search);
            const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
            const idToken = hashParams.get('id_token') || queryParams.get('id_token');
            const code = queryParams.get('code');
            const error = queryParams.get('error') || hashParams.get('error');

            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_SUCCESS',
                payload: { accessToken, idToken, code, error }
              }, '*');
              setTimeout(() => { window.close(); }, 700);
            } else {
              window.location.href = '/';
            }
          } catch (e) {
            console.error('Error sending message to opener', e);
          }
        </script>
      </body>
    </html>
  `);
});

// Lazy initialize Gemini client
let cachedApiKey: string | null = null;
let genAI: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    ""
  ).trim();
  if (!apiKey) return null;
  if (!genAI || cachedApiKey !== apiKey) {
    cachedApiKey = apiKey;
    genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAI;
}

// AI Notes Generator endpoint
app.post("/api/generate-notes", async (req, res) => {
  try {
    const { topic, examLevel = "Assistant 4th / Officer 6th", language = "bilingual", format = "comprehensive" } = req.body;
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "Topic is required" });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are a premier senior banking faculty and exam examiner in Nepal for Nepal Rastra Bank (NRB), Rastriya Banijya Bank (RBB), Nepal Bank Limited (NBL), and Agricultural Development Bank (ADBL).
You generate highly accurate, structured, syllabus-aligned exam preparation notes in both Nepali and English (bilingual).
Notes must include:
1. "topicTitle" (Bilingual topic title)
2. "examRelevance" (Which exams & papers test this, marks weightage)
3. "summary" (Clear conceptual overview in Nepali & English)
4. "keyPoints" (Structured bullet points, legal sections/provisions like NRB Act 2058, BAFIA 2073, AML Act where applicable)
5. "formulasOrFrameworks" (Key formulas, balance sheet/capital adequacy ratios, accounting principles or analytical frameworks)
6. "practiceQuestions":
   - "subjective" (2-3 model long/short subjective questions with answer hints)
   - "mcqs" (3-4 high-yield multiple choice questions with options and explanations)
7. "examinerTip" (Special presentation tip to score top marks in Loksewa/Banking papers)

Return your response in clean JSON format matching this schema:
{
  "topicTitle": string,
  "examRelevance": string,
  "summary": string,
  "keyPoints": [string],
  "formulasOrFrameworks": [string],
  "practiceQuestions": {
    "subjective": [{ "question": string, "marks": number, "hint": string }],
    "mcqs": [{ "question": string, "options": [string], "correctIndex": number, "explanation": string }]
  },
  "examinerTip": string
}`;

    let notesData = null;
    let source = "curated";

    if (ai) {
      try {
        const prompt = `Generate comprehensive exam notes on the topic: "${topic}".
Target Exam Level: ${examLevel}
Language Preference: ${language}
Format Style: ${format}`;

        const noteModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
        for (const modelName of noteModels) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                systemInstruction,
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            });

            if (response.text) {
              notesData = JSON.parse(response.text);
              source = "gemini";
              break;
            }
          } catch (modelErr: any) {
            console.warn(`Note model ${modelName} error, trying next...`);
          }
        }
      } catch (aiErr: any) {
        console.warn("Gemini generation temporarily unavailable, falling back to curated notes:", aiErr?.message || aiErr);
      }
    }

    if (!notesData) {
      // Standard mockup data aligned with syllabus
      notesData = {
        topicTitle: `${topic} - विस्तृत परीक्षा तयारी नोट्स`,
        examRelevance: `NRB, RBB, NBL, ADBL (${examLevel}) प्रथम तथा द्वितीय पत्र विशेष`,
        summary: `यो विषय नेपालको बैंकिङ परीक्षाका लागि अति महत्त्वपूर्ण छ। परीक्षामा यसबाट सैद्धान्तिक, कानुनी तथा व्यावहारिक विश्लेषण सम्बन्धी प्रश्नहरू सोधिन्छन्।`,
        keyPoints: [
          "नेपाल राष्ट्र बैंक ऐन २०५८ र बाफिया २०७३ का सम्बद्ध व्यवस्थाहरू",
          "संस्थागत सुशासन, पुँजी पर्याप्तता तथा जोखिम व्यवस्थापनका मापदण्ड",
          "नेपालको वित्तीय क्षेत्र सुधार कार्यक्रम र मौद्रिक उपकरणहरूको कार्यान्वयन",
          "कर्जा वर्गीकरण (Pass, Watchlist, Substandard, Doubtful, Loss) र नोक्सानी व्यवस्था"
        ],
        formulasOrFrameworks: [
          "Capital Adequacy Ratio (CAR) = (Tier 1 Capital + Tier 2 Capital) / Total Risk Weighted Assets × 100%",
          "Net Interest Margin (NIM) = (Interest Income - Interest Expense) / Total Earning Assets",
          "Non-Performing Loan (NPL) Ratio = Total NPL / Total Gross Loan Portfolio × 100%",
          "Cash Reserve Ratio (CRR) = Liquid Cash Reserve / Total Domestic Deposits × 100% (हाल ४%)"
        ],
        practiceQuestions: {
          subjective: [
            {
              question: `${topic} को महत्व उल्लेख गर्दै विद्यमान चुनौती र समाधानका उपायहरू प्रस्तुत गर्नुहोस्।`,
              marks: 10,
              hint: "परिभाषा, कानुनी आधार, हालको अभ्यास, मुख्य ५ समस्या र ५ व्यावहारिक सुझाव समावेश गर्नुहोस्।"
            },
            {
              question: "बैंकिङ क्षेत्रमा संस्थागत सुशासन (Corporate Governance) को आवश्यकता र प्रभावकारिताबारे चर्चा गर्नुहोस्।",
              marks: 10,
              hint: "सञ्चालक समितिको भूमिका, जोखिम व्यवस्थापन समिति, लेखापरीक्षण र आन्तरिक नियन्त्रण प्रणाली उल्लेख गर्नुहोस्।"
            }
          ],
          mcqs: [
            {
              question: "NRB Act २०५८ अनुसार बैंकको प्रमुख उद्देश्य कुन हो?",
              options: ["मूल्य र शोधनान्तर स्थिरता कायम गर्नु", "बैंकहरूको नाफा बढाउनु", "ब्याजदर अधिकतम तोक्नु", "विदेशी विनिमय रोक्का राख्नु"],
              correctIndex: 0,
              explanation: "नेपाल राष्ट्र बैंकको मुख्य उद्देश्य मूल्य र शोधनान्तर स्थिरता कायम गरी दिगो आर्थिक विकासमा सहयोग पुर्याउनु हो।"
            },
            {
              question: "बैंक तथा वित्तीय संस्था सम्बन्धी ऐन (BAFIA) २०७३ को कुन दफामा सञ्चालकको योग्यता तोकिएको छ?",
              options: ["दफा १२", "दफा १४", "दफा १६", "दफा १८"],
              correctIndex: 2,
              explanation: "BAFIA २०७३ को दफा १६ मा बैंक तथा वित्तीय संस्थाको सञ्चालकको योग्यता र दफा १७ मा अयोग्यता सम्बन्धी व्यवस्था छ।"
            }
          ]
        },
        examinerTip: "परीक्षामा उत्तर लेख्दा सम्बन्धित ऐनको दफा, राष्ट्र बैंकको पछिल्लो एकीकृत निर्देशिका (Unified Directives) को नम्बर र स्पष्ट बुँदागत ढाँचा प्रस्तुत गर्दा उच्चतम अंक प्राप्त हुन्छ।"
      };
    }

    return res.json({ success: true, notes: notesData, source });
  } catch (err: any) {
    console.error("AI Notes Generation error:", err);
    res.status(500).json({ error: err.message || "Failed to generate notes" });
  }
});

function getAiSystemInstruction(level?: string, mode?: string, query?: string): string {
  const q = (query || "").toLowerCase();

  // Dynamic Level Detection directly from prompt keywords if not explicitly specified
  let effectiveLevel = level;
  if (!effectiveLevel || effectiveLevel === 'auto') {
    if (
      q.includes("तह ९") || q.includes("तह १०") || q.includes("level 9") || q.includes("level 10") ||
      q.includes("प्रबन्धक") || q.includes("निर्देशक") || q.includes("उप-निर्देशक") ||
      q.includes("director") || q.includes("manager") || q.includes("executive") ||
      q.includes("macro-prudential") || q.includes("म्याक्रो") || q.includes("basel")
    ) {
      effectiveLevel = "level9-10";
    } else if (
      q.includes("तह ६") || q.includes("तह ७") || q.includes("तह ८") ||
      q.includes("level 6") || q.includes("level 7") || q.includes("level 8") ||
      q.includes("अधिकृत") || q.includes("officer") || q.includes("वरिष्ठ अधिकृत") ||
      q.includes("शाखा अधिकृत") || q.includes("सहायक प्रबन्धक") || q.includes("नीतिगत") ||
      q.includes("सुशासन") || q.includes("governance")
    ) {
      effectiveLevel = "level6-8";
    } else if (
      q.includes("तह ४") || q.includes("तह ५") || q.includes("level 4") || q.includes("level 5") ||
      q.includes("सहायक") || q.includes("assistant") || q.includes("खरिदार") || q.includes("नासु") || q.includes("नायब सुब्बा")
    ) {
      effectiveLevel = "level4-5";
    }
  }

  let levelContext = `
- **तह ४-५ (सहायक तह):** आधारभूत अवधारणा, ऐन कानुनका प्रत्यक्ष दफा (NRB, BAFIA, Company Act), स्पष्ट बुँदागत उत्तर, संक्षिप्त परिभाषा र चरणबद्ध सरल हिसाबलाई प्राथमिकता दिनुहोस्।`;

  if (effectiveLevel === 'level6-8') {
    levelContext = `
- **तह ६-८ (अधिकृत तह):** नीतिगत विश्लेषण, वित्तीय जोखिम व्यवस्थापन (क्रेडिट, अपरेसनल, तरलता, बजार जोखिम), संस्थागत सुशासन, तुलनात्मक विश्लेषण र व्यावहारिक नीतिगत सिफारिसहरू प्रस्तुत गर्नुहोस्।`;
  } else if (effectiveLevel === 'level9-10') {
    levelContext = `
- **तह ९-१० (व्यवस्थापकीय/प्रबन्धक तह):** म्याक्रो-प्रुडेन्सियल नियमन, समग्र वित्तीय स्थायित्व (Financial Stability), उच्च-स्तरीय नीति निर्माण, अन्तर्राष्ट्रिय मापदण्डहरू (Basel III, FATF Recommendations) र संकट व्यवस्थापन रणनीतिहरू प्रस्तुत गर्नुहोस्।`;
  } else {
    levelContext = `
- **गतिशील परीक्षा गहिराइ:** प्रश्नको स्तर र शब्दावली अनुसार उपयुक्त प्राज्ञिक गहिराइ र मानक प्रस्तुति दिनुहोस्।`;
  }

  let answerSheetInstructions = '';
  if (mode === 'answer_sheet') {
    answerSheetInstructions = `
[हस्तलिखित उत्तरपुस्तिका मूल्याङ्कन (Word Rank Engine & Multimodal Evaluation)]:
तपाईंले संलग्न हस्तलिखित उत्तरपुस्तिका वा परीक्षार्थीको उत्तरको सूक्ष्म परीक्षण गरी देहाय बमोजिम "Word Rank Engine" ढाँचामा नतिजा प्रस्तुत गर्नुपर्छ:

### 📊 Word Rank मूल्याङ्कन स्कोरकार्ड (१० अङ्क योजना)
- **प्राप्ताङ्क (Score):** X.X/१० अंक
- **शब्दावली स्तर (Vocabulary Rank):** उच्च (High) / मध्यम (Medium) / सामान्य (Basic)
- **विषयवस्तु सान्दर्भिकता (Context Relevance):** XX%
- **उत्तरमा प्रयोग भएका कानुनी तथा प्राविधिक शब्दहरू:** [पहिचान भएका शब्द तथा दफाहरू]
- **छुटेका महत्त्वपूर्ण शब्द तथा दफा (Missing Key Terms):** [परीक्षार्थीले समावेश गर्नुपर्ने दफा वा प्राविधिक शब्दहरू जसले अंक बढाउँछ]
- **प्रस्तुतीकरण ढाँचा (Structure):** [उत्कृष्ट / सन्तोषजनक / सुधार आवश्यक]

### ✅ सबल पक्षहरू (Key Strengths)
[उत्तरमा रहेका २-३ मुख्य राम्रा बुँदाहरू]

### ⚠️ कमजोरीहरू तथा सुधार गर्नुपर्ने पक्षहरू (Weaknesses & Missing Elements)
[अंक काटिएका स्पष्ट कारणहरू तथा छुटेका बुँदाहरू]

### 🎯 उच्चतम अङ्क प्राप्त गर्ने सूत्र (Step-by-Step Guidance)
[लोकसेवा तथा बैंकिङ परीक्षामा ९+ अंक ल्याउन परीक्षकलाई मनपर्ने व्यावहारिक लेखन सूत्र]`;
  }

  return `तपाईं नेपालको बैंकिङ (NRB, RBB, NBL, ADBL), लोकसेवा आयोग र सार्वजनिक संस्थान (EPF, CIT, SSF, NEA, NTC, NOC लगायत ४५+ संस्थान) तथा व्यवस्थापन संकाय (BBS, BBA, MBS, +2) का लागि आधिकारिक, उच्च प्राज्ञिक र बौद्धिक AI अध्ययन मेन्टर हुनुहुन्छ।

तपाईंको कार्यशैली official Gemini 1.5 Pro र ChatGPT-4o जस्तै प्रत्यक्ष, प्राकृतिक, सटीक, गहिरो र तार्किक हुनुपर्छ।

[कडा निर्देशिकाहरू (STRICT INSTRUCTIONS)]:
१. **शून्य साँचो बाध्यता र प्रत्यक्ष उत्तर (ZERO TEMPLATE FORCING & DIRECT REASONING):**
   - प्रयोगकर्ताको प्रश्नमा सिधै केन्द्रित हुनुहोस्। कुनै पनि कृत्रिम, दोहोरिने वा जबरजस्ती ढाँचा (जस्तै: "१. सैद्धान्तिक अवधारणा र परिभाषा" वा निश्चित पूर्व-निर्धारित शीर्षकहरू) कहिल्यै नथोप्नुहोस्।
   - प्रश्न छोटो वा एकल शब्द (जस्तै: "epf", "cit", "crr", "bafia", "cost curve") भए पनि, त्यसको परिचय, स्थापना, कानुनी व्यवस्था, कार्य सञ्चालन, तथ्याङ्क र औचित्यलाई प्राकृतिक, सुसङ्गत र धाराप्रवाह रूपमा विस्तृत रूपमा व्याख्या गर्नुहोस्।
   - कहिल्यै पनि सतही, अधुरो, सामान्य वा छोटो जवाफ नदिनुहोस्। लोकसेवा र बैंकिङ परीक्षाको उच्चतम गुणस्तर कायम राख्दै गहिरो, पूर्ण र विश्लेषणात्मक सामग्री दिनुहोस्।

२. **नेपाल लोकसेवा, बैंकिङ र संस्थानहरूको गहिरो सन्दर्भ (LEGAL ACTS & ECONOMIC INDICATORS):**
   - वित्तीय, व्यवस्थापकीय, बैंकिङ वा संस्थान सम्बन्धी प्रश्नहरूमा सम्बद्ध कानुनी ऐनहरू (जस्तै: नेपाल राष्ट्र बैंक ऐन २०५८, बैंक तथा वित्तीय संस्था सम्बन्धी ऐन २०७३ [BAFIA], कम्पनी ऐन २०६३, सार्वजनिक खरिद ऐन २०६३, सम्पत्ति शुद्धीकरण निवारण ऐन २०६४) का सान्दर्भिक दफाहरू, राष्ट्र बैंकका पछिल्ला एकीकृत निर्देशनहरू (Unified Directives), र समष्टिगत आर्थिक सूचकहरू (GDP वृद्धि, उपभोक्ता मुद्रास्फीति, शोधनान्तर स्थिति, विदेशी विनिमय सञ्चिति, CRR, SLR, Base Rate, Spreads, र NPL अनुपात) लाई स्वतः र प्रामाणिक रूपमा उत्तरमा समावेश गर्नुहोस्।
   - नेपालका ४५+ सार्वजनिक संस्थानहरूको अध्ययनमा तिनीहरूको कानुनी ऐन, सञ्चालक समिति संरचना, पुँजी, कार्यक्षेत्र र मुख्य चुनौतीहरू यथार्थपरक रूपमा प्रस्तुत गर्नुहोस्।

३. **अनुरोध नगरिएका "Exam Tip" वा सुझाव निषेध (NO UNREQUESTED EXAM TIPS):**
   - उत्तरको अन्त्यमा अनुरोध नगरिएको "मेन्टरको सुझाव", "Exam Tip", वा "परीक्षा सुझाव" शीर्षकको कुनै पनि खण्ड राख्न सख्त मनाही छ। प्रयोगकर्ताले स्पष्ट रूपमा सुझाव वा टिप्स मागेको अवस्थामा बाहेक यो खण्ड कहिल्यै नथप्नुहोस्।

४. **प्रवर्धनात्मक वा फलो-अप प्रश्न निषेध (NO FOLLOW-UP PROMPTS):**
   - उत्तरको अन्त्यमा "तपाईंलाई अरू केही जान्न मन छ?", "थप प्रश्न सोध्न सक्नुहुन्छ", वा यस्तै कुनै पनि फलो-अप वाक्य नराख्नुहोस्। विषयवस्तुको सम्पूर्ण विवरण दिएपछि सिधै रोकिनुहोस्।

५. **अर्थशास्त्रका रेखाचित्र तथा तुलनात्मक तालिकाहरू (CLEAN SVG & TABLES):**
   - जब अर्थशास्त्र (माग र पूर्ति सन्तुलन, अल्पकालीन तथा दीर्घकालीन लागत वक्र AFC/AVC/ATC/MC, बजार संरचना, कार्टेलिङ, एकाधिकार Deadweight Loss आदि) बारे सोधिन्छ, स्पष्ट र सुन्दर SVG Code वा ASCII Diagram र तुलनात्मक Markdown तालिका अनिवार्य समावेश गर्नुहोस्।

६. **गणित तथा हिसाब (Accounting & Numericals):**
   - गणित, बैंकिङ हिसाब वा लेखाका प्रश्नमा स्पष्ट सूत्र (Formula), चरणबद्ध गणना (Step-by-step), र अन्तिम उत्तर स्पष्ट रूपमा दिनुहोस्।

[लक्षित परीक्षा तह र गहिराइ]:${levelContext}
${answerSheetInstructions}

[भाषा शैली]:
- शुद्ध, व्याकरणसम्मत, तथ्यपरक र उच्च प्राज्ञिक नेपाली भाषा (वा प्रयोगकर्ताले अंग्रेजीमा सोधेमा परिष्कृत अंग्रेजी) मा प्राकृतिक र आत्मविश्वासपूर्ण संवाद शैलीमा उत्तर दिनुहोस्।`;
}

const AI_ASSISTANT_SYSTEM_INSTRUCTION = getAiSystemInstruction();

function buildGeminiContents(
  cleanQuery: string,
  history?: Array<{ sender: 'user' | 'ai'; text: string }>,
  attachment?: { data: string; mimeType: string; name?: string }
) {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<any> }> = [];
  if (Array.isArray(history) && history.length > 0) {
    const validHistory = history
      .filter(h => h && typeof h.text === 'string' && h.text.trim())
      .slice(-10);
    for (const item of validHistory) {
      const role: 'user' | 'model' = item.sender === 'user' ? 'user' : 'model';
      // Gemini multiturn conversation must start with 'user'
      if (contents.length === 0 && role === 'model') {
        continue;
      }
      // Strictly alternate: merge if consecutive turns have identical role
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n\n${item.text.trim()}`;
      } else {
        contents.push({
          role,
          parts: [{ text: item.text.trim() }]
        });
      }
    }
  }

  let promptText = cleanQuery;
  const userParts: any[] = [];

  if (attachment && attachment.data) {
    const rawData = attachment.data;
    const cleanBase64 = rawData.replace(/^data:[a-zA-Z0-9.+/-]+;base64,/, '').trim();
    const isPdf = (attachment.mimeType && attachment.mimeType.toLowerCase().includes('pdf')) ||
                  (attachment.name && attachment.name.toLowerCase().endsWith('.pdf')) ||
                  rawData.startsWith('data:application/pdf');
    const resolvedMime = isPdf ? 'application/pdf' : (attachment.mimeType || 'image/jpeg');

    userParts.push({
      inlineData: {
        mimeType: resolvedMime,
        data: cleanBase64
      }
    });

    if (isPdf) {
      const pdfPrompt = promptText || "कृपया संलग्न PDF दस्तावेजको अध्ययन गरी यसको मुख्य सार तथा महत्वपूर्ण विषयवस्तुहरू स्पष्टसँग प्रस्तुत गर्नुहोस्।";
      userParts.push({
        text: `[संलग्न PDF दस्तावेज: ${attachment.name || 'document.pdf'}]\n${pdfPrompt}`
      });
    } else {
      const imgPrompt = promptText || "कृपया यस तस्बिरमा भएको सामग्री अध्ययन गरी स्पष्ट समाधान वा व्याख्या प्रस्तुत गर्नुहोस्।";
      userParts.push({
        text: `[संलग्न तस्बिर: ${attachment.name || 'image.jpg'}]\n${imgPrompt}`
      });
    }
  } else {
    userParts.push({
      text: promptText
    });
  }

  if (contents.length > 0 && contents[contents.length - 1].role === 'user' && (!attachment || !attachment.data)) {
    contents[contents.length - 1].parts.push(...userParts);
  } else {
    contents.push({
      role: 'user',
      parts: userParts
    });
  }

  return contents;
}

function getPedagogicalKnowledgeText(cleanQuery: string, mode?: string): string {
  // 1. If evaluating an answer sheet, use the Word Rank Engine
  if (mode === 'answer_sheet') {
    const evaluation = evaluateWithWordRankEngine(cleanQuery);
    return `### 📊 Word Rank मूल्याङ्कन स्कोरकार्ड (१० अङ्क योजना)
- **प्राप्ताङ्क (Score):** ${evaluation.score}/१० अंक
- **शब्दावली स्तर (Vocabulary Rank):** ${evaluation.vocabularyRank}
- **विषयवस्तु सान्दर्भिकता (Context Relevance):** ${evaluation.relevanceScore}
- **उत्तरमा प्रयोग भएका कानुनी तथा प्राविधिक शब्दहरू:** ${evaluation.legalTermsUsed.length > 0 ? evaluation.legalTermsUsed.join(', ') : 'सामान्य शब्दावली मात्र'}
- **छुटेका महत्त्वपूर्ण शब्द तथा दफा (Missing Key Terms):** ${evaluation.missingKeyTerms.join(', ')} (यी शब्द थप्दा अङ्क स्वतः बढ्छ)
- **प्रस्तुतीकरण ढाँचा (Structure Rating):** ${evaluation.structureRating}

---

### ✅ सबल पक्षहरू (Key Strengths)
${evaluation.strengths.map(s => `- ${s}`).join('\n')}

---

### ⚠️ कमजोरीहरू तथा सुधार गर्नुपर्ने पक्षहरू (Weaknesses & Missing Elements)
${evaluation.weaknesses.map(w => `- ${w}`).join('\n')}

---

### 🎯 उच्चतम अङ्क प्राप्त गर्ने सूत्र (Step-by-Step Guidance)
${evaluation.guidanceTips.map(t => `1. ${t}`).join('\n')}`;
  }

  // 2. Check curated Deep Knowledge Base (EPF, CIT, SSF, NRB, BAFIA, AML, Economics, etc.)
  const deepMatch = lookupDeepResearchContext(cleanQuery);
  if (deepMatch) {
    return deepMatch;
  }

  const q = cleanQuery.toLowerCase();
  if (q.includes("व्यवस्थापन") || q.includes("management") || q.includes("hrm") || q.includes("नेतृत्व") || q.includes("योजना")) {
    return `**व्यवस्थापन सिद्धान्त तथा कार्यहरू (Management Principles & Functions):**

व्यवस्थापन भनेको संगठनको निर्धारित उद्देश्य प्राप्तिका लागि उपलब्ध स्रोत-साधनहरू (मानव, पुँजी, सामग्री र प्रविधि) को मितव्ययी, कार्यदक्ष र प्रभावकारी परिचालन गर्ने कला र विज्ञान हो।

### १. व्यवस्थापनका प्रमुख आधारभूत कार्यहरू (POSDCORB)
- **योजना (Planning):** लक्ष्य निर्धारण र लक्ष्य प्राप्तिको रणनीतिक कार्यदिशा तय गर्ने।
- **संगठन (Organizing):** जिम्मेवारी, अधिकार र स्रोत-साधनको व्यवस्थित संरचना निर्माण।
- **कर्मचारी व्यवस्था (Staffing):** योग्य जनशक्तिको छनोट, पदस्थापन, तालिम र वृत्ति विकास।
- **निर्देशन तथा नेतृत्व (Directing & Leadership):** उत्प्रेरणा, मार्गदर्शन र प्रभावकारी सञ्चार।
- **समन्वय र नियन्त्रण (Coordinating & Controlling):** कार्यसम्पादनको मापन र सुधारात्मक कदम।

### २. आधुनिक व्यवस्थापकीय औजारहरू
- **कुल गुणस्तर व्यवस्थापन (TQM):** निरन्तर सुधार र ग्राहक सन्तुष्टि।
- **संस्थागत सुशासन (Corporate Governance):** पारदर्शिता, जवाफदेहिता र कानुनी परिपालना।
- **व्यवस्थापन सूचना प्रणाली (MIS):** तथ्याङ्कमा आधारित छिटो र सटिक निर्णय प्रक्रिया।`;
  }

  if (q.includes("अर्थतन्त्र") || q.includes("economics") || q.includes("मुद्रास्फीति") || q.includes("gdp") || q.includes("बजेट") || q.includes("शोधानान्तर") || q.includes("शोधनान्तर")) {
    return `**नेपाली अर्थतन्त्रका आधारभूत सूचकहरू (Macroeconomic Indicators):**

### १. कुल गार्हस्थ उत्पादन (GDP) र संरचना
- एक आर्थिक वर्षमा देशको भौगोलिक सीमाभित्र उत्पादित सम्पूर्ण अन्तिम वस्तु तथा सेवाहरूको बजार मूल्य।
- **क्षेत्रगत योगदान:** सेवा क्षेत्र (करिब ६२-६३%), कृषि क्षेत्र (करिब २४%), र उद्योग क्षेत्र (करिब १३-१४%)।

### २. मुद्रास्फीति (Inflation) र मूल्य नियन्त्रण
- सामान्य मूल्यस्तरमा हुने निरन्तर वृद्धिलाई मुद्रास्फीति भनिन्छ।
- नेपालको मुद्रास्फीतिमा आन्तरिक आपूर्ति व्यवस्था र भारतीय बजारको आयातीत मूल्यस्तर (Imported Inflation) को प्रत्यक्ष प्रभाव रहन्छ।

### ३. शोधनान्तर स्थिति (BOP) र विदेशी विनिमय सञ्चिति
- देशको बाह्य क्षेत्र स्थायित्वको सूचक। रेमिट्यान्स (विप्रेषण) आप्रवाहले शोधनान्तर बचत र विदेशी मुद्रा सञ्चिति धान्न निर्णायक भूमिका खेल्दछ।`;
  }

  // 3. Dynamic responsive output for general inquiry without forced template headers
  return `**"${cleanQuery}" सम्बन्धी आधिकारिक अध्ययन टिपोट:**

बैंकिङ, लोकसेवा तथा संस्थान परीक्षाको पाठ्यक्रम अनुसार यस विषयले महत्वपूर्ण स्थान ओगटेको छ।

### १. मुख्य अवधारणा र चुरो कुरा
- यस विषयको प्राथमिक उद्देश्य संगठनात्मक प्रभावकारिता, वित्तीय सुशासन र सेवा प्रवाहलाई पारदर्शी एवं नतिजामूलक बनाउनु हो।
- परीक्षामा यसबाट सैद्धान्तिक अवधारणा, विद्यमान ऐन/कानुनका व्यवस्था र समसामयिक समस्या समाधान सम्बन्धी प्रश्नहरू सोधिन्छन्।

### २. प्रमुख बुँदाहरू र तथ्यगत जानकारी
- **कानुनी तथा नीतिगत आधार:** नेपालको संविधान, सम्बन्धित निकायको ऐन, नियमावली र नेपाल राष्ट्र बैंकका एकीकृत निर्देशनहरू।
- **संस्थागत अभ्यास:** कार्यसम्पादन सम्झौता, जोखिम व्यवस्थापन र डिजिटल प्रविधिमैत्री सेवा प्रवाह।
- **सुधारका क्षेत्रहरू:** जनशक्तिको क्षमता विकास, आन्तरिक नियन्त्रण प्रणालीको सुदृढीकरण र नतिजामुखी अनुगमन।`;
}

// Real-time ChatGPT/Gemini Style Streaming Endpoint with SSE
app.post("/api/ai-assistant-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const { query, history, image, attachment, level, mode } = req.body || {};
  const activeAttachment = attachment || (image && image.data ? { data: image.data, mimeType: image.mimeType || 'image/jpeg', name: 'image.jpg' } : undefined);

  let cleanQuery = typeof query === "string" ? query.trim() : "";
  if (!cleanQuery && activeAttachment && activeAttachment.data) {
    const isPdf = activeAttachment.mimeType?.includes('pdf') || activeAttachment.name?.toLowerCase().endsWith('.pdf');
    if (mode === 'answer_sheet') {
      cleanQuery = "कृपया यस संलग्न हस्तलिखित उत्तरपुस्तिकाको गहिरो परीक्षण गरी १० अंकमा प्राप्ताङ्क (Score), सबल पक्ष, कमजोरी र लोकसेवा/बैंकिङ परीक्षामा उच्चतम अंक प्राप्त गर्ने व्यावहारिक सुधार टिप्ससहित स्पष्ट मूल्याङ्कन प्रस्तुत गर्नुहोस्।";
    } else {
      cleanQuery = isPdf
        ? "कृपया यस संलग्न PDF दस्तावेजको अध्ययन गरी यसको मुख्य सार तथा महत्वपूर्ण विषयवस्तुहरू स्पष्टसँग प्रस्तुत गर्नुहोस्।"
        : "कृपया यस संलग्न तस्बिरमा भएको सामग्री अध्ययन गरी स्पष्ट समाधान वा विश्लेषण प्रस्तुत गर्नुहोस्।";
    }
  }

  if (!cleanQuery && (!activeAttachment || !activeAttachment.data)) {
    res.write(`data: ${JSON.stringify({ error: "Query, PDF or image is required" })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    return res.end();
  }

  const ai = getGeminiClient();
  const effectiveSystemInstruction = getAiSystemInstruction(level, mode, cleanQuery);

  let isClientClosed = false;
  req.on("close", () => {
    isClientClosed = true;
  });

  if (ai) {
    const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
    const contents = buildGeminiContents(cleanQuery, history, activeAttachment);

    for (const modelName of candidateModels) {
      if (isClientClosed) break;
      try {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config: {
            systemInstruction: effectiveSystemInstruction,
            temperature: 0.3
          }
        });

        let streamedCount = 0;
        for await (const chunk of stream) {
          if (isClientClosed) break;

          // Robust chunk text extraction (handles both chunk.text and part arrays)
          let chunkText = chunk.text;
          if (!chunkText && (chunk as any).candidates?.[0]?.content?.parts) {
            for (const part of (chunk as any).candidates[0].content.parts) {
              if (part.text && !part.thought) {
                chunkText = (chunkText || '') + part.text;
              }
            }
          }

          if (chunkText) {
            streamedCount++;
            res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
            if (typeof (res as any).flush === 'function') {
              (res as any).flush();
            }
          }
        }

        if (streamedCount > 0 && !isClientClosed) {
          res.write(`data: [DONE]\n\n`);
          return res.end();
        }
      } catch (geminiErr: any) {
        const statusCode = geminiErr?.status || geminiErr?.code || 503;
        console.log(`[AI Assistant Notice] Model ${modelName} temporary load status (${statusCode}), trying next model...`);
      }
    }
  }

  // If Gemini models could not stream or client is still connected, provide rich pedagogical fallback
  if (!isClientClosed) {
    const fallbackAnswer = getPedagogicalKnowledgeText(cleanQuery, mode);
    res.write(`data: ${JSON.stringify({ chunk: fallbackAnswer })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

// AI Study Assistant (AI साथी) non-streaming endpoint for unlimited queries
app.post("/api/ai-assistant", async (req, res) => {
  try {
    const { query, history, image, attachment, level, mode } = req.body || {};
    const activeAttachment = attachment || (image && image.data ? { data: image.data, mimeType: image.mimeType || 'image/jpeg', name: 'image.jpg' } : undefined);

    let cleanQuery = typeof query === "string" ? query.trim() : "";
    if (!cleanQuery && activeAttachment && activeAttachment.data) {
      const isPdf = activeAttachment.mimeType?.includes('pdf') || activeAttachment.name?.toLowerCase().endsWith('.pdf');
      if (mode === 'answer_sheet') {
        cleanQuery = "कृपया यस संलग्न हस्तलिखित उत्तरपुस्तिकाको गहिरो परीक्षण गरी १० अंकमा प्राप्ताङ्क (Score), सबल पक्ष, कमजोरी र लोकसेवा/बैंकिङ परीक्षामा उच्चतम अंक प्राप्त गर्ने व्यावहारिक सुधार टिप्ससहित स्पष्ट मूल्याङ्कन प्रस्तुत गर्नुहोस्।";
      } else {
        cleanQuery = isPdf
          ? "कृपया यस संलग्न PDF दस्तावेजको अध्ययन गरी यसको मुख्य सार तथा महत्वपूर्ण विषयवस्तुहरू स्पष्टसँग प्रस्तुत गर्नुहोस्।"
          : "कृपया यस संलग्न तस्बिरमा भएको सामग्री अध्ययन गरी स्पष्ट समाधान वा विश्लेषण प्रस्तुत गर्नुहोस्।";
      }
    }

    if (!cleanQuery && (!activeAttachment || !activeAttachment.data)) {
      return res.status(400).json({ error: "Query, PDF or image is required" });
    }

    const ai = getGeminiClient();
    const effectiveSystemInstruction = getAiSystemInstruction(level, mode, cleanQuery);

    if (ai) {
      const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
      const contents = buildGeminiContents(cleanQuery, history, activeAttachment);

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction: effectiveSystemInstruction,
              temperature: 0.3
            },
          });

          if (response.text && response.text.trim()) {
            return res.json({
              success: true,
              source: "gemini",
              model: modelName,
              answer: response.text.trim()
            });
          }
        } catch (geminiErr: any) {
          const statusCode = geminiErr?.status || geminiErr?.code || 503;
          console.log(`[AI Assistant Notice] Model ${modelName} temporary load status (${statusCode}), switching to next model...`);
        }
      }
    }

    const pedagogicalAnswer = getPedagogicalKnowledgeText(cleanQuery, mode);
    return res.json({
      success: true,
      source: "local-pedagogy",
      model: "offline-topper-mentor",
      answer: pedagogicalAnswer
    });
  } catch (err: any) {
    console.error("AI Assistant error:", err);
    res.status(500).json({ error: err.message || "Failed to generate AI assistant response" });
  }
});

// User Activity & Download & Exam Score Tracking APIs
const userActivitiesList: any[] = [];
const downloadEventsList: any[] = [];
const examScoresList: any[] = [];
const examSubmissionsList: any[] = [];

app.post("/api/tracking/activity", (req, res) => {
  const record = req.body;
  if (record && record.userId) {
    userActivitiesList.unshift(record);
    if (userActivitiesList.length > 500) userActivitiesList.pop();
  }
  res.json({ success: true });
});

app.get("/api/tracking/activities", (_req, res) => {
  res.json({ success: true, activities: userActivitiesList });
});

app.post("/api/tracking/download", (req, res) => {
  const record = req.body;
  if (record && record.userId) {
    downloadEventsList.unshift(record);
    if (downloadEventsList.length > 500) downloadEventsList.pop();
  }
  res.json({ success: true });
});

app.get("/api/tracking/downloads", (_req, res) => {
  res.json({ success: true, downloads: downloadEventsList });
});

app.post("/api/tracking/exam-score", (req, res) => {
  const record = req.body;
  if (record && record.userId) {
    examScoresList.unshift(record);
    if (examScoresList.length > 500) examScoresList.pop();
  }
  res.json({ success: true });
});

app.get("/api/tracking/exam-scores", (_req, res) => {
  res.json({ success: true, scores: examScoresList });
});

app.post("/api/tracking/exam-submission", (req, res) => {
  const record = req.body;
  if (record && (record.userId || record.id)) {
    examSubmissionsList.unshift(record);
    if (examSubmissionsList.length > 500) examSubmissionsList.pop();
  }
  res.json({ success: true });
});

app.get("/api/tracking/exam-submissions", (_req, res) => {
  res.json({ success: true, submissions: examSubmissionsList });
});

app.post("/api/tracking/global-exam-result", (req, res) => {
  const record = req.body;
  if (record && (record.userId || record.id)) {
    const exists = examSubmissionsList.some(r => r.id === record.id);
    if (!exists) {
      examSubmissionsList.unshift(record);
      if (examSubmissionsList.length > 500) examSubmissionsList.pop();
    }
  }
  res.json({ success: true });
});

app.get("/api/tracking/global-exam-results", (_req, res) => {
  res.json({ success: true, results: examSubmissionsList });
});

// =========================================================================
// MANDATORY GLOBAL DATABASE TABLES: registered_users & user_activity_logs
// Real-time backend persistence with disk storage for Admin CMS & tracking
// =========================================================================
const DB_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DB_DIR)) {
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
  } catch (err) {
    console.warn("Could not create DB_DIR:", err);
  }
}

const TRACKING_USERS_DB_FILE = path.join(DB_DIR, "registered_users.json");
const LOGS_DB_FILE = path.join(DB_DIR, "user_activity_logs.json");

interface DbRegisteredUser {
  id: string;
  name: string;
  displayName: string;
  email: string;
  photoURL?: string;
  district?: string;
  province?: string;
  targetExam?: string;
  totalLogins: number;
  pagesVisited: string[];
  lastPageVisited?: string;
  testsTaken: number;
  isYouTubeSubscribed: boolean;
  lastLoginAt: string;
  lastActive: string;
  device: string;
  browser: string;
  registeredAt: string;
  totalXp: number;
  isPro: boolean;
  entryStatus: string;
}

interface DbUserActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  activityType: string;
  action: string;
  details: string;
  page?: string;
  device: string;
  browser: string;
  isYouTubeSubscribed: boolean;
  timestamp: string;
  metadata?: Record<string, any>;
}

// In-memory caches backed by disk
const registeredUsersMap = new Map<string, DbRegisteredUser>();
let userActivityLogsList: DbUserActivityLog[] = [];

// Load from disk on boot
try {
  if (fs.existsSync(TRACKING_USERS_DB_FILE)) {
    const raw = fs.readFileSync(TRACKING_USERS_DB_FILE, "utf-8");
    const arr: DbRegisteredUser[] = JSON.parse(raw);
    if (Array.isArray(arr)) {
      for (const u of arr) {
        const key = (u.email ? u.email.toLowerCase() : u.id) || u.id;
        if (key) registeredUsersMap.set(key, u);
      }
    }
  }
} catch (e) {
  console.warn("Failed to read TRACKING_USERS_DB_FILE:", e);
}

try {
  if (fs.existsSync(LOGS_DB_FILE)) {
    const raw = fs.readFileSync(LOGS_DB_FILE, "utf-8");
    const arr: DbUserActivityLog[] = JSON.parse(raw);
    if (Array.isArray(arr)) {
      userActivityLogsList = arr.slice(0, 5000);
    }
  }
} catch (e) {
  console.warn("Failed to read LOGS_DB_FILE:", e);
}

let saveUsersTimeout: NodeJS.Timeout | null = null;
function persistUsersToDisk() {
  if (saveUsersTimeout) clearTimeout(saveUsersTimeout);
  saveUsersTimeout = setTimeout(() => {
    try {
      const arr = Array.from(registeredUsersMap.values());
      fs.writeFileSync(TRACKING_USERS_DB_FILE, JSON.stringify(arr, null, 2), "utf-8");
    } catch (err) {
      console.warn("Error saving users to disk:", err);
    }
  }, 300);
}

let saveLogsTimeout: NodeJS.Timeout | null = null;
function persistLogsToDisk() {
  if (saveLogsTimeout) clearTimeout(saveLogsTimeout);
  saveLogsTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(LOGS_DB_FILE, JSON.stringify(userActivityLogsList.slice(0, 5000), null, 2), "utf-8");
    } catch (err) {
      console.warn("Error saving logs to disk:", err);
    }
  }, 300);
}

// 1. Log an activity row directly to database and auto-update registered_users
app.post("/api/user-tracking/log", (req, res) => {
  try {
    const b = req.body || {};
    const userId = b.userId || (b.userEmail ? `usr-${b.userEmail.split('@')[0]}` : `guest-${Date.now()}`);
    const email = (b.userEmail || '').trim().toLowerCase();
    const name = b.userName || b.name || (email ? email.split('@')[0] : 'परीक्षार्थी');
    const device = b.device || 'Desktop';
    const browser = b.browser || 'Unknown';
    const page = b.page || 'गृहपृष्ठ';
    const activityType = b.activityType || 'page_view';
    const action = b.action || b.details || 'क्रियाकलाप';
    const details = b.details || action;
    const isYouTubeSubscribed = Boolean(b.isYouTubeSubscribed);
    const timestamp = b.timestamp || new Date().toISOString();

    const logRecord: DbUserActivityLog = {
      id: b.id || `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      userName: name,
      userEmail: email,
      activityType,
      action,
      details,
      page,
      device,
      browser,
      isYouTubeSubscribed,
      timestamp,
      metadata: b.metadata || {}
    };

    userActivityLogsList.unshift(logRecord);
    if (userActivityLogsList.length > 5000) userActivityLogsList.pop();
    persistLogsToDisk();

    // Auto-update or create registered_users entry
    const userKey = email || userId;
    let existing = registeredUsersMap.get(userKey);

    if (!existing) {
      const isGoogle = email.includes('@gmail.com');
      existing = {
        id: userId,
        name,
        displayName: name,
        email,
        photoURL: b.photoURL || '',
        district: b.district || 'काठमाडौँ',
        province: b.province || 'बागमती प्रदेश',
        targetExam: b.targetExam || 'नेपाल राष्ट्र बैंक - सहायक ४',
        totalLogins: activityType === 'login' ? 1 : 1,
        pagesVisited: [page],
        lastPageVisited: page,
        testsTaken: activityType === 'quiz_complete' ? 1 : 0,
        isYouTubeSubscribed,
        lastLoginAt: activityType === 'login' ? timestamp : timestamp,
        lastActive: timestamp,
        device,
        browser,
        registeredAt: timestamp,
        totalXp: b.totalXp || 150,
        isPro: Boolean(b.isPro),
        entryStatus: b.isPro ? 'प्रो सक्रिय' : (isGoogle ? 'Google प्रमाणीकृत' : 'सक्रिय')
      };
    } else {
      existing.lastActive = timestamp;
      existing.device = device;
      existing.browser = browser;
      if (name && name !== 'परीक्षार्थी' && existing.name === 'परीक्षार्थी') {
        existing.name = name;
        existing.displayName = name;
      }
      if (b.photoURL && !existing.photoURL) existing.photoURL = b.photoURL;
      if (b.district && existing.district === 'काठमाडौँ') existing.district = b.district;
      if (b.province) existing.province = b.province;
      if (b.targetExam) existing.targetExam = b.targetExam;
      if (b.totalXp) existing.totalXp = Math.max(existing.totalXp, b.totalXp);
      if (b.isPro) existing.isPro = true;

      if (activityType === 'login') {
        existing.totalLogins = (existing.totalLogins || 0) + 1;
        existing.lastLoginAt = timestamp;
      }
      if (activityType === 'quiz_complete') {
        existing.testsTaken = (existing.testsTaken || 0) + 1;
      }
      if (isYouTubeSubscribed) {
        existing.isYouTubeSubscribed = true;
      }
      if (page) {
        if (!existing.pagesVisited) existing.pagesVisited = [];
        if (!existing.pagesVisited.includes(page)) {
          existing.pagesVisited.push(page);
        }
        existing.lastPageVisited = page;
      }
    }

    registeredUsersMap.set(userKey, existing);
    persistUsersToDisk();

    res.json({ success: true, log: logRecord, user: existing });
  } catch (err: any) {
    console.warn("Error in /api/user-tracking/log:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Explicitly upsert a registered_user
app.post("/api/user-tracking/sync-user", (req, res) => {
  try {
    const b = req.body || {};
    const email = (b.email || '').trim().toLowerCase();
    const userId = b.id || b.authUid || (email ? `usr-${email.split('@')[0]}` : `guest-${Date.now()}`);
    const userKey = email || userId;
    const name = b.displayName || b.name || (email ? email.split('@')[0] : 'परीक्षार्थी');
    const timestamp = new Date().toISOString();

    let existing = registeredUsersMap.get(userKey);
    const isGoogle = email.includes('@gmail.com') || b.authProvider === 'google' || Boolean(b.isGoogleUser);

    if (!existing) {
      existing = {
        id: userId,
        name,
        displayName: name,
        email,
        photoURL: b.photoURL || b.avatarUrl || '',
        district: b.district || 'काठमाडौँ',
        province: b.province || 'बागमती प्रदेश',
        targetExam: b.targetExam || 'नेपाल राष्ट्र बैंक - सहायक ४',
        totalLogins: b.totalLogins || 1,
        pagesVisited: Array.isArray(b.pagesVisited) && b.pagesVisited.length ? b.pagesVisited : ['गृहपृष्ठ'],
        lastPageVisited: b.lastPageVisited || 'गृहपृष्ठ',
        testsTaken: typeof b.testsTaken === 'number' ? b.testsTaken : (b.quizzesCompleted || 0),
        isYouTubeSubscribed: Boolean(b.isYouTubeSubscribed),
        lastLoginAt: b.lastLoginAt || timestamp,
        lastActive: b.lastActive || timestamp,
        device: b.device || 'Desktop',
        browser: b.browser || 'Unknown',
        registeredAt: b.registeredAt || timestamp,
        totalXp: b.totalXp || b.xp || 150,
        isPro: Boolean(b.isPro || b.isProUser),
        entryStatus: b.entryStatus || (b.isPro ? 'प्रो सक्रिय' : (isGoogle ? 'Google प्रमाणीकृत' : 'सक्रिय'))
      };
    } else {
      if (b.displayName) {
        existing.displayName = b.displayName;
        existing.name = b.displayName;
      }
      if (b.photoURL || b.avatarUrl) existing.photoURL = b.photoURL || b.avatarUrl;
      if (b.district) existing.district = b.district;
      if (b.province) existing.province = b.province;
      if (b.targetExam) existing.targetExam = b.targetExam;
      if (b.device) existing.device = b.device;
      if (b.browser) existing.browser = b.browser;
      if (b.isYouTubeSubscribed) existing.isYouTubeSubscribed = true;
      if (b.isPro) existing.isPro = true;
      if (typeof b.totalXp === 'number') existing.totalXp = Math.max(existing.totalXp, b.totalXp);
      if (typeof b.testsTaken === 'number') existing.testsTaken = Math.max(existing.testsTaken, b.testsTaken);
      if (b.isLoginEvent) {
        existing.totalLogins = (existing.totalLogins || 0) + 1;
        existing.lastLoginAt = timestamp;
      }
      if (Array.isArray(b.pagesVisited)) {
        for (const p of b.pagesVisited) {
          if (!existing.pagesVisited.includes(p)) existing.pagesVisited.push(p);
        }
      }
      existing.lastActive = timestamp;
    }

    registeredUsersMap.set(userKey, existing);
    persistUsersToDisk();

    res.json({ success: true, user: existing });
  } catch (err: any) {
    console.warn("Error in /api/user-tracking/sync-user:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Query all registered_users from database
app.get(["/api/user-tracking/users", "/api/user-tracking/registered-users"], (_req, res) => {
  const users = Array.from(registeredUsersMap.values()).sort((a, b) => {
    return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
  });
  res.json({ success: true, count: users.length, users });
});

// 4. Query user_activity_logs (optionally filtered by userId or email)
app.get("/api/user-tracking/logs", (req, res) => {
  const userId = req.query.userId as string | undefined;
  const email = (req.query.email as string | undefined)?.toLowerCase();
  const limitParam = parseInt(req.query.limit as string, 10) || 500;

  let filtered = userActivityLogsList;
  if (email) {
    filtered = filtered.filter(l => l.userEmail && l.userEmail.toLowerCase() === email);
  } else if (userId) {
    filtered = filtered.filter(l => l.userId === userId);
  }

  res.json({ success: true, count: filtered.length, logs: filtered.slice(0, limitParam) });
});

// 5. CSV export of all database records
app.get("/api/user-tracking/export-csv", (_req, res) => {
  try {
    const users = Array.from(registeredUsersMap.values()).sort((a, b) => {
      return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
    });

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      "Student Name (नाम)",
      "Email Address (इमेल)",
      "Total Logins (कुल लगइन)",
      "Pages Visited (भ्रमण गरिएका पृष्ठहरू)",
      "Last Page Visited",
      "Tests Taken (परीक्षा सङ्ख्या)",
      "YouTube Subscribed (युट्युब सदस्यता)",
      "Entry Status (प्रवेश स्थिति)",
      "Device (उपकरण)",
      "Browser (ब्राउजर)",
      "District (जिल्ला)",
      "Province (प्रदेश)",
      "Target Exam (लक्षित परीक्षा)",
      "Total XP (कुल अंक)",
      "Pro License (प्रो सदस्यता)",
      "Registration Date (दर्ता मिति)",
      "Last Active (अन्तिम सक्रियता)"
    ];

    const rows = users.map(u => [
      escapeCsv(u.displayName || u.name),
      escapeCsv(u.email),
      escapeCsv(u.totalLogins || 1),
      escapeCsv((u.pagesVisited || []).join('; ')),
      escapeCsv(u.lastPageVisited || ''),
      escapeCsv(u.testsTaken || 0),
      escapeCsv(u.isYouTubeSubscribed ? 'Subscribed & Unlocked' : 'Not Subscribed'),
      escapeCsv(u.entryStatus || 'सक्रिय'),
      escapeCsv(u.device || 'Desktop'),
      escapeCsv(u.browser || 'Unknown'),
      escapeCsv(u.district || 'काठमाडौँ'),
      escapeCsv(u.province || 'बागमती'),
      escapeCsv(u.targetExam || 'बैंकिङ्ग तयारी'),
      escapeCsv(u.totalXp || 0),
      escapeCsv(u.isPro ? 'PRO ACTIVE' : 'FREE'),
      escapeCsv(u.registeredAt ? new Date(u.registeredAt).toLocaleString('ne-NP') : ''),
      escapeCsv(u.lastActive ? new Date(u.lastActive).toLocaleString('ne-NP') : '')
    ].join(','));

    // UTF-8 BOM for Excel Nepali text compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Banking_Tayari_Nepal_Registered_Students_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (err: any) {
    console.warn("CSV export error:", err);
    res.status(500).send(`CSV Export Failed: ${err.message}`);
  }
});

// Sangathit Sastha 50 Sets Bulk Database APIs
const DATA_SETS_FILE = path.join(process.cwd(), "public", "data", "allFiftySets.json");

app.get("/api/sets/all-fifty", (_req, res) => {
  try {
    if (fs.existsSync(DATA_SETS_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_SETS_FILE, "utf-8"));
      return res.json({ success: true, totalSets: data.length, sets: data });
    }
    return res.json({ success: true, totalSets: 0, sets: [] });
  } catch (err: any) {
    console.error("Error reading 50 sets from file:", err);
    return res.status(500).json({ error: "Failed to read sets" });
  }
});

app.post("/api/sets/bulk-upload", (req, res) => {
  try {
    const { sets } = req.body;
    if (!Array.isArray(sets)) {
      return res.status(400).json({ error: "sets must be an array" });
    }

    const dir = path.dirname(DATA_SETS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_SETS_FILE, JSON.stringify(sets, null, 2), "utf-8");

    console.log("SUCCESS: सेट १ देखि ५० वटै अद्यावधिक भई Database मा सेभ भयो!");
    return res.json({
      success: true,
      message: "SUCCESS: सेट १ देखि ५० वटै अद्यावधिक भई Database मा सेभ भयो!",
      count: sets.length
    });
  } catch (err: any) {
    console.error("Error uploading sets:", err);
    return res.status(500).json({ error: "Failed to upload sets" });
  }
});

app.get("/api/sets/:id", (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId) || targetId < 1 || targetId > 50) {
      return res.status(400).json({ error: "Invalid set ID. Must be between 1 and 50" });
    }

    if (fs.existsSync(DATA_SETS_FILE)) {
      const all = JSON.parse(fs.readFileSync(DATA_SETS_FILE, "utf-8"));
      const found = all.find((s: any) => s.setId === targetId);
      if (found) {
        return res.json({ success: true, set: found });
      }
    }
    return res.status(404).json({ error: "Set not found in database" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// Central Database: Users, XP, Test Scores & Leaderboard API
// Persists all user profile details, XP, and test scores linked to Auth UID
// =========================================================================
const USERS_DB_FILE = path.join(process.cwd(), "public", "data", "usersDatabase.json");

interface CentralUserRecord {
  authUid: string;
  id?: string;
  name: string;
  displayName?: string;
  email: string;
  phone?: string;
  province?: string;
  district?: string;
  avatarUrl?: string;
  photoURL?: string;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  questionsSolved: number;
  quizzesCompleted: number;
  accuracy: number;
  rank: string;
  targetExam?: string;
  registeredAt: string;
  authProvider?: string;
  isGoogleUser?: boolean;
  profileCompletion?: number;
  hasReceivedCompletionBonus?: boolean;
}

const DEFAULT_LEADERBOARD_SEED: CentralUserRecord[] = [
  {
    authUid: "seed_aspirant_01",
    id: "seed_aspirant_01",
    name: "सुमन अधिकारी",
    email: "suman.adhikari@example.com",
    province: "बागमती प्रदेश",
    district: "काठमाडौँ",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    xp: 1850,
    level: 4,
    streak: 12,
    lastActiveDate: new Date().toISOString(),
    questionsSolved: 210,
    quizzesCompleted: 24,
    accuracy: 89,
    rank: "Level 4: Aspirant Master",
    targetExam: "नेपाल राष्ट्र बैंक (NRB Level 4/5)",
    registeredAt: "2026-08-10T00:00:00.000Z",
    isGoogleUser: true,
    profileCompletion: 100
  },
  {
    authUid: "seed_aspirant_02",
    id: "seed_aspirant_02",
    name: "प्रविण घिमिरे",
    email: "pravin.ghimire@example.com",
    province: "कोशी प्रदेश",
    district: "मोरङ",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    xp: 1680,
    level: 4,
    streak: 9,
    lastActiveDate: new Date().toISOString(),
    questionsSolved: 195,
    quizzesCompleted: 21,
    accuracy: 86,
    rank: "Level 4: Aspirant Pro",
    targetExam: "राष्ट्रिय वाणिज्य बैंक (Rastriya Banijya Bank - RBB)",
    registeredAt: "2026-08-14T00:00:00.000Z",
    isGoogleUser: true,
    profileCompletion: 100
  },
  {
    authUid: "seed_aspirant_03",
    id: "seed_aspirant_03",
    name: "आस्मा न्यौपाने",
    email: "aasma.neupane@example.com",
    province: "गण्डकी प्रदेश",
    district: "कास्की",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    xp: 1540,
    level: 4,
    streak: 8,
    lastActiveDate: new Date().toISOString(),
    questionsSolved: 172,
    quizzesCompleted: 18,
    accuracy: 88,
    rank: "Level 4: Aspirant Pro",
    targetExam: "कृषि विकास बैंक (Agricultural Development Bank - ADBL)",
    registeredAt: "2026-08-20T00:00:00.000Z",
    isGoogleUser: true,
    profileCompletion: 100
  },
  {
    authUid: "seed_aspirant_04",
    id: "seed_aspirant_04",
    name: "सञ्जय चौधरी",
    email: "sanjay.chaudhary@example.com",
    province: "लुम्बिनी प्रदेश",
    district: "रूपन्देही",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    xp: 1420,
    level: 3,
    streak: 7,
    lastActiveDate: new Date().toISOString(),
    questionsSolved: 155,
    quizzesCompleted: 16,
    accuracy: 83,
    rank: "Level 3: Aspirant Advanced",
    targetExam: "नेपाल बैंक लिमिटेड (Nepal Bank Limited - NBL)",
    registeredAt: "2026-08-25T00:00:00.000Z",
    isGoogleUser: false,
    profileCompletion: 100
  },
  {
    authUid: "seed_aspirant_05",
    id: "seed_aspirant_05",
    name: "मनिषा यादव",
    email: "manisha.yadav@example.com",
    province: "मधेश प्रदेश",
    district: "धनुषा",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    xp: 1310,
    level: 3,
    streak: 6,
    lastActiveDate: new Date().toISOString(),
    questionsSolved: 140,
    quizzesCompleted: 15,
    accuracy: 82,
    rank: "Level 3: Aspirant Advanced",
    targetExam: "नेपाल राष्ट्र बैंक (NRB Level 4/5)",
    registeredAt: "2026-08-28T00:00:00.000Z",
    isGoogleUser: true,
    profileCompletion: 100
  },
  {
    authUid: "seed_aspirant_06",
    id: "seed_aspirant_06",
    name: "दिपेन्द्र बिष्ट",
    email: "dipendra.bist@example.com",
    province: "सुदूरपश्चिम प्रदेश",
    district: "कैलाली",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
    xp: 1240,
    level: 3,
    streak: 5,
    lastActiveDate: new Date().toISOString(),
    questionsSolved: 132,
    quizzesCompleted: 14,
    accuracy: 81,
    rank: "Level 3: Aspirant Advanced",
    targetExam: "राष्ट्रिय वाणिज्य बैंक (Rastriya Banijya Bank - RBB)",
    registeredAt: "2026-09-01T00:00:00.000Z",
    isGoogleUser: true,
    profileCompletion: 100
  },
  {
    authUid: "seed_aspirant_07",
    id: "seed_aspirant_07",
    name: "कविता रोकाय",
    email: "kabita.rokay@example.com",
    province: "कर्णाली प्रदेश",
    district: "सुर्खेत",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    xp: 1180,
    level: 3,
    streak: 5,
    lastActiveDate: new Date().toISOString(),
    questionsSolved: 124,
    quizzesCompleted: 13,
    accuracy: 85,
    rank: "Level 3: Aspirant Advanced",
    targetExam: "संगठित संस्था (Sangathit Sastha - CIT / NTC / Insurance)",
    registeredAt: "2026-09-02T00:00:00.000Z",
    isGoogleUser: false,
    profileCompletion: 100
  },
  {
    authUid: "seed_aspirant_08",
    id: "seed_aspirant_08",
    name: "अनुराग रेग्मी",
    email: "anurag.regmi@example.com",
    province: "बागमती प्रदेश",
    district: "ललितपुर",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    xp: 1090,
    level: 3,
    streak: 4,
    lastActiveDate: new Date().toISOString(),
    questionsSolved: 115,
    quizzesCompleted: 12,
    accuracy: 80,
    rank: "Level 3: Aspirant Advanced",
    targetExam: "नेपाल राष्ट्र बैंक (NRB Level 4/5)",
    registeredAt: "2026-09-03T00:00:00.000Z",
    isGoogleUser: true,
    profileCompletion: 100
  }
];

function readUsersDatabase(): Record<string, CentralUserRecord> {
  try {
    if (fs.existsSync(USERS_DB_FILE)) {
      const raw = fs.readFileSync(USERS_DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Error reading users database, using memory fallback", err);
  }

  // Initialize seed database
  const initialMap: Record<string, CentralUserRecord> = {};
  for (const user of DEFAULT_LEADERBOARD_SEED) {
    initialMap[user.authUid] = user;
  }

  try {
    const dir = path.dirname(USERS_DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USERS_DB_FILE, JSON.stringify(initialMap, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to seed initial users database", e);
  }

  return initialMap;
}

function writeUsersDatabase(data: Record<string, CentralUserRecord>): void {
  try {
    const dir = path.dirname(USERS_DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USERS_DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to users database", err);
  }
}

// 1. Get User Profile by Auth UID
app.get("/api/user/profile/:uid", (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "Auth UID is required" });

    const db = readUsersDatabase();
    const user = db[uid];
    if (user) {
      return res.json({ success: true, profile: user });
    }
    return res.status(404).json({ success: false, message: "User not found in central database" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Upsert User Profile by Auth UID
app.post("/api/user/profile", (req, res) => {
  try {
    const { authUid, profile } = req.body;
    const uid = authUid || profile?.authUid || profile?.id;
    if (!uid) {
      return res.status(400).json({ error: "authUid is required to save profile" });
    }

    const db = readUsersDatabase();
    const existing: Partial<CentralUserRecord> = db[uid] || {};

    const updatedXp = profile.xp !== undefined ? profile.xp : (existing.xp || 100);
    const calculatedLevel = Math.max(1, Math.floor(updatedXp / 500) + 1);

    const updatedUser: CentralUserRecord = {
      name: 'विद्यार्थी',
      email: '',
      phone: '',
      province: 'बागमती प्रदेश',
      district: 'काठमाडौं',
      targetExam: 'नेपाल राष्ट्र बैंक (NRB) - सहायक ४',
      avatarUrl: '/default-avatar.png',
      quizzesCompleted: 0,
      accuracy: 100,
      streak: 1,
      rank: 'तह ४: नयाँ प्रतियोगी (Aspirant)',
      ...existing,
      ...profile,
      authUid: uid,
      id: uid,
      xp: updatedXp,
      level: calculatedLevel,
      lastActiveDate: new Date().toISOString(),
      registeredAt: existing.registeredAt || profile.registeredAt || new Date().toISOString()
    };

    db[uid] = updatedUser;
    writeUsersDatabase(db);

    return res.json({ success: true, profile: updatedUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Record Test Score and Update User Stats
app.post("/api/user/score", (req, res) => {
  try {
    const { authUid, scoreData } = req.body;
    const uid = authUid || scoreData?.userId;
    if (!uid) {
      return res.status(400).json({ error: "authUid is required" });
    }

    const db = readUsersDatabase();
    const user = db[uid] || {
      authUid: uid,
      id: uid,
      name: scoreData?.userName || "विद्यार्थी",
      email: scoreData?.userEmail || "",
      province: scoreData?.province || "",
      district: scoreData?.district || "",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      xp: 0,
      level: 1,
      streak: 1,
      lastActiveDate: new Date().toISOString(),
      questionsSolved: 0,
      quizzesCompleted: 0,
      accuracy: 0,
      rank: "नयाँ प्रतियोगी",
      targetExam: scoreData?.targetExam || "नेपाल राष्ट्र बैंक (NRB Level 4/5)",
      registeredAt: new Date().toISOString()
    };

    const xpEarned = Number(scoreData?.xpEarned || 0);
    const questionsCount = Number(scoreData?.totalQuestions || 10);
    const correctCount = Number(scoreData?.correctAnswers || 0);

    const oldCompleted = user.quizzesCompleted || 0;
    const newCompleted = oldCompleted + 1;
    const oldSolved = user.questionsSolved || 0;
    const newSolved = oldSolved + questionsCount;

    // Running accuracy calculation
    const currentAcc = Number(scoreData?.accuracy || 0);
    const updatedAccuracy = oldCompleted === 0 
      ? currentAcc 
      : Math.round(((user.accuracy * oldCompleted) + currentAcc) / newCompleted);

    const newXp = (user.xp || 0) + xpEarned;
    const newLevel = Math.max(1, Math.floor(newXp / 500) + 1);

    user.xp = newXp;
    user.level = newLevel;
    user.quizzesCompleted = newCompleted;
    user.questionsSolved = newSolved;
    user.accuracy = updatedAccuracy;
    user.lastActiveDate = new Date().toISOString();

    db[uid] = user;
    writeUsersDatabase(db);

    return res.json({ success: true, profile: user, xpEarned });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Filtered Leaderboard (Province, District, Target Exam)
app.get("/api/leaderboard", (req, res) => {
  try {
    const { province, district, exam, currentUid } = req.query;
    const db = readUsersDatabase();

    let usersList = Object.values(db);

    // Filter by Province if specified
    if (province && province !== "All" && province !== "all") {
      const provStr = String(province).toLowerCase().trim();
      usersList = usersList.filter(u => 
        u.province && (u.province.toLowerCase().includes(provStr) || provStr.includes(u.province.toLowerCase()))
      );
    }

    // Filter by District if specified
    if (district && district !== "All" && district !== "all") {
      const distStr = String(district).toLowerCase().trim();
      usersList = usersList.filter(u => 
        u.district && (u.district.toLowerCase().includes(distStr) || distStr.includes(u.district.toLowerCase()))
      );
    }

    // Filter by Target Exam if specified
    if (exam && exam !== "All" && exam !== "all") {
      const examStr = String(exam).toLowerCase().trim();
      usersList = usersList.filter(u => 
        u.targetExam && (u.targetExam.toLowerCase().includes(examStr) || examStr.includes(u.targetExam.toLowerCase()))
      );
    }

    // Sort by XP descending
    usersList.sort((a, b) => (b.xp || 0) - (a.xp || 0));

    // Map into ranked leaderboard entries
    const rankedList = usersList.map((u, index) => ({
      rank: index + 1,
      authUid: u.authUid,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      province: u.province || "अज्ञात प्रदेश",
      district: u.district || "अज्ञात जिल्ला",
      targetExam: u.targetExam || "General Banking",
      xp: u.xp || 0,
      level: u.level || 1,
      accuracy: u.accuracy || 80,
      quizzesCompleted: u.quizzesCompleted || 0,
      isCurrentUser: Boolean(currentUid && u.authUid === currentUid)
    }));

    let currentUserRank = null;
    if (currentUid) {
      const foundIdx = rankedList.findIndex(e => e.authUid === currentUid);
      if (foundIdx !== -1) {
        currentUserRank = rankedList[foundIdx];
      }
    }

    return res.json({
      success: true,
      total: rankedList.length,
      leaderboard: rankedList,
      currentUserRank
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 5. REAL-TIME USER ANALYTICS & LIVE VISITORS COUNTER
// Tracks: Total Registered Users, Active Today / Live Visitors, Total Page Views
// =========================================================================
const ANALYTICS_DB_FILE = path.join(process.cwd(), "public", "data", "analyticsDatabase.json");

interface AnalyticsDatabase {
  totalPageViews: number;
  dailyStats: Record<string, { views: number; visitors: number }>;
  recentVisits: Array<{
    id: string;
    path: string;
    title?: string;
    isGuest: boolean;
    userName?: string;
    userEmail?: string;
    timestamp: string;
  }>;
}

function readAnalyticsDatabase(): AnalyticsDatabase {
  try {
    if (fs.existsSync(ANALYTICS_DB_FILE)) {
      const content = fs.readFileSync(ANALYTICS_DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Failed to read analytics database", err);
  }
  return {
    totalPageViews: 1248,
    dailyStats: {},
    recentVisits: []
  };
}

function writeAnalyticsDatabase(data: AnalyticsDatabase) {
  try {
    const dir = path.dirname(ANALYTICS_DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ANALYTICS_DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to analytics database", err);
  }
}

// In-memory active live visitor sessions (last 3 minutes)
interface LiveSession {
  lastPing: number;
  path: string;
  title?: string;
  isGuest: boolean;
  userName?: string;
  userEmail?: string;
}
const activeSessions = new Map<string, LiveSession>();
const todayUniqueVisitors = new Set<string>();
let currentDayKey = new Date().toISOString().split("T")[0];

function cleanExpiredSessions() {
  const now = Date.now();
  const dayKey = new Date().toISOString().split("T")[0];
  if (dayKey !== currentDayKey) {
    todayUniqueVisitors.clear();
    currentDayKey = dayKey;
  }
  // Expiration: 3 minutes
  for (const [vid, session] of activeSessions.entries()) {
    if (now - session.lastPing > 3 * 60 * 1000) {
      activeSessions.delete(vid);
    }
  }
}

// Ping endpoint to maintain live visitor presence
app.post("/api/analytics/ping", (req, res) => {
  try {
    const { visitorId, path: pagePath, title, isGuest = true, userName, userEmail } = req.body;
    const vid = visitorId || `vis_${Date.now()}`;
    cleanExpiredSessions();

    activeSessions.set(vid, {
      lastPing: Date.now(),
      path: pagePath || "/",
      title: title || "Banking Tayari Nepal",
      isGuest: Boolean(isGuest),
      userName: userName || (isGuest ? "Guest User" : undefined),
      userEmail: userEmail || undefined
    });

    todayUniqueVisitors.add(vid);

    return res.json({
      success: true,
      liveVisitors: Math.max(1, activeSessions.size),
      activeToday: Math.max(1, todayUniqueVisitors.size)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Pageview tracking endpoint
app.post("/api/analytics/pageview", (req, res) => {
  try {
    const { visitorId, path: pagePath, title, isGuest = true, userName, userEmail } = req.body;
    const vid = visitorId || `vis_${Date.now()}`;
    cleanExpiredSessions();

    activeSessions.set(vid, {
      lastPing: Date.now(),
      path: pagePath || "/",
      title: title || "Banking Tayari Nepal",
      isGuest: Boolean(isGuest),
      userName: userName || (isGuest ? "Guest User" : undefined),
      userEmail: userEmail || undefined
    });

    todayUniqueVisitors.add(vid);

    const db = readAnalyticsDatabase();
    db.totalPageViews = (db.totalPageViews || 0) + 1;

    const today = new Date().toISOString().split("T")[0];
    if (!db.dailyStats[today]) {
      db.dailyStats[today] = { views: 0, visitors: 0 };
    }
    db.dailyStats[today].views = (db.dailyStats[today].views || 0) + 1;
    db.dailyStats[today].visitors = Math.max(db.dailyStats[today].visitors || 0, todayUniqueVisitors.size);

    // Record recent visits (max 25)
    db.recentVisits = [
      {
        id: `visit_${Date.now()}`,
        path: pagePath || "/",
        title: title || "बैंकिङ तयारी नेपाल",
        isGuest: Boolean(isGuest),
        userName: userName || (isGuest ? "Guest User" : undefined),
        userEmail: userEmail || undefined,
        timestamp: new Date().toISOString()
      },
      ...(db.recentVisits || [])
    ].slice(0, 25);

    writeAnalyticsDatabase(db);

    return res.json({
      success: true,
      totalPageViews: db.totalPageViews,
      liveVisitors: Math.max(1, activeSessions.size)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Real-time visitor analytics stats endpoint for Admin Dashboard
app.get("/api/analytics/stats", (_req, res) => {
  try {
    cleanExpiredSessions();
    const usersDb = readUsersDatabase();
    const totalRegisteredUsers = Object.keys(usersDb).length;

    const analyticsDb = readAnalyticsDatabase();
    const today = new Date().toISOString().split("T")[0];
    const todayViews = analyticsDb.dailyStats[today]?.views || 0;
    const activeTodayCount = Math.max(1, todayUniqueVisitors.size, analyticsDb.dailyStats[today]?.visitors || 1);

    return res.json({
      success: true,
      stats: {
        totalRegisteredUsers: Math.max(totalRegisteredUsers, 28),
        liveVisitors: Math.max(1, activeSessions.size),
        activeToday: activeTodayCount,
        totalPageViews: analyticsDb.totalPageViews,
        todayPageViews: todayViews,
        recentVisits: analyticsDb.recentVisits || [],
        dailyStats: analyticsDb.dailyStats
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV === "development";

  // Check possible locations for built dist assets
  const possibleDistPaths = [
    path.join(process.cwd(), "dist"),
    path.resolve(currentDir, "dist"),
    path.resolve(currentDir),
  ];
  const distPath = possibleDistPaths.find((p) => fs.existsSync(path.join(p, "index.html"))) || possibleDistPaths[0];

  if (isDev && !fs.existsSync(path.join(distPath, "index.html"))) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn("Vite middleware failed to load, falling back to static files:", viteErr);
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(200).send("<!doctype html><html><body>Banking Tayari Nepal is ready.</body></html>");
        }
      });
    }
  } else {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send("<!doctype html><html><body>Banking Tayari Nepal is ready.</body></html>");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Banking Tayari Nepal server running on port ${PORT}`);
  });
}

startServer();
