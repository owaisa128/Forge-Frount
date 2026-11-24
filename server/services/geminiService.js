const { GoogleGenerativeAI } = require('@google/generative-ai');

const BASE_SYSTEM_PROMPT = `You are FORGE AI, the elite, evidence-based strength & conditioning coach and sports nutritionist for the FORGE fitness platform.

Your primary mission is to empower athletes and fitness enthusiasts to achieve their training, physique, and wellness goals safely, scientifically, and effectively.

Key Coaching Principles:
1. WORKOUT PROGRAMMING: Provide structured workouts with clear exercises, target muscle groups, sets, reps, and recommended rest intervals using progressive overload and RIR (Reps in Reserve).
2. NUTRITION & MACROS: Provide actionable calorie and macronutrient breakdowns (protein 1.6-2.2g/kg, carbs, fats, hydration) aligned with client goals (fat loss, hypertrophy, maintenance, endurance).
3. EXERCISE FORM & CUES: Give crisp biomechanical cues and highlight common mistakes to prevent injuries.
4. TIMERS & RECOVERY: Recommend warmups, cooldowns, mobility, and rest intervals.
5. OUTPUT SANITIZATION & FORMATTING:
   - Always output clean, valid, structured Markdown.
   - Do NOT include raw HTML script tags, style tags, iframes, or unsafe links.
   - Use bold headings, clean bullet points, and tables for high readability.
   - Present workout routines, macro targets, and form cues directly using standard Markdown text, lists, and tables without raw JSON code blocks.
6. SAFETY & MEDICAL BOUNDARIES: You are a fitness assistant, not a physician. Do NOT diagnose medical conditions. For sharp pain or injuries, advise consulting a medical professional.
When analyzing complex periodization or biomechanics, optionally outline your thought process in a <think>...</think> block before the final answer.`;

const PERSONA_PROMPTS = {
  coach: `${BASE_SYSTEM_PROMPT}\nTone: Professional, encouraging, evidence-based, direct.`,
  hypertrophy: `${BASE_SYSTEM_PROMPT}\nSpecialization: Hypertrophy & Muscle Growth Coach. Prioritize mechanical tension, volume landmarks (MEV/MAV), 0-3 RIR proximity to failure, and protein synthesis.`,
  fatloss: `${BASE_SYSTEM_PROMPT}\nSpecialization: Fat Loss & Body Composition Coach. Focus on sustainable caloric deficits, high-satiety nutrition, NEAT optimization, and metabolic conditioning.`,
  mobility: `${BASE_SYSTEM_PROMPT}\nSpecialization: Mobility, Recovery & Injury Prevention Specialist. Focus on joint mechanics, dynamic warmups, active recovery, and posture.`,
};

const getAvailablePersonas = () => [
  { id: 'coach', name: 'FORGE Coach', description: 'Evidence-based strength, conditioning & wellness' },
  { id: 'hypertrophy', name: 'Hypertrophy Specialist', description: 'Mechanical tension, volume & progressive overload' },
  { id: 'fatloss', name: 'Fat Loss & Nutrition', description: 'Caloric deficits, high satiety & metabolic conditioning' },
  { id: 'mobility', name: 'Mobility & Recovery', description: 'Joint mechanics, active recovery & flexibility' },
];

/**
 * Safely masks API keys and sensitive secrets from logs.
 */
const safeLogMessage = (msg) => {
  if (!msg || typeof msg !== 'string') return msg;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  let clean = msg;
  if (apiKey) {
    clean = clean.split(apiKey).join('[REDACTED_API_KEY]');
  }
  // Also redact standard Gemini/Google API key patterns (AIza...)
  return clean.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]');
};

/**
 * Checks whether the Gemini API Key is configured in environment variables.
 */
const isConfigured = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return Boolean(apiKey && apiKey.trim() !== '' && !apiKey.startsWith('YOUR_'));
};

/**
 * Sanitize and format conversation history for Gemini API.
 * Ensures alternating user/model roles and non-empty text content.
 */
const formatConversationHistory = (history = []) => {
  const formatted = [];
  if (!Array.isArray(history) || history.length === 0) return formatted;

  let lastRole = null;

  for (const msg of history) {
    if (!msg || !msg.content || typeof msg.content !== 'string' || msg.content.trim() === '') {
      continue;
    }

    const currentRole = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';

    // Prevent consecutive duplicate roles which cause 400 Bad Request in Gemini API
    if (currentRole === lastRole && formatted.length > 0) {
      const lastIndex = formatted.length - 1;
      formatted[lastIndex].parts[0].text += `\n${msg.content.trim()}`;
    } else {
      formatted.push({
        role: currentRole,
        parts: [{ text: msg.content.trim() }],
      });
      lastRole = currentRole;
    }
  }

  // Gemini API requires the first conversation turn to be 'user'
  if (formatted.length > 0 && formatted[0].role === 'model') {
    formatted.shift();
  }

  return formatted;
};

/**
 * Extracts Generative UI data block if present in the text
 */

/**
 * Extracts Reasoning / Chain-of-Thought (<think>...</think> or ```reasoning ... ```)
 */
const extractReasoning = (text) => {
  if (!text || typeof text !== 'string') return { cleanText: text, reasoning: null };

  const thinkRegex = /<think>([\s\S]*?)<\/think>/i;
  const thinkMatch = text.match(thinkRegex);
  if (thinkMatch) {
    const reasoning = thinkMatch[1].trim();
    const cleanText = text.replace(thinkRegex, '').trim();
    return { cleanText, reasoning };
  }

  const reasoningBlockRegex = /```(?:reasoning|thought)\s*([\s\S]*?)\s*```/i;
  const blockMatch = text.match(reasoningBlockRegex);
  if (blockMatch) {
    const reasoning = blockMatch[1].trim();
    const cleanText = text.replace(reasoningBlockRegex, '').trim();
    return { cleanText, reasoning };
  }

  return { cleanText: text, reasoning: null };
};

const extractGenerativeUi = (text) => {
  if (!text || typeof text !== 'string') return { cleanText: text, generativeUi: null };

  const genUiRegex = /```(?:genui|json:genui)\s*([\s\S]*?)\s*```/gi;
  const cleanText = text.replace(genUiRegex, '').trim();
  return { cleanText, generativeUi: null };
};

/**
 * Generate a response using Google Gemini API given a conversation array.
 * Includes automatic model fallback hierarchy across available Google models.
 * @param {Array<{role: string, content: string}>} conversationHistory 
 * @param {object} options
 * @param {string} [options.persona]
 * @param {string} [options.model]
 * @returns {Promise<{reply: string, generativeUi: object|null, usedModel: string}>}
 */
const generateChatResponse = async (conversationHistory = [], options = {}) => {
  const { persona = 'coach', model: requestedModel = null } = options;
  const systemInstruction = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.coach;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('YOUR_')) {
    const error = new Error('Gemini API Key is missing or not configured in server/.env');
    error.code = 'NOT_CONFIGURED';
    throw error;
  }

  const configuredModel = process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.trim() : null;

  // Build model candidate hierarchy: priority to requested or active verified fast models
  const candidateModels = [
    requestedModel,
    configuredModel,
    'gemini-2.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ].filter((m, idx, self) => m && self.indexOf(m) === idx);

  const formattedContents = formatConversationHistory(conversationHistory);

  if (formattedContents.length === 0) {
    formattedContents.push({
      role: 'user',
      parts: [{ text: 'Hello FORGE AI Coach!' }],
    });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      console.log(`🤖 Attempting Gemini model: "${modelName}" (${persona} persona)...`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });

      const generateWithTimeout = async () => {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => {
            const err = new Error(`Model "${modelName}" request timed out after 10 seconds.`);
            err.status = 504;
            reject(err);
          }, 10000);
        });

        try {
          const res = await Promise.race([
            model.generateContent({
              contents: formattedContents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1200,
              },
            }),
            timeoutPromise,
          ]);
          clearTimeout(timer);
          return res;
        } catch (e) {
          clearTimeout(timer);
          throw e;
        }
      };

      const result = await generateWithTimeout();

      const response = await result.response;
      const rawReplyText = response.text();

      if (!rawReplyText) {
        throw new Error('Received empty text response from Gemini API.');
      }

      console.log(`✅ Gemini response successfully generated using model "${modelName}"`);
      
      const { cleanText: textWithoutReasoning, reasoning } = extractReasoning(rawReplyText);
      const { cleanText, generativeUi } = extractGenerativeUi(textWithoutReasoning);

      return {
        reply: cleanText || textWithoutReasoning || rawReplyText,
        reasoning: reasoning || null,
        generativeUi: generativeUi || null,
        usedModel: modelName,
      };
    } catch (err) {
      const status = err.status || err.statusCode || (err.message?.includes('404') ? 404 : undefined);
      const safeErrStr = safeLogMessage(err.message || 'Unknown error');
      console.warn(`⚠️ Model "${modelName}" failed [Status: ${status || 'N/A'}]: ${safeErrStr}`);

      lastError = err;

      // If model not found (404), demand spike (503), internal (500), gateway (502/504), or rate limit (429), try next model candidate
      const isRecoverableError =
        status === 404 ||
        status === 503 ||
        status === 500 ||
        status === 502 ||
        status === 504 ||
        status === 429 ||
        err.message?.includes('404') ||
        err.message?.includes('503') ||
        err.message?.includes('high demand') ||
        err.message?.includes('not found') ||
        err.message?.includes('no longer available') ||
        err.message?.includes('is not supported for generateContent');

      if (isRecoverableError) {
        continue;
      }

      // If invalid key (401) or bad request (400), stop fallback loop and throw immediately
      if (status === 401 || status === 400) {
        break;
      }
    }
  }

  // Classify and throw final error
  const finalStatus = lastError?.status || lastError?.statusCode;
  const safeFinalMsg = safeLogMessage(lastError?.message || 'Unknown error');
  console.error(`❌ All Gemini API attempts failed. Final status: ${finalStatus || 'N/A'} - ${safeFinalMsg}`);

  if (
    finalStatus === 429 ||
    lastError?.message?.includes('429') ||
    lastError?.message?.includes('RESOURCE_EXHAUSTED') ||
    lastError?.message?.includes('Quota exceeded')
  ) {
    lastError.code = 'RATE_LIMIT_QUOTA';
  } else if (
    finalStatus === 401 ||
    lastError?.message?.includes('401') ||
    lastError?.message?.includes('API_KEY_INVALID') ||
    lastError?.message?.includes('API key not valid')
  ) {
    lastError.code = 'INVALID_API_KEY';
  }

  throw lastError;
};

module.exports = {
  isConfigured,
  generateChatResponse,
  safeLogMessage,
  extractGenerativeUi,
  getAvailablePersonas,
};
