import { describe, it, expect } from "vitest";

// Unit tests for rule matching logic (doesn't need Redis/BullMQ running)
function evaluateCondition(condition: string, count: number, threshold: number): boolean {
  switch (condition) {
    case "count_gte":
      return count >= threshold;
    case "count_gt":
      return count > threshold;
    case "count_eq":
      return count === threshold;
    default:
      return false;
  }
}

describe("Rule Matching", () => {
  it("count_gte triggers at threshold", () => {
    expect(evaluateCondition("count_gte", 5, 5)).toBe(true);
    expect(evaluateCondition("count_gte", 6, 5)).toBe(true);
    expect(evaluateCondition("count_gte", 4, 5)).toBe(false);
  });

  it("count_gt triggers above threshold", () => {
    expect(evaluateCondition("count_gt", 5, 5)).toBe(false);
    expect(evaluateCondition("count_gt", 6, 5)).toBe(true);
  });

  it("count_eq triggers at exact threshold", () => {
    expect(evaluateCondition("count_eq", 5, 5)).toBe(true);
    expect(evaluateCondition("count_eq", 4, 5)).toBe(false);
    expect(evaluateCondition("count_eq", 6, 5)).toBe(false);
  });
});
