// --- Model fallback ---------------------------------------------------
// Gemini occasionally returns a 503 "high demand" error on the default
// scanning model. When that happens, switch to a secondary model for about
// an hour, then automatically revert to the default. State lives in
// localStorage so the switch survives navigating away from scan.html.

const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash';
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-pro';
const GEMINI_FALLBACK_DURATION_MS = 60 * 60 * 1000; // ~1 hour
const GEMINI_MODEL_STATE_KEY = 'gemini_model_state';

// Substring match (case-insensitive) on Gemini's overload message, so small
// wording tweaks on Google's side don't silently break the fallback:
// "This model is currently experiencing high demand. Spikes in demand are
// usually temporary. Please try again later."
const GEMINI_HIGH_DEMAND_SNIPPET = 'currently experiencing high demand';

function isHighDemandError(status, message) {
  return status === 503 && typeof message === 'string' && message.toLowerCase().includes(GEMINI_HIGH_DEMAND_SNIPPET);
}

// Reads which model should be used right now, silently reverting to the
// default if a previously-activated fallback window has expired.
function getGeminiModelState() {
  let state = null;
  try {
    state = JSON.parse(localStorage.getItem(GEMINI_MODEL_STATE_KEY));
  } catch (e) {
    state = null;
  }

  if (state && state.model === GEMINI_FALLBACK_MODEL && state.revertAt) {
    if (Date.now() >= state.revertAt) {
      localStorage.removeItem(GEMINI_MODEL_STATE_KEY);
      return { model: GEMINI_DEFAULT_MODEL };
    }
    return state;
  }

  return { model: GEMINI_DEFAULT_MODEL };
}

function activateGeminiFallbackModel() {
  const state = {
    model: GEMINI_FALLBACK_MODEL,
    revertAt: Date.now() + GEMINI_FALLBACK_DURATION_MS
  };
  localStorage.setItem(GEMINI_MODEL_STATE_KEY, JSON.stringify(state));

  if (typeof showToast === 'function') {
    showToast(`${GEMINI_DEFAULT_MODEL} is experiencing high demand — switched to ${GEMINI_FALLBACK_MODEL} for about an hour.`);
  }

  scheduleGeminiFallbackRevert();
}

// If the fallback is currently active, arm a timer so that a page left open
// past the hour mark reverts (and notifies) live instead of only on the
// next scan attempt. Safe to call repeatedly (e.g. on every page load).
let geminiRevertTimeoutId = null;
function scheduleGeminiFallbackRevert() {
  clearTimeout(geminiRevertTimeoutId);

  const state = getGeminiModelState();
  if (state.model !== GEMINI_FALLBACK_MODEL || !state.revertAt) return;

  const msRemaining = Math.max(0, state.revertAt - Date.now());
  geminiRevertTimeoutId = setTimeout(() => {
    const stillActive = getGeminiModelState(); // clears state if expired
    if (stillActive.model === GEMINI_DEFAULT_MODEL && typeof showToast === 'function') {
      showToast(`Back to ${GEMINI_DEFAULT_MODEL} for scanning.`);
    }
  }, msRemaining);
}

// Calls the Gemini API with a specific model, isolating the timeout/network
// handling from the fallback-retry logic in scanDiaryPage().
async function callGeminiModel(model, payload, timeoutMs) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': CONFIG.GEMINI_API_KEY
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // Error body wasn't JSON — fall through with an empty errorData.
      }
      const message = errorData.error?.message || 'Unknown error';
      const err = new Error(`Gemini API error: ${message}`);
      err.status = response.status;
      err.isHighDemand = isHighDemandError(response.status, message);
      throw err;
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini API');
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Scan timed out — check your connection and try again.');
    }
    throw error;
  }
}

/**
 * Scan a handwritten diary page using Gemini (gemini-3.5-flash by default,
 * automatically falling back to gemini-2.5-pro for about an hour if the
 * default model reports it's overloaded).
 * Returns parsed Jama and Udhar entries from the image
 */
async function scanDiaryPage(imageBase64, mimeType) {
  if (!CONFIG.GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  const prompt = `You are reading a photograph of a single handwritten Indian business ledger diary page.

CRITICAL LAYOUT RULE: Both JAMA and UDHAR entries appear on the SAME page, split by a vertical line or implied column boundary down the middle of the page:
- LEFT HALF of the page = JAMA: people/firms who GAVE money to us or made a payment to us.
- RIGHT HALF of the page = UDHAR: people/firms who BORROWED money or goods from us on credit.

There is no separate page for each side. Both columns are visible simultaneously in the same photograph. Use the physical left/right position of each entry on the page to determine whether it is Jama or Udhar — do not guess from context.

Each entry contains a NAME and an AMOUNT in Indian Rupees. Names are written in English.
Amounts may be written as numerals (1000, 1,500), in words ("two thousand"), or abbreviations ("2k", "1.5k"). Convert all to integers.

Return ONLY a valid JSON object. No explanation. No markdown. No code fences. Exactly this structure:
{
  "jama": [{"name": "Name as written", "amount": 1000}],
  "udhar": [{"name": "Name as written", "amount": 2500}]
}

If one half is empty or illegible, return an empty array for that side.
If the image is not a ledger page at all, return {"jama": [], "udhar": [], "error": "Not a ledger page"}.
If an entry's left/right position is ambiguous, include it in both arrays with a flag: {"name": "Name", "amount": 500, "ambiguous": true}.
Convert all amounts to integers. Never invent entries not visible in the image.`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: prompt
          },
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: imageBase64
            }
          }
        ]
      }
    ]
  };

  // Without this, a slow/flaky mobile connection leaves the fetch pending
  // indefinitely — no error, no timeout, just the loading shimmer forever.
  // Aborting after 45s turns that into a clear, recoverable error instead.
  const REQUEST_TIMEOUT_MS = 45000;

  try {
    const modelState = getGeminiModelState();
    let data;

    try {
      data = await callGeminiModel(modelState.model, payload, REQUEST_TIMEOUT_MS);
    } catch (error) {
      if (error.isHighDemand && modelState.model !== GEMINI_FALLBACK_MODEL) {
        // Default model is overloaded — switch and retry once, transparently.
        activateGeminiFallbackModel();
        data = await callGeminiModel(GEMINI_FALLBACK_MODEL, payload, REQUEST_TIMEOUT_MS);
      } else if (error.isHighDemand) {
        // Already on the fallback model and it's overloaded too.
        throw new Error('Both the default and fallback Gemini models are currently overloaded. Please try again shortly.');
      } else {
        throw error;
      }
    }

    const responseText = data.candidates[0].content.parts[0].text;

    // Clean markdown code fences if present
    const cleaned = responseText.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`Failed to parse Gemini response as JSON: ${cleaned.substring(0, 100)}`);
    }

    // Validate and clean entries
    const validateEntries = (entries) => {
      if (!Array.isArray(entries)) return [];
      return entries
        .filter((entry) => {
          // Must have a non-empty name string and positive integer amount
          return (
            typeof entry.name === 'string' &&
            entry.name.trim().length > 0 &&
            typeof entry.amount === 'number' &&
            Number.isInteger(entry.amount) &&
            entry.amount > 0
          );
        })
        .map((entry) => ({
          name: entry.name.trim(),
          amount: entry.amount,
          ...(entry.ambiguous && { ambiguous: true })
        }));
    };

    const jama = validateEntries(parsed.jama);
    const udhar = validateEntries(parsed.udhar);

    // Separate ambiguous entries
    const ambiguous = [];
    const jamaClean = jama.filter((e) => {
      if (e.ambiguous) {
        ambiguous.push(e);
        return false;
      }
      return true;
    });
    const udharClean = udhar.filter((e) => {
      if (e.ambiguous) {
        return false; // Already in ambiguous
      }
      return true;
    });

    return {
      jama: jamaClean,
      udhar: udharClean,
      ambiguous: ambiguous,
      error: parsed.error || null
    };
  } catch (error) {
    // Timeouts are already converted to a friendly message inside
    // callGeminiModel(), so nothing extra to translate here.
    throw error;
  }
}
