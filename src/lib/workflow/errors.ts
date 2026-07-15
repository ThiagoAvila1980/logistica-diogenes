/**
 * Erro de regra de negócio em actions de workflow.
 *
 * Permite abortar uma transação (rollback) e converter a falha em uma
 * resposta amigável `{ success: false, message, reason? }` no nível da action.
 */
export class WorkflowActionError extends Error {
  constructor(
    message: string,
    public reason?: "gate_locked",
  ) {
    super(message);
    this.name = "WorkflowActionError";
  }
}
