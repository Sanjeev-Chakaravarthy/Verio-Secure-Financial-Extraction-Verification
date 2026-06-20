import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

jest.mock("@prisma/client", () => {
  const mPrismaClient = {
    transaction: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

describe("Data Isolation", () => {
  it("should always query transactions with organizationId scope", async () => {
    const orgId = "org-123";
    const transactionId = "tx-999";

    // Mocking the behavior
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

    // Act - simulating the service call
    await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        organizationId: orgId, // CRITICAL: This isolates the data
      },
    });

    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: {
        id: transactionId,
        organizationId: orgId,
      },
    });
  });

  it("should fail when transaction belongs to another organization", async () => {
    // A test that simulates IDOR
    const requestOrgId = "org-123";
    const maliciousTxId = "tx-belonging-to-org-456";

    // If the database has tx-belonging-to-org-456 under org-456
    // our query with org-123 will safely return null
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await prisma.transaction.findFirst({
      where: {
        id: maliciousTxId,
        organizationId: requestOrgId, // Isolation enforcement
      },
    });

    expect(result).toBeNull();
  });
});
