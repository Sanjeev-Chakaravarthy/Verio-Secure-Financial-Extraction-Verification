const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Clear old data
  await prisma.auditLog.deleteMany({});
  await prisma.parseResult.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: "Lakeview Consulting",
    },
  });

  // 2. Create Users
  const userSanjeev = await prisma.user.create({
    data: {
      name: "Sanjeev Kumar",
      email: "sanjeev@lakeview.com",
    },
  });

  const userAlex = await prisma.user.create({
    data: {
      name: "Alex Sharma",
      email: "alex@lakeview.com",
    },
  });

  const userJane = await prisma.user.create({
    data: {
      name: "Jane Doe",
      email: "jane@lakeview.com",
    },
  });

  // 3. Create memberships
  await prisma.membership.create({
    data: { organizationId: org.id, userId: userSanjeev.id, role: "Owner" }
  });
  await prisma.membership.create({
    data: { organizationId: org.id, userId: userAlex.id, role: "Member" }
  });
  await prisma.membership.create({
    data: { organizationId: org.id, userId: userJane.id, role: "Member" }
  });

  // 4. Create Transactions & Parse Results
  const t1 = await prisma.transaction.create({
    data: {
      organizationId: org.id,
      date: new Date("2025-12-11T10:15:00Z"),
      description: "STARBUCKS COFFEE MUMBAI",
      amount: -420.00,
      category: "Food & Beverage",
      rawText: "STARBUCKS COFFEE MUMBAI / 11/12/2025 / ₹420.00 DEBIT",
    }
  });
  await prisma.parseResult.create({
    data: {
      transactionId: t1.id,
      merchant: "STARBUCKS COFFEE MUMBAI",
      amount: -420.00,
      date: new Date("2025-12-11T10:15:00Z"),
      category: "Food & Beverage",
      merchantMatch: true,
      amountMatch: true,
      dateMatch: true,
      categoryMatch: true,
      finalConfidenceScore: 0.98,
    }
  });

  const t2 = await prisma.transaction.create({
    data: {
      organizationId: org.id,
      date: new Date("2025-12-11T09:30:00Z"),
      description: "Uber Ride Airport Drop",
      amount: -1250.00,
      category: "Transport",
      rawText: "Uber Ride Airport Drop / 12/11/2025 / ₹1250.00 debited",
    }
  });
  await prisma.parseResult.create({
    data: {
      transactionId: t2.id,
      merchant: "Uber Ride Airport Drop",
      amount: -1250.00,
      date: new Date("2025-12-11T09:30:00Z"),
      category: "Transport",
      merchantMatch: true,
      amountMatch: true,
      dateMatch: true,
      categoryMatch: true,
      finalConfidenceScore: 0.95,
    }
  });

  const t3 = await prisma.transaction.create({
    data: {
      organizationId: org.id,
      date: new Date("2025-12-10T14:22:00Z"),
      description: "Amazon.in Order #403-1234567-8901234",
      amount: -2999.00,
      category: "Shopping",
      rawText: "Amazon.in Order #403-1234567-8901234 / ₹2999.00 / Shopping",
    }
  });
  await prisma.parseResult.create({
    data: {
      transactionId: t3.id,
      merchant: "Amazon.in Order #403-1234567-8901234",
      amount: -2999.00,
      date: new Date("2025-12-10T14:22:00Z"),
      category: "Shopping",
      merchantMatch: true,
      amountMatch: true,
      dateMatch: true,
      categoryMatch: true,
      finalConfidenceScore: 0.88,
    }
  });

  const t4 = await prisma.transaction.create({
    data: {
      organizationId: org.id,
      date: new Date("2025-12-09T18:40:00Z"),
      description: "Swiggy Order - Koramangala",
      amount: -540.00,
      category: "Food & Beverage",
      rawText: "Swiggy Order - Koramangala / 09/12/2025 → ₹540.00 debited",
    }
  });
  await prisma.parseResult.create({
    data: {
      transactionId: t4.id,
      merchant: "Swiggy Order - Koramangala",
      amount: -540.00,
      date: new Date("2025-12-09T18:40:00Z"),
      category: "Food & Beverage",
      merchantMatch: true,
      amountMatch: true,
      dateMatch: true,
      categoryMatch: true,
      finalConfidenceScore: 0.96,
    }
  });

  const t5 = await prisma.transaction.create({
    data: {
      organizationId: org.id,
      date: new Date("2025-12-01T09:00:00Z"),
      description: "Salary Credit",
      amount: 45000.00,
      category: "Income",
      rawText: "Salary Credit - Lakeview Consulting / 01/12/2025 → ₹45,000.00 credited",
    }
  });
  await prisma.parseResult.create({
    data: {
      transactionId: t5.id,
      merchant: "Salary Credit",
      amount: 45000.00,
      date: new Date("2025-12-01T09:00:00Z"),
      category: "Income",
      merchantMatch: true,
      amountMatch: true,
      dateMatch: true,
      categoryMatch: true,
      finalConfidenceScore: 1.00,
    }
  });

  // 5. Create Audit Logs
  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: userSanjeev.id,
      eventName: "Transaction Parsed",
      details: "STARBUCKS COFFEE MUMBAI (-₹420.00)",
      timestamp: new Date("2025-12-11T10:15:00Z"),
    }
  });

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: userSanjeev.id,
      eventName: "User Signed In",
      details: "sanjeev@lakeview.com",
      timestamp: new Date("2025-12-11T08:00:00Z"),
    }
  });

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: userSanjeev.id,
      eventName: "Workspace Created",
      details: "Lakeview Consulting",
      timestamp: new Date("2025-12-01T08:00:00Z"),
    }
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
