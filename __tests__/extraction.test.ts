import { parseRawTransactionText } from "../src/utils/parser";

describe("Transaction Extraction Logic", () => {
  it("should extract food transaction correctly", () => {
    const text = "22/10/2023 SWIGGY ORDER Rs.450.00 debit";
    const result = parseRawTransactionText(text);

    expect(result.amount).toBe(-450);
    // The parser removes the date, but leaves the rest as the merchant name if no "Desc:" tag
    expect(result.merchant).toContain("SWIGGY ORDER");
    expect(result.category).toBe("Food & Beverage");
    expect(result.merchantMatch).toBe(true);
    expect(result.amountMatch).toBe(true);
    expect(result.dateMatch).toBe(true);
    expect(result.categoryMatch).toBe(true);
    expect(result.finalConfidenceScore).toBeGreaterThan(0.9);
  });

  it("should extract salary credit correctly", () => {
    const text = "01-11-2023 SALARY CREDIT +$5,000.00";
    const result = parseRawTransactionText(text);

    expect(result.amount).toBe(5000);
    expect(result.merchant).toContain("SALARY CREDIT");
    expect(result.category).toBe("Income");
    expect(result.amountMatch).toBe(true);
    expect(result.dateMatch).toBe(true);
    expect(result.finalConfidenceScore).toBeGreaterThan(0.9);
  });

  it("should extract transport debit correctly", () => {
    const text = "14 Nov 2023 UBER RIDE ₹ 320.00 debit";
    const result = parseRawTransactionText(text);

    expect(result.amount).toBe(-320);
    expect(result.merchant).toContain("UBER");
    expect(result.category).toBe("Transport");
    expect(result.amountMatch).toBe(true);
    expect(result.dateMatch).toBe(true);
  });

  it("should fallback gracefully on unparsable text", () => {
    const text = "Some random text without numbers";
    const result = parseRawTransactionText(text);

    expect(result.amount).toBe(-100);
    expect(result.amountMatch).toBe(false);
    expect(result.dateMatch).toBe(false);
  });
});
