require("dotenv").config();
const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname)));

// Helper: Helper to safely instantiate and retrieve Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    const error = new Error(
      "GEMINI_API_KEY is not configured in .env. Please add your API key to continue."
    );
    error.statusCode = 500;
    throw error;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

// Model identifier
const GEMINI_MODEL = "gemini-3.8-flash";

// Helper: Escape HTML strings to guard against malformed tags
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Helper: Strip code block ticks from JSON strings
function cleanJsonOutput(text) {
  if (!text) return "";
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * POST /api/notes
 * Body: { topic: string, material?: string }
 * Response: { success: boolean, plain: string, html: string }
 */
app.post("/api/notes", async (req, res) => {
  try {
    const { topic, material } = req.body || {};

    if ((!topic || !topic.trim()) && (!material || !material.trim())) {
      return res.status(400).json({
        success: false,
        error: "Please provide a topic or study material to generate notes.",
      });
    }

    const cleanTopic = (topic || "Key Study Concept").trim().slice(0, 200);
    const cleanMaterial = (material || "").trim().slice(0, 10000);

    const prompt = `You are EduSpark's expert academic tutor. Generate comprehensive, crystal-clear, structured study notes.

Topic: "${cleanTopic}"
${cleanMaterial ? `Study Material / Lecture Excerpt:\n"""\n${cleanMaterial}\n"""` : "No raw material provided. Generate foundational, high-yield study notes directly based on the topic."}

Return a valid JSON object strictly matching this schema:
{
  "executiveSummary": "A concise 2-3 sentence overview highlighting the essence and importance of the concept.",
  "keyTakeaways": [
    "Core takeaway 1 (definitions, laws, or central facts)",
    "Core takeaway 2",
    "Core takeaway 3"
  ],
  "breakdownPoints": [
    "Step/Mechanism 1: Detailed explanation of how this works or rules involved",
    "Step/Mechanism 2: Detailed explanation",
    "Step/Mechanism 3: Practical implications or applications"
  ],
  "commonMistake": "A high-frequency exam pitfall or common student misconception to avoid.",
  "selfCheckQuestions": [
    "Question 1 testing core definition or purpose",
    "Question 2 testing mechanisms or causal variables",
    "Question 3 testing real-world or problem-solving application"
  ]
}

Ensure the response contains ONLY the raw JSON object, without extra conversational text.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = cleanJsonOutput(response?.text);
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("JSON parse error from Gemini output:", parseErr, rawText);
      return res.status(502).json({
        success: false,
        error: "Failed to parse structured notes from AI model. Please retry.",
      });
    }

    const summary = parsed.executiveSummary || `Revision notes synthesized for ${cleanTopic}.`;
    const takeaways = Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [];
    const breakdowns = Array.isArray(parsed.breakdownPoints) ? parsed.breakdownPoints : [];
    const mistake = parsed.commonMistake || "Always check boundary conditions and foundational definitions.";
    const questions = Array.isArray(parsed.selfCheckQuestions) ? parsed.selfCheckQuestions : [];

    // Plain text version (for easy clipboard copy)
    let plain = `=== ${cleanTopic.toUpperCase()} — COMPREHENSIVE REVISION NOTES ===\n\n`;
    plain += `[1. EXECUTIVE SUMMARY]\n${summary}\n\n`;
    plain += `[2. KEY TAKEAWAYS]\n`;
    takeaways.forEach((t) => {
      plain += `• ${t}\n`;
    });
    plain += `\n[3. STEP-BY-STEP CONCEPT BREAKDOWN]\n`;
    breakdowns.forEach((b) => {
      plain += `• ${b}\n`;
    });
    plain += `\n[4. COMMON PITFALL TO AVOID]\n⚠️ ${mistake}\n\n`;
    plain += `[5. SELF-CHECK QUESTIONS]\n`;
    questions.forEach((q, idx) => {
      plain += `${idx + 1}. ${q}\n`;
    });

    // Rich HTML version for clean, modern cards
    const html = `
      <div class="note-doc-title">
        <i class="fas fa-bookmark"></i>
        <span>${escapeHtml(cleanTopic.toUpperCase())}</span>
      </div>

      <div class="note-card-box summary-box">
        <div class="note-sec-title">
          <i class="fas fa-bullseye"></i> Executive Summary
        </div>
        <p style="font-size:.9rem; color:var(--text); margin:0;">
          ${escapeHtml(summary)}
        </p>
      </div>

      <div class="note-card-box">
        <div class="note-sec-title">
          <i class="fas fa-key" style="color:var(--primary);"></i> 1. High-Yield Key Takeaways
        </div>
        <ul class="note-bullet-list">
          ${takeaways.map((t) => `<li class="note-bullet-item"><i class="fas fa-check-circle"></i><div>${escapeHtml(t)}</div></li>`).join("")}
        </ul>
      </div>

      <div class="note-card-box">
        <div class="note-sec-title">
          <i class="fas fa-layer-group" style="color:var(--primary);"></i> 2. Concept Breakdown & Mechanics
        </div>
        <ul class="note-bullet-list">
          ${breakdowns.map((b) => `<li class="note-bullet-item"><i class="fas fa-arrow-right"></i><div>${escapeHtml(b)}</div></li>`).join("")}
        </ul>
        <div class="note-callout-warning">
          <i class="fas fa-exclamation-triangle" style="margin-right:.4rem; color:var(--warning);"></i>
          <strong>Common Exam Pitfall:</strong> ${escapeHtml(mistake)}
        </div>
      </div>

      <div class="note-card-box">
        <div class="note-sec-title">
          <i class="fas fa-tasks" style="color:var(--primary);"></i> 3. Quick Self-Check Questions
        </div>
        <ol class="note-numbered-list">
          ${questions.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}
        </ol>
      </div>
    `.trim();

    return res.json({
      success: true,
      topic: cleanTopic,
      plain,
      html,
    });
  } catch (err) {
    console.error("Error in POST /api/notes:", err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: err.message || "An unexpected error occurred while generating notes.",
    });
  }
});

/**
 * POST /api/quiz
 * Body: { topic: string, difficulty?: "Easy" | "Medium" | "Hard", count?: number }
 * Response: { success: boolean, questions: Array<{ q, opts: string[], correct: number, explain: string }> }
 */
app.post("/api/quiz", async (req, res) => {
  try {
    const { topic, difficulty, count } = req.body || {};

    if (!topic || !topic.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please provide a topic for the quiz.",
      });
    }

    const cleanTopic = topic.trim().slice(0, 200);
    const cleanDiff = ["Easy", "Medium", "Hard"].includes(difficulty) ? difficulty : "Medium";
    const qCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 10);

    const prompt = `You are EduSpark's quiz master. Create a high-quality, multiple-choice practice quiz for college and high school students.

Topic: "${cleanTopic}"
Difficulty: ${cleanDiff}
Number of questions: ${qCount}

Requirements:
1. Each question must test understanding of key concepts, definitions, principles, or applications.
2. Provide exactly 4 distinct options per question.
3. Indicate the zero-based index of the correct answer (0, 1, 2, or 3).
4. Provide a clear 1-2 sentence explanation for why that answer is correct.

Return a valid JSON array strictly matching this schema:
[
  {
    "q": "Clear question text?",
    "opts": [
      "Option A text",
      "Option B text",
      "Option C text",
      "Option D text"
    ],
    "correct": 0,
    "explain": "Brief explanation of why the answer is correct."
  }
]

Ensure the output contains ONLY the raw JSON array.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = cleanJsonOutput(response?.text);
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("JSON parse error from Gemini quiz output:", parseErr, rawText);
      return res.status(502).json({
        success: false,
        error: "Failed to parse quiz questions from AI model. Please retry.",
      });
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return res.status(502).json({
        success: false,
        error: "AI model did not return questions in expected array format.",
      });
    }

    // Validate and sanitize each question item
    const sanitizedQuestions = parsed.slice(0, qCount).map((item, idx) => {
      const qText = typeof item.q === "string" && item.q.trim() ? item.q.trim() : `Question ${idx + 1} on ${cleanTopic}`;
      let opts = Array.isArray(item.opts) ? item.opts.map((o) => String(o).trim()) : [];
      if (opts.length < 4) {
        while (opts.length < 4) {
          opts.push(`Alternative option ${opts.length + 1}`);
        }
      } else if (opts.length > 4) {
        opts = opts.slice(0, 4);
      }

      let correct = typeof item.correct === "number" ? Math.floor(item.correct) : 0;
      if (correct < 0 || correct > 3) correct = 0;

      const explain = typeof item.explain === "string" && item.explain.trim() ? item.explain.trim() : "Verified correct answer based on domain principles.";

      return {
        q: qText,
        opts,
        correct,
        explain,
      };
    });

    return res.json({
      success: true,
      topic: cleanTopic,
      difficulty: cleanDiff,
      questions: sanitizedQuestions,
    });
  } catch (err) {
    console.error("Error in POST /api/quiz:", err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: err.message || "An unexpected error occurred while generating the quiz.",
    });
  }
});

/**
 * POST /api/doubt
 * Body: { question: string }
 * Response: { success: boolean, explanation: string }
 */
app.post("/api/doubt", async (req, res) => {
  try {
    const { question } = req.body || {};

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please enter your question or concept struggle.",
      });
    }

    const cleanQuestion = question.trim().slice(0, 2000);

    const prompt = `You are EduSpark's AI Doubt Solver. A student is struggling with the following question or concept:

"${cleanQuestion}"

Provide a friendly, highly structured, clear explanation that breaks down the confusion into easily digestible parts.

Use this format:
### 💡 Simplified Explanation:
A clear, intuitive 1-2 sentence overview in plain language.

### 🔍 Step-by-Step Breakdown:
1. **Root Principle:** The core law, definition, or premise at play.
2. **How It Works:** The cause-and-effect mechanism or derivation.
3. **Real-World / Intuitive Analogy:** A relatable analogy or quick example.

### ⚠️ Common Pitfall to Avoid:
A common mistake students make with this exact concept.

### 📌 Key Rule of Thumb:
A concise, memorable takeaway rule for exam scenarios.

Keep your response focused, student-friendly, and accurate.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const explanation = response?.text?.trim();
    if (!explanation) {
      return res.status(502).json({
        success: false,
        error: "No explanation was generated by the AI model. Please try again.",
      });
    }

    return res.json({
      success: true,
      explanation,
    });
  } catch (err) {
    console.error("Error in POST /api/doubt:", err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: err.message || "An unexpected error occurred while resolving doubt.",
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "EduSpark API",
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`EduSpark server running at http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_KEY.trim()) {
    console.warn("⚠️ Warning: GEMINI_API_KEY is not set in .env. AI endpoints will return an error until configured.");
  } else {
    console.log("✓ Gemini API key detected.");
  }
});
