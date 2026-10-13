# ServiceNow ITSM Service Desk

A hands-on ITSM project on a ServiceNow Personal Developer Instance (Australia release), in four parts:

1. A scripted, verified set of 200 synthetic incidents and a four-chart Platform Analytics dashboard built on top of it.
2. A Service Catalog item, **New Laptop Request**, with a manager approval and a four-step fulfillment flow.
3. A small knowledge base with five published articles, and a test of what its access settings actually do.
4. ACLs on a custom table, tested by impersonating a reader, a contributor, and a user with no roles.

Solo project, built October 2026.

## What this project shows

- Generating realistic incident data with a GlideRecord background script, including a dry-run mode and a cleanup tag.
- Letting the platform calculate priority from impact and urgency instead of hardcoding it.
- Verifying the result with read-only scripts before building reports.
- Building reports and a dashboard in Platform Analytics.
- Building a catalog item with mandatory variables and a flow in Workflow Studio: approval, branching, sequential fulfillment tasks, and closing the request.
- Testing the flow end to end as a requester and an approver, and fixing what the tests exposed.
- Setting up a knowledge base with categories and published articles, then testing its access settings and reporting what they did.
- Editing ACLs on a custom table so that role membership decides who can read, write and create, then testing each result by impersonation and stating what was not tested.
- Testing access from the API as well as the interface, finding a flow branch that left rejected requests open, and fixing and retesting it.

## Part 1: Incident data and dashboard

### Data: synthetic

All 200 incidents are synthetic demo data created by `scripts/seed_incidents.js`. They do not represent real incident volume or real service desk performance. Every record carries the tag `DEMO_SEED` in its work notes.

| Property | Value |
|---|---|
| Records | 200 |
| Categories | Software, Network, Hardware, Access and Passwords, Email |
| Assignment groups | Service Desk, Network, Hardware |
| Opened dates | Spread randomly over the previous 90 days |
| States | New, In Progress, On Hold, Resolved, Closed |
| Priority | Calculated by the platform from impact and urgency |

### Dashboard

Four charts, all built on the Incident table with the filter `Number starts with INC001`:

1. Incidents by priority (bar): Low 119, Moderate 54, High 24, Critical 3
2. Incidents by category (pie): Software 49, Network 45, Hardware 42, Access and Passwords 36, Email 28
3. Incidents by state (bar): Closed 64, New 47, In Progress 47, On Hold 30, Resolved 12
4. Incidents opened per week (line): 14 weekly points, peaking at 24 in week 31 (the week of 2026-07-27)

Counts are as of the screenshot date. Resolved and Closed shift slightly over time as the platform processes records.

![Dashboard](screenshots/dashboard.png)

The seeded incident list (200 records, filtered to the demo data):

![Seeded incidents](screenshots/seeded-incidents-list.png)

One incident with its SLA tab, showing the SLA timers that were attached when the record was inserted:

![Incident SLA tab](screenshots/incident-sla-tab.png)

### How the data was generated

1. Added two category choices to the incident category list: `access` (Access and Passwords) and `email` (Email).
2. Ran the seed script with `DRY_RUN = true` and checked the log.
3. Ran it live with `TOTAL = 5`, inspected the records, and deleted them.
4. Ran it once with `TOTAL = 200`.
5. Ran `scripts/verify_seed.js` to check the results.

Design decisions in the script:

- Priority is never set by the script. The platform calculates it.
- `opened_at` is backdated. Resolved dates fall after opened dates, and closed dates fall after resolved dates.
- Resolved and Closed records have a close code and close notes.
- Assignment groups are limited to three relevant groups, matched to category.
- A `DRY_RUN` flag, set to true by default, logs what would be created without inserting anything.

### Verification

`scripts/verify_seed.js` is read-only. Results from the run:

- 200 incidents created
- Only the three intended assignment groups used
- 0 incidents resolved before they were opened
- 0 resolved or closed incidents missing close notes

### Known limitations

- SLA timers on seeded incidents start when the records were inserted, not at the backdated opened date. SLA breach reporting on this data is not meaningful, so the dashboard does not include it.
- Resolution times in this dataset come from random dates, so average resolution time is not a meaningful metric here.
- The first and last points on the weekly chart are partial weeks, because the data covers 90 days back from the day it was created.

### How to run

1. Request a Personal Developer Instance at developer.servicenow.com.
2. Add the two category choices described above.
3. Open Scripts - Background and paste `seed_incidents.js`. Run it with `DRY_RUN = true`, then with `TOTAL = 5` and `DRY_RUN = false`, then with `TOTAL = 200`.
4. Run `verify_seed.js`.
5. Build the four reports and add them to a dashboard in Platform Analytics.

## Part 2: New Laptop Request (Service Catalog)

A catalog item with an approval and fulfillment flow on the same instance. All users and records are demo data.

### What it does

1. A user orders **New Laptop Request** from the Hardware category.
2. The form collects four mandatory variables: Laptop type (Standard, Developer, High performance), Department, Business justification, and Needed by.
3. The flow **New Laptop Request Fulfillment** (Workflow Studio, global scope) asks the requester's manager for approval.
4. If the request is approved, the flow creates four catalog tasks, one at a time: Procure device, Image and configure, Deliver (Hardware group), and Confirm with requester (Service Desk group). Each task is created after the previous one is closed.
5. When the last task closes, the flow sets the requested item to Closed Complete.
6. If the request is not approved, an Else branch updates the requested item record. After a test, it was changed to set State to Closed Incomplete as well as Stage (see the not-approved branch below).

![Flow overview](screenshots/flow-overview.png)

### Test run

REQ0010003 was submitted as a demo user (Developer laptop, IT department).

The order form with the four variables filled in:

![Catalog item form](screenshots/catalog-item-form.png)

The submitted request:

![Request submitted](screenshots/request-submitted.png)

The flow created an approval for the demo manager, and the request waited on it:

![Approval pending](screenshots/approval-pending.png)

After approval, the requested item moved on and the flow created the fulfillment tasks:

![Request approved](screenshots/request-approved.png)

All four tasks, closed in order:

![Catalog tasks closed](screenshots/catalog-tasks-closed.png)

The requested item then closed as complete. The activity log shows the state change was made by the system, not by hand:

![Requested item closed](screenshots/ritm-closed.png)

### Notes

- The demo requester's manager field was set manually, because the default demo users have no manager.
- The demo manager account has no roles, so the approval was completed by the admin account on behalf of the manager. The approval record still shows the manager as the approver.
- Two earlier test requests are not shown in the screenshots. REQ0010001 was approved automatically with no approver, because the requester had no manager, which is why the manager was set. REQ0010002 ran before the closing step was added to the flow, so its requested item stayed open.
- The Else branch (request not approved) was tested later. See below.
- Tasks were closed by hand to move the flow forward. No timing or SLA metrics are reported for this item.
- Flow reporting was off during the test runs, so the flow execution page shows no per-step state or duration.

### Not-approved branch: tested, found a gap, fixed, retested

REQ0010004 (Alyssa Biasotti, Developer laptop, "Rejection test") was rejected through the approval form. The admin account rejected it on behalf of the approver, Marc Wanger, and the form required a comment before it accepted the rejection.

![REQ0010004 submitted](screenshots/flow-else-00-request-submitted.png)

![Approval pending](screenshots/flow-else-01-approval-pending.png)

![Rejection blocked until a comment is added](screenshots/flow-else-error-comment-required.png)

Result: no catalog tasks were created, but RITM0010004 stayed at State **Open**. The approval field on the item showed Rejected and the flow context showed Complete, so the flow ran and ended cleanly. The Else step, however, was configured to set only Stage to Request Cancelled, with no State value.

![Approval rejected](screenshots/flow-else-02-approval-rejected.png)

![RITM0010004 still Open](screenshots/flow-else-03a-ritm-after-reject.png)

![RITM0010004 activity log](screenshots/flow-else-03b-ritm-activity.png)

![No catalog tasks](screenshots/flow-else-04-no-tasks.png)

![Flow contexts, all Complete](screenshots/flow-else-06-flow-contexts.png)

![RITM and REQ fields read through the API](screenshots/flow-else-07-ritm-req-fields.png)

The fix was to add **State = Closed Incomplete** to the Else step, then save and publish the flow.

![Else step before](screenshots/flow-else-08-else-step-before.png)

![Else step after](screenshots/flow-else-09-else-step-after.png)

Retest with REQ0010005 ("Rejection test 2"), rejected the same way: RITM0010005 moved to **Closed Incomplete**, set by System at 09:06:05, and again no tasks were created.

![REQ0010005 submitted](screenshots/flow-else-11a-request-submitted.png)

![Approval rejected](screenshots/flow-else-11b-approval-rejected.png)

![RITM0010005 Closed Incomplete](screenshots/flow-else-11c-ritm-closed-incomplete.png)

![Activity log and no tasks](screenshots/flow-else-11d-ritm-no-tasks.png)

![Approver shown as Rejected](screenshots/flow-else-11e-approver-rejected.png)

Notes:

- Stage still read `new_stage_2` after the rejection, even though the Else step sets it to Request Cancelled. I did not find out why.
- The request record (REQ0010004) showed Approved, last updated by the system at 08:44:23, before the item-level approval was rejected. I did not investigate why.
- The flow was saved and republished after the change, and the REQ0010005 retest confirms it took effect.

## Part 3: Knowledge base and access settings

### Knowledge base

A separate knowledge base, **IT Service Desk Knowledge**, holds five published sample articles, one for each incident category used in the dashboard: Access and Passwords, Network, Hardware, Email, and Software. The articles are demo content. The instance's built-in sample knowledge bases are not part of this project.

![Knowledge base](screenshots/knowledge-base.png)

![Knowledge categories](screenshots/knowledge-categories.png)

![Published articles](screenshots/knowledge-articles.png)

![Example article](screenshots/knowledge-article.png)

### Access settings and what they did

Two demo roles (`demo_kb_reader` and `demo_kb_contributor`), two test users, and two User Criteria records (Demo KB Readers and Demo KB Contributors) were created and added to the Can Read and Can Contribute lists of the knowledge base.

![Demo reader roles](screenshots/demo-reader-roles.png)

![Demo contributor roles](screenshots/demo-contributor-roles.png)

Result: the platform's default entries on those lists could not be removed. The default read entry (Any User) still applies, so a user with no roles can read all five articles. The new criteria were added but do not restrict access on their own.

![Can Read](screenshots/kb-can-read.png)

![Can Contribute](screenshots/kb-can-contribute.png)

![User with no roles can still read](screenshots/kb-alyssa-can-read.png)

Notes:

- Both test users also carry a platform-inherited role (`snc_required_script_writer_permission`) that could not be removed because it is protected.
- Whether the demo reader can create an article was tested later, and the result is below.
- Access restriction with ACLs on a custom table is covered in Part 4.

### Reader article creation test

The knowledge portal showed demo.reader 0 knowledge bases and 0 articles, with no Create option visible.

![Reader portal home](screenshots/kb-reader-portal-home.png)

The same session was then used to ask the API directly. The console printed the user, the knowledge base list (2 rows), the article list (2 rows) and the result of one insert:

![Reader API attempt](screenshots/kb-reader-api-attempt.png)

Result: the insert returned **HTTP 201**. The reader created article KB0010007, authored by Demo Reader. The admin account then deleted it, and a check list filtered to "Created on Today" showed only the five original articles.

![Article created](screenshots/kb-reader-article-created.png)

![Delete confirmation](screenshots/kb-reader-article-delete-confirm.png)

![Delete result and platform banner](screenshots/kb-reader-article-deleted.png)

![No test article left, search for ACL test](screenshots/kb-reader-cleanup-check-1.png)

![No test article left, created today](screenshots/kb-reader-cleanup-check-2.png)

Notes:

- The delete showed a red platform banner about a denied cross-scope privilege for the Knowledge Center. The checks above show nothing was left behind.
- I did not find out why the reader was allowed to create an article, or why the portal showed no articles while the API returned two. The access settings on this knowledge base remain unrestricted, as described above.

## Part 4: Access controls (ACLs) on a custom table

Goal: on a custom table, one role can read, one role can read and write, and a user with no roles sees nothing. All data is synthetic.

### What was built

- Custom table **Demo Service Note** (`u_demo_service_note`) with two columns, Short description and Details.
- Three synthetic records: Printer firmware checked, VPN client updated, Shared mailbox permissions reviewed.

![Demo service note records](screenshots/acl-00a-demo-service-notes-records.png)

Four table-level ACLs (read, create, write, delete) were generated with the table.

![ACL list before changes](screenshots/acl-00b-acl-list-before.png)

Each required the auto-created role `u_demo_service_note_user`, which nobody in this project holds. I edited three and left one unchanged:

| ACL operation | Roles required after changes | Change |
|---|---|---|
| read | demo_kb_reader, demo_kb_contributor | Edited |
| write | demo_kb_contributor | Edited |
| create | demo_kb_contributor | Edited |
| delete | u_demo_service_note_user (nobody holds it) | Left unchanged |
| write, field Details | admin | Added (field-level) |

All five are Allow If with Admin overrides on and no script. Four are table-level and one is field-level (Details). The `u_demo_service_note_user` role was removed from the read, write and create ACLs only. The role itself was not deleted.

Read ACL, before and after:

![Read ACL before](screenshots/acl-01-read-acl-before.png)

![Read ACL after](screenshots/acl-02-read-acl-after.png)

Write ACL, before and after:

![Write ACL before](screenshots/acl-03-write-acl-before.png)

![Write ACL after](screenshots/acl-04-write-acl-after.png)

Create ACL, before and after:

![Create ACL before](screenshots/acl-05-create-acl-before.png)

![Create ACL after](screenshots/acl-06-create-acl-after.png)

### Why delete was left unchanged

Removing the role from an Allow If ACL and adding nothing would leave an ACL with no requirements, which grants access to any logged-in user. Leaving the original role in place keeps delete admin-only in practice. A User Roles check on `u_demo_service_note_user` returned no records, so no user holds it, directly or by inheritance.

![Delete ACL, unchanged](screenshots/acl-07-delete-acl-before.png)

![No user holds the leftover role](screenshots/acl-08-leftover-role-holders.png)

### Test method

Each user was impersonated from the admin account. For each I opened the list view, an existing record and the new-record form. Later tests ran requests from the browser console of the impersonated session, which prints the signed-in user name. The contributor edited one record and submitted one throwaway record, and the admin account deleted the throwaway record afterwards.

### Results

| Check | User | Result |
|---|---|---|
| List | Alyssa Biasotti (no roles) | Blocked: "Security constraints prevent access to requested page" |
| New-record form | Alyssa Biasotti | Blocked: same message |
| List | demo.reader | 3 records visible, no New button |
| Record form | demo.reader | Grey read-only fields, no Update button |
| New-record form | demo.reader | Opens with read-only fields, no Submit or Save option |
| Typing in the new-record form | demo.reader | Short description field did not accept input |
| List | demo.contributor | 3 records visible, New button present |
| Record form | demo.contributor | Editable fields, Update button present |
| Edit and save | demo.contributor | Added a sentence to Details on VPN client updated, saved without an error |
| New-record form | demo.contributor | Editable fields, Submit button present |
| Insert | demo.contributor | Submitted a throwaway record, it appeared in the list (4 of 4) |
| Delete, record form | demo.contributor | No Delete button, only Update |
| Delete, list actions | demo.contributor | Delete greyed out and not clickable |
| Delete | admin | Delete button present, throwaway record removed (3 of 3) |
| REST read | Alyssa Biasotti | 403, "User Not Authorized" |
| REST read, insert, update | demo.reader | GET 200 with 3 rows, POST 403, PATCH 403 |
| REST read | demo.contributor | GET 200 with 3 rows |
| Details field | demo.contributor | Read-only in the form. A PATCH to Details returned 200 but the value did not change |

Alyssa Biasotti (no roles):

![Alyssa list blocked](screenshots/acl-09-alyssa-list.png)

![Alyssa new-record form blocked](screenshots/acl-10-alyssa-create-form.png)

demo.reader:

![Reader list](screenshots/acl-11-reader-list.png)

![Reader record, read-only](screenshots/acl-12-reader-record.png)

![Reader new-record form](screenshots/acl-13-reader-create-form.png)

The reader's form menu offers only Show/Hide Template Bar and Show/Hide annotations:

![Reader form menu](screenshots/acl-14-reader-create-menu.png)

demo.contributor:

![Contributor list](screenshots/acl-15-contributor-list.png)

![Contributor record](screenshots/acl-16-contributor-record.png)

![Contributor edit saved](screenshots/acl-17-contributor-edit-saved.png)

![Contributor new-record form](screenshots/acl-18-contributor-create-form.png)

### Insert, delete and REST tests

Contributor insert. After Submit the form showed a blank new record. I did not investigate why it did not show the saved record. The list showed the new row, with the entered text.

![Contributor form after Submit](screenshots/acl-19-contributor-after-submit.png)

![Contributor insert in the list](screenshots/acl-20-contributor-insert-list.png)

Contributor delete. The record form has no Delete button, and in the list Actions menu Delete and Delete with preview are greyed out and could not be clicked, so no delete was attempted.

![Record without Delete](screenshots/acl-21-contributor-record-no-delete.png)

![Actions menu with Delete greyed out](screenshots/acl-22-contributor-actions-menu.png)

Admin delete. The admin sees a Delete button, and the throwaway record was then deleted as admin.

![Admin sees Delete](screenshots/acl-24-admin-delete-button.png)

![Back to 3 records](screenshots/acl-25-admin-delete-result.png)

REST tests. Requests were sent from the browser console of each impersonated session. The console prints the user name, so these screenshots show who was signed in. The reader's update request re-sent the record's own Short description, so nothing would have changed had it been allowed.

![Reader: GET 200, POST 403, PATCH 403](screenshots/acl-26-reader-rest-attempts.png)

![No-role user: 403](screenshots/acl-27-alyssa-rest-read.png)

![Contributor: GET 200](screenshots/acl-28-contributor-rest-read.png)

### Field-level ACL

A write ACL on the Details field with the role admin only was added, using the Verify Security Rules dialog and then saved.

![Verify dialog](screenshots/acl-29a-field-acl-verify-dialog.png)

![Field ACL](screenshots/acl-29-field-acl-details.png)

As demo.contributor, Short description stayed editable and Details was read-only:

![Contributor sees Details read-only](screenshots/acl-30-contributor-details-field.png)

A request that tried to append text to Details returned 200, but reading the field back showed the value unchanged, so the server ignores the write without returning an error. The script was written to restore the value if it had changed, and it did not need to.

![Field write attempt](screenshots/acl-31-contributor-field-write-attempt.png)

### Notes

- Alyssa was blocked at page level. demo.reader was not: the new-record form opened, but with read-only fields and no way to submit. I did not investigate why the two differ.
- The contributor's edit ("Edited by demo.contributor.") remains on the VPN client updated record as write evidence. The data is synthetic.
- The screenshots do not show the impersonated name, because the impersonation banner is not visible in them. Each set was taken while impersonating the user named in the results table. The console output in the REST and field tests prints the user name.

### Not tested

- A rejected delete. The contributor had no way to start one, and no DELETE request was sent.
- REST writes by the no-role user. Only a read was tried.
- REST access with separate credentials. The REST tests used each impersonated browser session.
- A field-level read ACL. Only a write ACL on Details was added.
- Why the reader could create a knowledge article, and why the portal showed the reader no articles while the API returned two.
- Why Stage still read `new_stage_2` after a rejection.

## Repository contents

| Path | Purpose |
|---|---|
| `scripts/seed_incidents.js` | Creates the demo incidents (Scripts - Background) |
| `scripts/verify_seed.js` | Read-only checks on the created data |
| `scripts/cleanup_seed.js` | Deletes the demo incidents (dry run by default) |
| `screenshots/` | Dashboard, incident, catalog item, knowledge base, and ACL screenshots |

The catalog item, its flow, the knowledge base and the ACL changes were built in the instance UI, so they have no script in this repository. The screenshots show the configuration and the test runs.

## Possible next steps

These are not built:

- Stop the reader from creating knowledge articles, and replace the default Any User entry on the knowledge base with the role-based criteria
- Send real DELETE requests and REST writes as each demo user
- Add a field-level read ACL on the custom table
- Find out why Stage stays at new_stage_2 when the Else step sets Request Cancelled
