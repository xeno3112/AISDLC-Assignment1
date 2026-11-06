# Feature Specification: Internal Issue Tracker

**Feature Branch**: Not created (no before-specify hook is configured)

**Created**: 2026-11-06

**Status**: Approved

**Input**: User description: "Build an Internal Issue Tracker web application for support and operations teams. Users can submit service tickets with title, description, department and priority; view open and assigned tickets; filter tickets by status, priority and assignee; update ticket progress, assignees and resolution notes; and close or archive resolved tickets after confirmation. Support desktop and mobile browsers. Exclude authentication, collaboration and notifications from the initial scope. Define user stories, functional and non-functional requirements, and measurable acceptance criteria. Identify assumptions and unresolved questions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit and find a service ticket (Priority: P1)

A support or operations staff member records a service issue with enough detail for the team to triage it, then finds it in the open work queue.

**Why this priority**: Ticket intake is the foundation of the tracker; without it, teams cannot reliably capture or act on service issues.

**Independent Test**: Submit a ticket using valid details, verify it appears in the open queue with its submitted department and priority, and verify that incomplete or invalid submissions are rejected without creating a ticket.

**Acceptance Scenarios**:

1. **Given** a staff member has entered a valid title, description, department and priority, **When** they submit the ticket, **Then** the system creates a ticket with a unique reference, Open status, the supplied details and no assignee.
2. **Given** a required field is missing or a field exceeds its allowed length, **When** the staff member submits the ticket, **Then** the ticket is not created and the staff member is told which field needs correction.
3. **Given** a ticket has been created, **When** a staff member opens the Open view, **Then** the new ticket is visible with its reference, title, department, priority, status and assignee, if any.
4. **Given** a staff member uses a supported mobile browser, **When** they complete ticket intake, **Then** every required field and the submit action can be used without horizontal page scrolling.
5. **Given** a ticket or update was successfully saved, **When** a staff member reloads or revisits the application, **Then** the saved ticket details and status remain available.

### User Story 2 - Triage and update assigned work (Priority: P1)

A support or operations staff member reviews open and assigned tickets, narrows the list to relevant work, assigns a ticket to an eligible colleague and moves it through active work.

**Why this priority**: Support and operations teams need to find ownership gaps and make progress visible before issues can be resolved.

**Independent Test**: Seed open and assigned tickets with different statuses and priorities, verify both views and combined filters, then assign an eligible staff member and move a ticket into and out of In Progress.

**Acceptance Scenarios**:

1. **Given** tickets exist, **When** a staff member selects Open or Assigned, **Then** Open shows all Open tickets, including unassigned tickets, and Assigned shows non-archived tickets that have an assignee.
2. **Given** tickets have different statuses, priorities and assignees, **When** a staff member applies one or more status, priority and assignee filters, **Then** only tickets matching all selected filters are shown, and clearing the filters restores the unfiltered view.
3. **Given** a ticket is Open and an eligible active support or operations staff member is selected, **When** the ticket is assigned and moved to In Progress, **Then** the selected staff member is its sole assignee and its status is In Progress.
4. **Given** a ticket is In Progress, **When** a staff member returns it to Open, **Then** the ticket may remain assigned or be unassigned; an In Progress ticket may never be left without exactly one assignee.
5. **Given** an inactive staff member or a person outside the eligible support or operations roles is selected, **When** a staff member attempts the assignment, **Then** the change is rejected and the ticket remains unchanged.
6. **Given** a staff member selects a status transition not allowed by the ticket lifecycle, **When** they attempt the update, **Then** the transition is rejected, the ticket remains unchanged, and an actionable explanation is shown.
7. **Given** a person can access the internal application, **When** they open it, **Then** they can use the same ticket-management capabilities without signing in.
8. **Given** a ticket update cannot be saved, **When** a staff member attempts the change, **Then** the last saved values remain, the system does not imply success, and the staff member receives a safe, actionable error message.

### User Story 3 - Resolve, close and archive tickets (Priority: P2)

A staff member records how an issue was resolved, closes the resolved ticket after confirmation, and later archives the closed ticket after a separate confirmation.

**Why this priority**: Resolution and explicit completion keep active queues useful while preserving a clear record of completed work.

**Independent Test**: Move an assigned ticket through resolution, closure and archival; verify the note requirement, separate confirmations, cancellation behavior, and final read-only archive access.

**Acceptance Scenarios**:

1. **Given** a ticket is In Progress, **When** a staff member supplies a non-empty resolution note and marks it Resolved, **Then** the note is saved and the status becomes Resolved.
2. **Given** a ticket is In Progress with no resolution note, **When** a staff member attempts to resolve it, **Then** the change is rejected and the ticket remains In Progress.
3. **Given** a ticket is Resolved, **When** a staff member explicitly reopens it, **Then** its status becomes Open and its existing assignee is retained.
4. **Given** a reopened ticket is Open, **When** a staff member assigns or reassigns it to an active eligible staff member and moves it to In Progress, **Then** the ticket has exactly one eligible assignee and its status becomes In Progress.
5. **Given** a Resolved ticket is reopened to Open with an inactive or ineligible assignee, **When** a staff member attempts to move it to In Progress without first assigning an active eligible staff member, **Then** the transition is rejected and the ticket remains Open.
6. **Given** a ticket is Resolved, **When** a staff member chooses Close and confirms the action, **Then** the ticket becomes Closed; if the staff member cancels, the ticket remains Resolved.
7. **Given** a ticket is Closed, **When** a staff member separately chooses Archive and confirms the action, **Then** the ticket becomes Archived and appears in the Archived view; if the staff member cancels, it remains Closed.
8. **Given** a ticket is Archived, **When** a staff member attempts to change its status, assignee or resolution note, **Then** the change is rejected and the archived ticket remains available for read-only reference.
9. **Given** a ticket is Resolved, **When** a staff member revises its resolution note, **Then** the revised note is saved.
10. **Given** a ticket is Closed, **When** a staff member attempts to change its resolution note, **Then** the change is rejected.

### Edge Cases

- Submissions with a blank title or description, a title longer than 120 characters, or a description longer than 5,000 characters are rejected with field-specific feedback.
- Titles and descriptions containing only whitespace are treated as blank and rejected.
- A selected department or priority that is not in the available choices is rejected; no ticket is created or modified.
- A filter combination with no matching tickets shows an empty state and allows the staff member to clear the filters.
- An assignee who becomes inactive cannot receive a new assignment; an existing ticket assigned to that person remains visible and must be reassigned while Open before it can be In Progress, including after a Resolved ticket is explicitly reopened to Open.
- A request to move a ticket to In Progress without an eligible assignee, or to Resolved without a non-empty resolution note, is rejected without a partial update.
- Canceling either confirmation leaves the ticket in its prior state.
- Archived tickets are excluded from Open and Assigned views and remain available in the Archived view.
- A failed save does not silently appear successful; the staff member receives an error and the last saved ticket values remain visible.
- On narrow mobile screens, forms, filters, ticket details and confirmation controls remain operable without horizontal page scrolling.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow staff to create a ticket with a title of 1-120 characters, a description of 1-5,000 characters, one available department and one priority from Low, Normal, High or Urgent.
- **FR-002**: The system MUST assign each created ticket a unique human-readable reference and set its initial status to Open.
- **FR-003**: The system MUST provide Open, Assigned and Archived views. Open MUST include all tickets whose status is Open, including unassigned tickets; Assigned MUST include non-archived tickets with an assignee; Archived MUST include archived tickets.
- **FR-004**: The system MUST allow staff to filter tickets by status, priority and assignee, use multiple filters together, clear filters and see an explicit empty state when no tickets match.
- **FR-005**: The system MUST allow assignment only to an active staff member in the support or operations role. Open tickets MAY be unassigned. An In Progress ticket MUST have exactly one assignee. Reassignment MUST be permitted only while Open or In Progress; an In Progress ticket MUST first return to Open before it can be unassigned.
- **FR-006**: The system MUST allow only these status transitions: Open to In Progress; In Progress to Open or Resolved; Resolved to Open when explicitly reopened, or to Closed after affirmative closure confirmation; Closed to Archived after a separate affirmative archive confirmation. Archived MUST be terminal. Any other transition MUST be rejected without changing the ticket.
- **FR-007**: The system MUST require exactly one eligible assignee before a ticket enters or remains In Progress.
- **FR-008**: The system MUST require a non-empty resolution note before a ticket can move from In Progress to Resolved. Staff MUST be able to revise the note while the ticket is Resolved; the note MUST be read-only after closure.
- **FR-009**: The system MUST require separate, explicit affirmative confirmations for closing a Resolved ticket and archiving a Closed ticket. Canceling either confirmation MUST leave the ticket unchanged.
- **FR-010**: The system MUST retain archived ticket details, including the resolution note, for read-only access in the Archived view.
- **FR-011**: The system MUST preserve successfully saved tickets and updates when a staff member reloads or revisits the application. When a save fails, it MUST identify the failure and MUST NOT present the change as successful.
- **FR-012**: The system MUST provide the same ticket-management capabilities to any person with access to the application. Sign-in, individual identity verification and per-person permissions are out of scope.
- **FR-013**: The system MUST support ticket creation, viewing, filtering, updates and confirmations on desktop and mobile browsers.
- **FR-014**: The initial release MUST NOT include comments, shared editing or other collaboration features, notifications, or authentication.
- **FR-015**: The system MUST provide field-specific, actionable feedback for invalid input, clear conflict feedback for invalid lifecycle or assignment changes, and a sanitized message for unexpected failures. A rejected or failed change MUST NOT partially update a ticket or imply success.

### Non-Functional Requirements

- **NFR-001**: The primary workflows MUST be usable at viewport widths from 320 to 1,920 CSS pixels without horizontal page scrolling.
- **NFR-002**: The application MUST conform to WCAG 2.2 Level AA for its user-facing workflows, including keyboard operation, visible focus, labels, contrast and understandable validation feedback.
- **NFR-003**: In the latest two stable versions at release of Chrome, Edge, Firefox and Safari, and current Safari on iOS and Chrome on Android, staff MUST be able to complete ticket creation, filtering and status updates.
- **NFR-004**: With up to 2,000 tickets, at least 95% of list and filter actions MUST display the matching results within 2 seconds under normal operating conditions.
- **NFR-005**: Ticket data MUST be validated before changes are saved; invalid user-provided text MUST not be interpreted as executable content or silently change unrelated ticket fields.

### Key Entities

- **Ticket**: A service issue identified by a unique reference, with title, description, department, priority, lifecycle status, assignee when applicable, resolution note when resolved, and saved details retained through archival.
- **Department**: A selectable category used to route or identify the area responsible for a ticket.
- **Staff Member**: A person in the supplied staff roster, with active/inactive status and support or operations eligibility; eligible active members may be assigned tickets.
- **Resolution Note**: The non-empty explanation of how a ticket was resolved; editable while Resolved and read-only after closure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a usability evaluation with 10 representative staff, at least 9 can submit a valid ticket in under 2 minutes without assistance.
- **SC-002**: In a usability evaluation with 10 representative staff, at least 9 can locate a ticket using the Open or Assigned view and the available filters in under 1 minute.
- **SC-003**: At least 95% of list and filter actions show matching results within 2 seconds when the tracker contains up to 2,000 tickets.
- **SC-004**: Every transition and assignment constraint defined in FR-005 through FR-009 produces the specified result in acceptance testing, with zero invalid transitions saved.
- **SC-005**: Staff can complete the create, triage, resolve, close and archive workflows at supported desktop and mobile viewport widths, and the workflows pass a WCAG 2.2 Level AA evaluation.

## Assumptions

- The application is used by support and operations staff in an internal environment. Because authentication and per-person permissions are excluded, access is restricted by the operating environment; everyone who can access the application has the same ticket-management capabilities.
- The initial department choices and staff roster are supplied before use. The roster identifies active status and support or operations eligibility; managing either catalog within the application is out of scope.
- Priority choices are Low, Normal, High and Urgent. A new ticket is Open and may be unassigned.
- Open tickets may be assigned or unassigned. In Progress tickets always have exactly one eligible assignee; staff return a ticket to Open before unassigning it.
- Closure means moving a Resolved ticket to Closed after confirmation. Archival is a separate confirmed action available only to Closed tickets. Archived records remain available for reference and cannot be changed.
- The initial release retains ticket and archived-ticket data without an automatic expiration period.
- A single current resolution note is sufficient; comments, discussion history, notifications and identity-based activity attribution are not required.

### Unresolved Questions

- Which department choices and active staff roster should be supplied for the initial deployment, and who will maintain them outside the application?
- Should Assigned mean all non-archived tickets with an assignee, as specified by default, or only tickets assigned to a particular staff member? The initial release has no sign-in to identify a current staff member.
- Does the organization require a defined retention period or additional review before archived tickets can be removed? Until answered, archived tickets are retained indefinitely.
- What operating-environment controls will restrict access to this unauthenticated internal application? The application itself does not identify or authorize individual users.
