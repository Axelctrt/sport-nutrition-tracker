import { formatGoalValue } from "@/features/goals/components/GoalCard";

describe("GoalCard", () => {
  it("arrondit les distances restantes en kilomètres à une décimale", () => {
    expect(formatGoalValue(0.1000000000124, "km")).toBe("0,1 km");
    expect(formatGoalValue(12.349, "km")).toBe("12,3 km");
  });

  it("conserve deux décimales maximum pour les autres unités", () => {
    expect(formatGoalValue(70.126, "kg")).toBe("70,13 kg");
  });
});
