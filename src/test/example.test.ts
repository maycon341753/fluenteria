import { describe, it, expect } from "vitest";
import { computeAmountCentsForPlan } from "../../api/asaas/create-credit-card-checkout";

describe("example", () => {
  it("calcula valor anual com desconto", () => {
    const plan = {
      id: "p1",
      name: "Premium",
      price_cents: 500,
      currency: "BRL",
      interval: "month" as const,
      annual_discount_percent: 10,
    };
    expect(computeAmountCentsForPlan(plan, "year")).toBe(5400);
    expect(computeAmountCentsForPlan(plan, "month")).toBe(500);
  });
});
