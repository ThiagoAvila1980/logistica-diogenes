export const AUDIT_ACTIONS = {
  CUTTING_STEP_CHECKED: "cutting.step_checked",
  CUTTING_STEP_UNCHECKED: "cutting.step_unchecked",
  CUTTING_NOTES_UPDATED: "cutting.notes_updated",
  CUTTING_DRAWING_UPDATED: "cutting.drawing_updated",
  CUTTING_ITEMS_SENT: "cutting.items_sent",

  TRANSPORT_STEP_CHECKED: "transport.step_checked",
  TRANSPORT_STEP_UNCHECKED: "transport.step_unchecked",
  TRANSPORT_DRIVER_ASSIGNED: "transport.driver_assigned",
  TRANSPORT_DRIVER_UNASSIGNED: "transport.driver_unassigned",
  TRANSPORT_VEHICLE_ASSIGNED: "transport.vehicle_assigned",
  TRANSPORT_VEHICLE_UNASSIGNED: "transport.vehicle_unassigned",
  TRANSPORT_SCHEDULE_ASSIGNED: "transport.schedule_assigned",
  TRANSPORT_SCHEDULE_UNASSIGNED: "transport.schedule_unassigned",
  TRANSPORT_NOTES_UPDATED: "transport.notes_updated",

  INSTALLATION_STEP_CHECKED: "installation.step_checked",
  INSTALLATION_STEP_UNCHECKED: "installation.step_unchecked",
  INSTALLATION_VAO_COMPLETED: "installation.vao_completed",
  INSTALLATION_INSTALLER_ASSIGNED: "installation.installer_assigned",
  INSTALLATION_INSTALLER_UNASSIGNED: "installation.installer_unassigned",
  INSTALLATION_NOTES_UPDATED: "installation.notes_updated",
  INSTALLATION_PHOTOS_UPDATED: "installation.photos_updated",
  INSTALLATION_VAOS_SENT: "installation.vaos_sent",

  FIELD_MEASUREMENT_CREATED: "field.measurement_created",
  FIELD_MEASUREMENT_SAVED: "field.measurement_saved",
  FIELD_HEADER_UPDATED: "field.header_updated",
  FIELD_MEASUREMENT_DELETED: "field.measurement_deleted",

  OS_STAGE_CHANGED: "os.stage_changed",
  OS_STAGE_REVERTED: "os.stage_reverted",

  ADMIN_USER_CREATED: "admin.user_created",
  ADMIN_USER_UPDATED: "admin.user_updated",
  ADMIN_USER_DELETED: "admin.user_deleted",
  ADMIN_VEHICLE_CREATED: "admin.vehicle_created",
  ADMIN_VEHICLE_UPDATED: "admin.vehicle_updated",
  ADMIN_VEHICLE_DELETED: "admin.vehicle_deleted",
  ADMIN_LOOKUP_CREATED: "admin.lookup_created",
  ADMIN_LOOKUP_UPDATED: "admin.lookup_updated",
  ADMIN_LOOKUP_DELETED: "admin.lookup_deleted",
  ADMIN_ROLE_ACCESS_UPDATED: "admin.role_access_updated",
  ADMIN_SCORING_RULE_UPDATED: "admin.scoring_rule_updated",

  PEDIDO_UPDATED: "pedido.updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export function stepCheckAction(
  domain: "cutting" | "transport" | "installation",
  done: boolean,
): AuditAction {
  if (domain === "cutting") {
    return done
      ? AUDIT_ACTIONS.CUTTING_STEP_CHECKED
      : AUDIT_ACTIONS.CUTTING_STEP_UNCHECKED;
  }
  if (domain === "transport") {
    return done
      ? AUDIT_ACTIONS.TRANSPORT_STEP_CHECKED
      : AUDIT_ACTIONS.TRANSPORT_STEP_UNCHECKED;
  }
  return done
    ? AUDIT_ACTIONS.INSTALLATION_STEP_CHECKED
    : AUDIT_ACTIONS.INSTALLATION_STEP_UNCHECKED;
}
