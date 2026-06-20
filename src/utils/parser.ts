export function parseRawTransactionText(text: string) {
  const normalized = text.toLowerCase();
  
  let date = new Date();
  let foundDate = false;
  let textWithoutDate = text;

  const datePatterns = [
    /(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/gi,
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/gi,
    /(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})/gi
  ];

  for (const pattern of datePatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      foundDate = true;
      textWithoutDate = text.replace(match[0], "");
      
      if (match[2] && isNaN(Number(match[2]))) {
        const day = parseInt(match[1]);
        const monthStr = match[2].toLowerCase();
        const year = parseInt(match[3]);
        const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const monthIndex = months.findIndex(m => monthStr.startsWith(m));
        date = new Date(year, monthIndex >= 0 ? monthIndex : 0, day, 12, 0, 0);
      } else {
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

  let amount = -100.00;
  let foundAmount = false;
  const isCredit = normalized.includes("credit") || normalized.includes("credited") || normalized.includes("received") || normalized.includes("deposited");

  const explicitAmtMatch = textWithoutDate.match(/(?:amount|amt|total)\s*[:\-]?\s*(?:rs\.?|inr|₹|\$)?\s*(-?[\d,]+(?:\.\d{2})?)/i);
  if (explicitAmtMatch) {
    const val = parseFloat(explicitAmtMatch[1].replace(/,/g, ""));
    if (!isNaN(val)) {
      amount = val;
      foundAmount = true;
    }
  }

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

  if (!foundAmount) {
    const floatMatches = [...textWithoutDate.matchAll(/(-?[\d,]+\.\d{2})/g)];
    for (const match of floatMatches) {
      const val = parseFloat(match[1].replace(/,/g, ""));
      const isBalance = textWithoutDate.toLowerCase().substring(0, match.index).includes("balance");
      if (!isNaN(val) && !isBalance) {
        amount = val;
        foundAmount = true;
        break;
      }
    }
  }

  if (foundAmount && amount > 0 && !isCredit && (
    normalized.includes("debit") ||
    normalized.includes("debited") ||
    normalized.includes("paid") ||
    normalized.includes("charged") ||
    /\bdr\b/.test(normalized)           // "Dr" = Debit in banking (e.g. "₹2,999.00 Dr")
  )) {
    amount = -amount;
  }


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

  const merchantMatch = merchant !== "Unknown Merchant" && merchant !== "Dynamic Merchant";
  const amountMatch = foundAmount;
  const dateMatch = foundDate;
  const categoryMatch = category !== "Miscellaneous";

  let matches = 0;
  if (merchantMatch) matches++;
  if (amountMatch) matches++;
  if (dateMatch) matches++;
  if (categoryMatch) matches++;

  const finalConfidenceScore = 0.50 + (matches * 0.12);

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
