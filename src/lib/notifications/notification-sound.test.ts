import { describe, expect, it } from "vitest";
import { shouldPlayNotificationSound } from "./notification-sound";

describe("shouldPlayNotificationSound", () => {
  it("não toca no carregamento inicial", () => {
    expect(shouldPlayNotificationSound(null, 3, true)).toBe(false);
  });

  it("toca quando o contador de não lidas sobe", () => {
    expect(shouldPlayNotificationSound(0, 1, true)).toBe(true);
    expect(shouldPlayNotificationSound(2, 5, true)).toBe(true);
  });

  it("não toca quando o contador cai ou fica igual", () => {
    expect(shouldPlayNotificationSound(3, 3, true)).toBe(false);
    expect(shouldPlayNotificationSound(3, 1, true)).toBe(false);
  });

  it("não toca com a aba oculta", () => {
    expect(shouldPlayNotificationSound(0, 2, false)).toBe(false);
  });
});
