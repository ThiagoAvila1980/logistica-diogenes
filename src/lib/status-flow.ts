/**
 * Fluxo compartilhado entre Server Actions, Kanban e UI.
 */
export { STATUS_FLOW } from "@/lib/workflow/status-machine";

export {
  ADVANCE_STATUS_FLOW,
  ADVANCE_TARGET_STATUSES,
  isAllowedAdvance,
  getNextAdvanceStep,
  type AdvanceTargetStatus,
} from "@/lib/workflow/advance-flow";
