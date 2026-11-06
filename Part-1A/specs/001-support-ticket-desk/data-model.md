# Data Model: Internal Issue Tracker

This model supports [spec.md](./spec.md). The MongoDB document design is an implementation choice; field names in the REST contract remain the public interface.

## Ticket

Represents a service issue and its current lifecycle state.

| Field | Type | Required | Rules |
|---|---|---:|---|
| `_id` | MongoDB ObjectId | Yes | Generated once; used to derive the unique human-readable reference `TKT-<24 uppercase hex characters>`. |
| `title` | String | Yes | Trimmed; 1-120 characters after trimming; whitespace-only is invalid. |
| `description` | String | Yes | Trimmed; 1-5,000 characters after trimming; whitespace-only is invalid. Rendered as plain text. |
| `departmentId` | ObjectId reference | Yes | Must reference an active Department. |
| `priority` | Enum | Yes | `Low`, `Normal`, `High`, `Urgent`. |
| `status` | Enum | Yes | `Open`, `In Progress`, `Resolved`, `Closed`, `Archived`; defaults to `Open`. |
| `assigneeId` | ObjectId reference or null | No | Optional while Open; a new or replacement assignment must target an active staff member with role `support` or `operations`. An existing assignment may become inactive and remain visible until corrected. Required and eligible while In Progress. Retain the prior assignee when reopening Resolved to Open; it may be corrected while Open. |
| `resolutionNote` | String or null | No | Required and non-empty after trimming to transition In Progress -> Resolved; editable while Resolved; read-only once Closed; retained in Archived. |
| `createdAt` | Date | Yes | Set on creation; immutable. |
| `updatedAt` | Date | Yes | Set on create and every successful state/note/assignment update. |

**Indexes**:

- Default unique `_id` index guarantees the derived ticket reference is unique.
- Add indexes for actual supported list queries, initially status and creation date, assignee and status, and priority/status where measurements justify them. Confirm the final set with explain plans and the 2,000-ticket p95 test; avoid indexes with no measured query need.
- Do not accept client-supplied MongoDB operators, IDs, timestamps, status, or arbitrary update paths during ticket creation.

## Department

Read-only lookup data supplied before application use; management is outside this feature.

| Field | Type | Required | Rules |
|---|---|---:|---|
| `_id` | MongoDB ObjectId | Yes | Stable identifier used by tickets and API payloads. |
| `name` | String | Yes | Non-empty display label. |
| `active` | Boolean | Yes | Only active departments are offered for new tickets. |

Provide a unique index on the normalized department name or supplied stable key. The deployment supplies/maintains the catalog outside the application.

## StaffMember

Supplied roster record used for assignment eligibility and filter display; no sign-in identity or permission is implied.

| Field | Type | Required | Rules |
|---|---|---:|---|
| `_id` | MongoDB ObjectId | Yes | Stable identifier used by assignment and filtering. |
| `displayName` | String | Yes | Non-empty staff label; returned only as needed for assignment/filter display. |
| `role` | Enum | Yes | `support`, `operations`, or `other`. |
| `active` | Boolean | Yes | Only active support/operations members can receive assignments. |

The roster is supplied and maintained outside the app. Do not expose management endpoints in this feature.

## Relationships and Derived Values

- A Ticket has exactly one Department.
- A Ticket has zero or one assigned StaffMember.
- A Ticket's `reference` is derived from `_id`; it is returned as `TKT-` plus the uppercase 24-character ObjectId. The client uses this public reference in ticket routes.
- The Assigned list view includes all non-archived tickets with a non-null `assigneeId`; it is not user-specific.

## Lifecycle Invariants

| From | Action | To | Preconditions |
|---|---|---|---|
| — | Create | Open | Valid title, description, active department and priority. |
| Open | Start | In Progress | Exactly one active eligible assignee. |
| In Progress | Return to open | Open | No resolution note required. |
| In Progress | Resolve | Resolved | Non-empty resolution note. |
| Resolved | Reopen | Open | Explicit reopen action; retain current assignee. Assignment may then be changed while Open. |
| Resolved | Close | Closed | Separate request with `confirmed: true`. |
| Closed | Archive | Archived | Separate request with `confirmed: true`. |
| Archived | Any update | — | Rejected; terminal and read-only. |

Assignment changes are permitted only while Open or In Progress. An In Progress ticket must always have exactly one active eligible assignee; it must return to Open before unassignment. A state transition uses a conditional atomic update with the expected current state so concurrent requests cannot bypass these invariants.

## Validation and Failure Mapping

- Invalid or missing required fields, whitespace-only text, invalid enum values, or malformed identifiers produce a validation error; field errors identify the affected fields.
- Unknown references produce not-found errors.
- Ineligible assignment, illegal status transition, attempted in-progress unassignment, or missing eligible assignee produce conflict errors.
- Failed updates do not partially change status, assignee or resolution note.
- Unexpected errors are logged with a request identifier, but the client receives no stack trace or internal details.
