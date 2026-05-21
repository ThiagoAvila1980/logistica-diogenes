import type { OsStatus } from "@/db/schema";

export type AdvanceFormState = {
  success: boolean;
  message: string;
  status: OsStatus;
};

export function createInitialAdvanceFormState(
  status: OsStatus,
): AdvanceFormState {
  return {
    success: true,
    message: "",
    status,
  };
}
