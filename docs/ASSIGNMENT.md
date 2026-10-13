**Goal:**
A single-screen Lead Management tool called LeadFlow. Think of it as a lightweight CRM where a sales rep can track their leads, log every discussion they've had, and set follow-up reminders.

**Flows:**
The entire app lives on one screen (plus a login is optional — skip if pressed for time).

1. Lead List
   * Shows all leads with: name, status badge, last discussion note, time since last discussion
   * Filter by status (New / Contacted / Qualified / Proposal Sent / Won / Lost)
   * Today's follow-ups pinned at the top of the list

2. Lead Timeline Dialog
   * Click any lead to open a dialog (not a new page)
   * Shows full discussion history in reverse chronological order
   * Form at the bottom to add a new discussion note + optional follow-up date & time
   * Saving a discussion with a follow-up date updates the lead's follow-up field and reflects immediately in the list
   * Status can be updated from this dialog

3. Add New Lead
   * A button to add a new lead (name required; company, phone optional; status defaults to New)

**Wireframes**
Below are some suggested wireframes for the screens

See [`wireframes/`](wireframes/).

**Tech Stack**
Feel free to use whatever stack you are comfortable with but we prefer NextJs + FastAPI.


**Evaluation Matrix**

Functional

* Lead list shows name, status, last note, time ago
* Today's follow-ups pinned correctly
* Timeline dialog loads discussions in order
* Adding a discussion updates the list immediately
* Add new lead works
* Status update from dialog persists

Code Quality

* Clean component structure on the frontend
* API uses correct status codes, clean error handling

Delivery

* README with working setup steps
* Meaningful git commit history

necessary:

* Search leads by name
* Overdue follow-ups highlighted in red
* Docker Compose setup
* Seed script with at least 5 leads and discussions
* Filters

**Submission:**

We expect the following from you:

1. GitHub repo (public)
2. .env.example with all required variables listed
3. README with setup
4. A video / screenshots of the working flow

Good luck. We look forward to your submission.
