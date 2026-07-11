/**
 * Scan a handwritten diary page using Gemini 3.5 Flash
 * Returns parsed Jama and Udhar entries from the image
 */
async function scanDiaryPage(imageBase64, mimeType) {
  if (!CONFIG.GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`;

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini API');
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
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Scan timed out — check your connection and try again.');
    }
    throw error;
  }
}
