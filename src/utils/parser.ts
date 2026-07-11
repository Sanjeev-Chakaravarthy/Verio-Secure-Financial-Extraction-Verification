import type { ParsedTransaction } from "@/lib/types";

/**
 * Parses raw, unstructured financial transaction text into a structured
 * {@link ParsedTransaction} object.
 *
 * The parser uses a layered regex approach:
 * 1. Extract date using multiple format patterns (DD/MM/YYYY, YYYY-MM-DD, DD Mon YYYY)
 * 2. Extract merchant/description from remaining text
 * 3. Extract amount via explicit labels, currency symbols, or floating-point fallback
 * 4. Categorize using keyword matching
 * 5. Compute a **weighted** confidence score based on extraction quality
 *
 * @param text - Raw transaction string (bank SMS, statement line, wire confirmation)
 * @returns Structured parse result with confidence breakdown
 *
 * @example
 * ```ts
 * const result = parseRawTransactionText("22/10/2023 SWIGGY ORDER Rs.450.00 debit");
 * // { merchant: "SWIGGY ORDER", amount: -450, category: "Food & Beverage", ... }
 * ```
 */
export function parseRawTransactionText(text: string): ParsedTransaction {
  const normalized = text.toLowerCase();

  // ── Step 1: Date Extraction ──────────────────────────────────
  let date = new Date();
  let foundDate = false;
  let textWithoutDate = text;

  const datePatterns = [
    /(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/gi,
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/gi,
    /(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})/gi,
  ];

  for (const pattern of datePatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      foundDate = true;
      textWithoutDate = text.replace(match[0], "");

      if (match[2] && isNaN(Number(match[2]))) {
        // Named month format: "14 Nov 2023"
        const day = parseInt(match[1]);
        const monthStr = match[2].toLowerCase();
        const year = parseInt(match[3]);
        const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const monthIndex = months.findIndex(m => monthStr.startsWith(m));
        date = new Date(year, monthIndex >= 0 ? monthIndex : 0, day, 12, 0, 0);
      } else {
        // Numeric format: disambiguate DD/MM vs MM/DD
        const part1 = parseInt(match[1]);
        const part2 = parseInt(match[2]);
        const year = parseInt(match[3]);

        let day = part1;
        let month = part2 - 1;
        if (part1 > 12 && part2 <= 12) {
          day = part1;
          month = part2 - 1;
        } else if (part2 > 12 && part1 <= 12) {
          day = part2;
          month = part1 - 1;
        }
        date = new Date(year, month, day, 12, 0, 0);
      }
      break;
    }
  }

  // ── Step 2: Merchant / Description Extraction ────────────────
  let merchant = "Unknown Merchant";
  const cleanLines = textWithoutDate.split(/[\n/→|]+/).map(l => l.trim()).filter(Boolean);

  const descTagMatch = textWithoutDate.match(/(?:description|desc|merchant|payee)\s*[:\-]\s*([^/\n\r]+)/i);
  if (descTagMatch) {
    merchant = descTagMatch[1].trim();
  } else if (cleanLines.length > 0) {
    const firstSeg = cleanLines[0].replace(/(?:date|description|desc|amount|amt|balance|after transaction)\s*[:\-]?/gi, "").trim();
    merchant = firstSeg.replace(/[#\d\-\*→]/g, "").trim();
    if (!merchant) merchant = "Dynamic Merchant";
  }

  // ── Step 3: Amount Extraction ────────────────────────────────
  let amount = -100.00;
  let foundAmount = false;
  const isCredit = normalized.includes("credit") || normalized.includes("credited") || normalized.includes("received") || normalized.includes("deposited");

  // Try explicit amount labels first (most reliable)
  const explicitAmtMatch = textWithoutDate.match(/(?:amount|amt|total)\s*[:\-]?\s*(?:rs\.?|inr|₹|\$)?\s*(-?[\d,]+(?:\.\d{2})?)/i);
  if (explicitAmtMatch) {
    const val = parseFloat(explicitAmtMatch[1].replace(/,/g, ""));
    if (!isNaN(val)) {
      amount = val;
      foundAmount = true;
    }
  }

  // Try currency symbol patterns
  if (!foundAmount) {
    const currencyAmtMatch = textWithoutDate.match(/(?:rs\.?|inr|₹|\$)\s*(-?[\d,]+(?:\.\d{2})?)/i) || textWithoutDate.match(/(-?)\s*(?:rs\.?|inr|₹|\$)\s*([\d,]+(?:\.\d{2})?)/i);
    if (currencyAmtMatch) {
      let valStr = "";
      if (currencyAmtMatch[2]) {
        valStr = (currencyAmtMatch[1] === "-" ? "-" : "") + currencyAmtMatch[2];
      } else {
        valStr = currencyAmtMatch[1];
      }
      const val = parseFloat(valStr.replace(/,/g, ""));
      if (!isNaN(val)) {
        amount = val;
        foundAmount = true;
      }
    }
  }

  // Fallback: find any decimal number that isn't the balance
  if (!foundAmount) {
    const floatMatches = [...textWithoutDate.matchAll(/(-?[\d,]+\.\d{2})/g)];
    for (const match of floatMatches) {
      const val = parseFloat(match[1].replace(/,/g, ""));
      const precedingText = textWithoutDate.toLowerCase().substring(0, match.index);
      const isBalance = precedingText.includes("balance");
      if (!isNaN(val) && !isBalance) {
        amount = val;
        foundAmount = true;
        break;
      }
    }
  }

  // Apply debit sign if keywords indicate a debit
  if (foundAmount && amount > 0 && !isCredit && (
    normalized.includes("debit") ||
    normalized.includes("debited") ||
    normalized.includes("paid") ||
    normalized.includes("charged") ||
    /\bdr\b/.test(normalized) // "Dr" = Debit in banking (e.g. "₹2,999.00 Dr")
  )) {
    amount = -amount;
  }

  // ── Step 4: Category Classification ──────────────────────────
  let category = "Miscellaneous";
  if (normalized.includes("coffee") || normalized.includes("starbucks") || normalized.includes("swiggy") || normalized.includes("zomato") || normalized.includes("food") || normalized.includes("restaurant") || normalized.includes("cafe")) {
    category = "Food & Beverage";
  } else if (normalized.includes("uber") || normalized.includes("ola") || normalized.includes("ride") || normalized.includes("cab") || normalized.includes("flight") || normalized.includes("transport") || normalized.includes("travel")) {
    category = "Transport";
  } else if (normalized.includes("amazon") || normalized.includes("flipkart") || normalized.includes("shopping") || normalized.includes("order") || normalized.includes("purchase")) {
    category = "Shopping";
  } else if (isCredit || normalized.includes("salary") || normalized.includes("dividend") || normalized.includes("interest")) {
    category = "Income";
  }

  // ── Step 5: Confidence Score (Weighted) ──────────────────────
  // Each field has a weight reflecting its extraction reliability.
  // If all four fields are successfully extracted, score approaches 1.0.
  // If no fields are extracted, score is 0.0 — not a misleading 50%.
  const merchantMatch = merchant !== "Unknown Merchant" && merchant !== "Dynamic Merchant";
  const amountMatch = foundAmount;
  const dateMatch = foundDate;
  const categoryMatch = category !== "Miscellaneous";

  const WEIGHTS = {
    amount: 0.35,   // Most reliable — regex on currency symbols
    date: 0.25,     // Strong — date format patterns
    merchant: 0.25, // Moderate — heuristic extraction
    category: 0.15, // Weak — keyword matching only
  };

  let finalConfidenceScore = 0;
  if (amountMatch) finalConfidenceScore += WEIGHTS.amount;
  if (dateMatch) finalConfidenceScore += WEIGHTS.date;
  if (merchantMatch) finalConfidenceScore += WEIGHTS.merchant;
  if (categoryMatch) finalConfidenceScore += WEIGHTS.category;

  return {
    merchant,
    amount,
    date,
    category,
    merchantMatch,
    amountMatch,
    dateMatch,
    categoryMatch,
    finalConfidenceScore,
  };
}
