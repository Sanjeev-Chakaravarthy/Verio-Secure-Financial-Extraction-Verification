import { parseRawTransactionText } from "../src/utils/parser";

describe("Transaction Extraction Logic", () => {
  it("should extract food transaction correctly", () => {
    const text = "22/10/2023 SWIGGY ORDER Rs.450.00 debit";
    const result = parseRawTransactionText(text);

    expect(result.amount).toBe(-450);
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

  // Sample 1 from assignment spec
  it("should parse Sample 1 (structured bank format)", () => {
    const text = `Date: 11 Dec 2025\nDescription: STARBUCKS COFFEE MUMBAI\nAmount: -420.00\nBalance after transaction: 18,420.50`;
    const result = parseRawTransactionText(text);

    expect(result.amount).toBe(-420);
    expect(result.merchant.toUpperCase()).toContain("STARBUCKS");
    expect(result.amountMatch).toBe(true);
    expect(result.dateMatch).toBe(true);
    expect(result.finalConfidenceScore).toBeGreaterThan(0.7);
  });

  // Sample 2 from assignment spec
  it("should parse Sample 2 (Uber-style SMS format)", () => {
    const text = `Uber Ride * Airport Drop\n12/11/2025 → ₹1,250.00 debited\nAvailable Balance → ₹17,170.50`;
    const result = parseRawTransactionText(text);

    expect(result.amount).toBe(-1250);
    expect(result.merchant.toUpperCase()).toContain("UBER");
    expect(result.category).toBe("Transport");
    expect(result.amountMatch).toBe(true);
    expect(result.dateMatch).toBe(true);
  });

  // Sample 3 from assignment spec
  it("should parse Sample 3 (messy raw format)", () => {
    const text = `txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping`;
    const result = parseRawTransactionText(text);

    expect(result.amount).toBe(-2999);
    expect(result.merchant.toUpperCase()).toContain("AMAZON");
    expect(result.amountMatch).toBe(true);
    expect(result.dateMatch).toBe(true);
  });
});
