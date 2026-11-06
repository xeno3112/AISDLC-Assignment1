import type {
  Priority,
  StaffMember,
  TicketStatus,
} from "../../api/tickets.js";

const statuses: TicketStatus[] = [
  "Open",
  "In Progress",
  "Resolved",
  "Closed",
  "Archived",
];
const priorities: Priority[] = ["Low", "Normal", "High", "Urgent"];

export interface TicketFilterValues {
  status: TicketStatus | "";
  priority: Priority | "";
  assigneeId: string;
}

interface TicketFiltersProps {
  value: TicketFilterValues;
  staff: StaffMember[];
  onChange: (value: TicketFilterValues) => void;
}

export function TicketFilters({ value, staff, onChange }: TicketFiltersProps) {
  const hasFilters = Boolean(value.status || value.priority || value.assigneeId);

  return (
    <section aria-label="Filter tickets" className="filter-panel">
      <div className="filter-grid">
        <div className="field">
          <label htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            onChange={(event) =>
              onChange({
                ...value,
                status: event.target.value as TicketStatus | "",
              })
            }
            value={value.status}
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-priority">Priority</label>
          <select
            id="filter-priority"
            onChange={(event) =>
              onChange({
                ...value,
                priority: event.target.value as Priority | "",
              })
            }
            value={value.priority}
          >
            <option value="">All priorities</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-assignee">Assignee</label>
          <select
            id="filter-assignee"
            onChange={(event) =>
              onChange({ ...value, assigneeId: event.target.value })
            }
            value={value.assigneeId}
          >
            <option value="">All assignees</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
                {!member.active ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      {hasFilters && (
        <button
          className="button button-quiet clear-filters"
          onClick={() =>
            onChange({ status: "", priority: "", assigneeId: "" })
          }
          type="button"
        >
          Clear filters
        </button>
      )}
    </section>
  );
}
