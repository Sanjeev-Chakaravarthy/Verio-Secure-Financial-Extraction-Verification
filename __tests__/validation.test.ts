import {
  ParseTransactionSchema,
  RegisterSchema,
  InviteSchema,
  UpdateRoleSchema,
  UpdateWorkspaceSchema,
  CompleteSetupSchema,
} from "../src/lib/validations";

describe("Zod Validation Schemas", () => {
  describe("ParseTransactionSchema", () => {
    it("accepts valid transaction text", () => {
      const result = ParseTransactionSchema.safeParse({ text: "22/10/2023 SWIGGY Rs.450" });
      expect(result.success).toBe(true);
    });

    it("rejects empty text", () => {
      const result = ParseTransactionSchema.safeParse({ text: "" });
      expect(result.success).toBe(false);
    });

    it("rejects missing text field", () => {
      const result = ParseTransactionSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects text exceeding 2000 characters", () => {
      const longText = "a".repeat(2001);
      const result = ParseTransactionSchema.safeParse({ text: longText });
      expect(result.success).toBe(false);
    });

    it("accepts text at exactly 2000 characters", () => {
      const maxText = "a".repeat(2000);
      const result = ParseTransactionSchema.safeParse({ text: maxText });
      expect(result.success).toBe(true);
    });
  });

  describe("RegisterSchema", () => {
    const validData = {
      fullName: "Jane Doe",
      email: "jane@company.com",
      password: "secure123",
      orgName: "Acme Corp",
    };

    it("accepts valid registration data", () => {
      const result = RegisterSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = RegisterSchema.safeParse({ ...validData, email: "not-an-email" });
      expect(result.success).toBe(false);
    });

    it("rejects short password", () => {
      const result = RegisterSchema.safeParse({ ...validData, password: "12345" });
      expect(result.success).toBe(false);
    });

    it("rejects short full name", () => {
      const result = RegisterSchema.safeParse({ ...validData, fullName: "J" });
      expect(result.success).toBe(false);
    });

    it("allows optional orgName for invited users", () => {
      const { orgName: _, ...withoutOrg } = validData;
      const result = RegisterSchema.safeParse(withoutOrg);
      expect(result.success).toBe(true);
    });
  });

  describe("InviteSchema", () => {
    it("accepts valid email", () => {
      const result = InviteSchema.safeParse({ email: "colleague@company.com" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = InviteSchema.safeParse({ email: "bad" });
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateRoleSchema", () => {
    it('accepts "Owner"', () => {
      const result = UpdateRoleSchema.safeParse({ role: "Owner" });
      expect(result.success).toBe(true);
    });

    it('accepts "Member"', () => {
      const result = UpdateRoleSchema.safeParse({ role: "Member" });
      expect(result.success).toBe(true);
    });

    it('rejects "Admin"', () => {
      const result = UpdateRoleSchema.safeParse({ role: "Admin" });
      expect(result.success).toBe(false);
    });

    it("rejects empty role", () => {
      const result = UpdateRoleSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateWorkspaceSchema", () => {
    it("accepts valid workspace name", () => {
      const result = UpdateWorkspaceSchema.safeParse({ name: "Acme Corp" });
      expect(result.success).toBe(true);
    });

    it("rejects name shorter than 2 chars", () => {
      const result = UpdateWorkspaceSchema.safeParse({ name: "A" });
      expect(result.success).toBe(false);
    });

    it("rejects name longer than 100 chars", () => {
      const result = UpdateWorkspaceSchema.safeParse({ name: "x".repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  describe("CompleteSetupSchema", () => {
    it("accepts valid setup data", () => {
      const result = CompleteSetupSchema.safeParse({
        fullName: "Jane Doe",
        orgName: "Acme Corp",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing orgName", () => {
      const result = CompleteSetupSchema.safeParse({ fullName: "Jane" });
      expect(result.success).toBe(false);
    });

    it("rejects missing fullName", () => {
      const result = CompleteSetupSchema.safeParse({ orgName: "Acme" });
      expect(result.success).toBe(false);
    });
  });
});
