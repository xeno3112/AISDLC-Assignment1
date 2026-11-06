import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  createTicket,
  listDepartments,
  type CreateTicketInput,
  type Department,
  type Priority,
} from "../../api/tickets.js";

const priorities: Priority[] = ["Low", "Normal", "High", "Urgent"];

interface TicketFormProps {
  onCreated: (reference: string) => void;
}

type IntakeFields = "title" | "description" | "departmentId" | "priority";
type FieldErrors = Partial<Record<IntakeFields, string>>;

export function TicketForm({ onCreated }: TicketFormProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState("");
  const [departmentReload, setDepartmentReload] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setDepartmentsLoading(true);
    setDepartmentsError("");
    listDepartments()
      .then((items) => {
        if (active) setDepartments(items);
      })
      .catch((error: unknown) => {
        if (active) setDepartmentsError(messageFor(error));
      })
      .finally(() => {
        if (active) setDepartmentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [departmentReload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(title, description, departmentId, priority);
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const ticket = await createTicket({
        title: title.trim(),
        description: description.trim(),
        departmentId,
        priority: priority as Priority,
      } satisfies CreateTicketInput);
      onCreated(ticket.reference);
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        setFieldErrors({
          ...(error.fields.title ? { title: error.fields.title } : {}),
          ...(error.fields.description
            ? { description: error.fields.description }
            : {}),
          ...(error.fields.departmentId
            ? { departmentId: error.fields.departmentId }
            : {}),
          ...(error.fields.priority ? { priority: error.fields.priority } : {}),
        });
      }
      setFormError(messageFor(error));
    } finally {
      setSubmitting(false);
    }
  }

  function clearFieldError(field: IntakeFields): void {
    setFieldErrors((current) => {
      if (!hasFieldError(current, field)) return current;
      const next = { ...current };
      switch (field) {
        case "title":
          delete next.title;
          break;
        case "description":
          delete next.description;
          break;
        case "departmentId":
          delete next.departmentId;
          break;
        case "priority":
          delete next.priority;
          break;
      }
      return next;
    });
    setFormError("");
  }

  return (
    <section aria-labelledby="new-ticket-heading" className="content-column">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Ticket intake</p>
          <h1 id="new-ticket-heading">Create a ticket</h1>
          <p className="muted">
            Describe the issue so the team can triage it quickly.
          </p>
        </div>
      </div>

      <form className="panel form-panel" noValidate onSubmit={handleSubmit}>
        {formError && (
          <p className="alert alert-error" role="alert">
            {formError}
          </p>
        )}

        <div className="field">
          <label htmlFor="ticket-title">Title</label>
          <input
            autoComplete="off"
            aria-describedby={fieldErrors.title ? "title-error" : undefined}
            aria-invalid={Boolean(fieldErrors.title)}
            id="ticket-title"
            maxLength={120}
            name="title"
            onChange={(event) => {
              setTitle(event.target.value);
              clearFieldError("title");
            }}
            required
            value={title}
          />
          <div className="field-meta">
            {fieldErrors.title ? (
              <span className="field-error" id="title-error">
                {fieldErrors.title}
              </span>
            ) : (
              <span>Keep it under 120 characters.</span>
            )}
            <span aria-hidden="true">{title.length}/120</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="ticket-description">Description</label>
          <textarea
            aria-describedby={
              fieldErrors.description ? "description-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.description)}
            id="ticket-description"
            maxLength={5000}
            name="description"
            onChange={(event) => {
              setDescription(event.target.value);
              clearFieldError("description");
            }}
            required
            rows={7}
            value={description}
          />
          <div className="field-meta">
            {fieldErrors.description ? (
              <span className="field-error" id="description-error">
                {fieldErrors.description}
              </span>
            ) : (
              <span>Include relevant details. Up to 5,000 characters.</span>
            )}
            <span aria-hidden="true">{description.length}/5000</span>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="ticket-department">Department</label>
            <select
              aria-describedby={
                fieldErrors.departmentId ? "department-error" : undefined
              }
              aria-invalid={Boolean(fieldErrors.departmentId)}
              disabled={departmentsLoading || Boolean(departmentsError)}
              id="ticket-department"
              name="departmentId"
              onChange={(event) => {
                setDepartmentId(event.target.value);
                clearFieldError("departmentId");
              }}
              required
              value={departmentId}
            >
              <option value="">
                {departmentsLoading ? "Loading departments…" : "Choose a department"}
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            {fieldErrors.departmentId && (
              <span className="field-error" id="department-error">
                {fieldErrors.departmentId}
              </span>
            )}
            {departmentsError && (
              <div>
                <span className="field-error" role="alert">
                  {departmentsError}
                </span>
                <button
                  className="button button-quiet button-small"
                  disabled={departmentsLoading}
                  onClick={() => setDepartmentReload((current) => current + 1)}
                  type="button"
                >
                  Retry departments
                </button>
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="ticket-priority">Priority</label>
            <select
              aria-describedby={
                fieldErrors.priority ? "priority-error" : undefined
              }
              aria-invalid={Boolean(fieldErrors.priority)}
              id="ticket-priority"
              name="priority"
              onChange={(event) => {
                setPriority(event.target.value as Priority | "");
                clearFieldError("priority");
              }}
              required
              value={priority}
            >
              <option value="">Choose a priority</option>
              {priorities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {fieldErrors.priority && (
              <span className="field-error" id="priority-error">
                {fieldErrors.priority}
              </span>
            )}
          </div>
        </div>

        <div className="form-actions">
          <a className="button button-secondary" href="#/open">
            Cancel
          </a>
          <button
            className="button button-primary"
            disabled={submitting || departmentsLoading || Boolean(departmentsError)}
            type="submit"
          >
            {submitting ? "Creating…" : "Create ticket"}
          </button>
        </div>
      </form>
    </section>
  );
}

function hasFieldError(errors: FieldErrors, field: IntakeFields): boolean {
  switch (field) {
    case "title":
      return Boolean(errors.title);
    case "description":
      return Boolean(errors.description);
    case "departmentId":
      return Boolean(errors.departmentId);
    case "priority":
      return Boolean(errors.priority);
  }
}

function validate(
  title: string,
  description: string,
  departmentId: string,
  priority: Priority | "",
): FieldErrors {
  const errors: FieldErrors = {};
  if (!title.trim()) errors.title = "Enter a ticket title.";
  else if (title.trim().length > 120) {
    errors.title = "Title must be 120 characters or fewer.";
  }
  if (!description.trim()) errors.description = "Enter a description.";
  else if (description.trim().length > 5000) {
    errors.description = "Description must be 5,000 characters or fewer.";
  }
  if (!departmentId) errors.departmentId = "Choose a department.";
  if (!priority) errors.priority = "Choose a priority.";
  return errors;
}

function messageFor(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The request could not be completed. Try again.";
}
