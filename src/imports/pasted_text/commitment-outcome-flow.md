Update the existing Marimo accountability app prototype to add an **Outcome Review, Grace Period, and Appeals system** to the commitment flow.

Do not redesign the existing application or replace the current commitment flow. Extend the existing system with this new logic and create the necessary screens, states, interactions, and animations.

## Why this feature exists

During real-world testing, I discovered an important edge case.

I created a commitment to finish taking a shower by 2:30 PM. I actually completed the shower on time, but I did not return to my computer until 2:35 PM.

Because I had not clicked “Finished task” before 2:30 PM, the app automatically treated the commitment as failed and took the bounty.

The problem is:

**Completing a task on time and reporting completion on time are not always the same thing.**

Users may legitimately complete a commitment before the deadline but be unable to interact with the app at that exact moment.

The accountability system should remain strict, but it also needs checks and balances.

The goal is:

**Make incorrect outcomes difficult—but not impossible—to correct.**

The system should distinguish between:

* Completing a commitment on time but reporting it late
* Having legitimate evidence of completion
* Experiencing an exceptional circumstance
* Encountering a technical problem
* Simply failing to complete the commitment

The system should protect users from unfair losses without creating an easy loophole for avoiding consequences.

---

# CORE SYSTEM CHANGE

Separate these two concepts:

**Commitment Deadline**
The time by which the actual task must be completed.

**Reporting Window**
A short period after the deadline during which the user can report whether they completed the task on time.

For example:

Task:
Take a shower

Deadline:
2:30 PM

Reporting window:
Until 3:30 PM

The user must still have completed the shower by 2:30 PM.

However, they have until 3:30 PM to tell Marimo:

**I completed this on time.**

The reporting window does NOT extend the actual task deadline.

Make this distinction extremely clear in the interface.

---

# STATE 1 — DEADLINE PASSES

When the task deadline passes without the user marking the commitment complete, do NOT immediately make the bounty permanently unrecoverable.

Change the commitment status to:

**Deadline passed**

Show:

**Did you complete this by 2:30 PM?**

Supporting copy:

Your commitment deadline has passed, but you still have time to report the outcome.

Show the reporting deadline:

**Report by 3:30 PM**

Include a countdown:

**42 minutes left to report**

Primary action:

**Yes, I completed it on time**

Secondary action:

**No, I didn't complete it**

If the commitment requires evidence, ask the user to provide the evidence originally agreed upon.

Examples:

* Submit the agreed-upon URL
* Upload the required screenshot
* Confirm the measurable target
* Self-attest

Marimo can comment:

**“The deadline was 2:30. I am asking when you finished, not when you clicked this button.”**

---

# STATE 2 — REPORTED LATE, COMPLETED ON TIME

If the user reports during the grace period that they completed the task before the original deadline, allow them to submit the originally agreed-upon evidence.

Show:

**When did you actually finish?**

Allow the user to enter or confirm an approximate completion time.

Example:

**2:24 PM**

Then show the evidence requirement.

After submission, show a short Marimo review sequence:

**Reviewing completion claim...**

**Checking original agreement...**

**Examining evidence...**

Pause.

Then:

**COMMITMENT UPHELD**

or another clearer success phrase if appropriate.

Show:

**Completed on time. Reported 5 minutes late.**

**Your $25 bounty is safe.**

If applicable:

**$25 → Japan Trip**

Marimo:

**“You were late to tell me. You were not late to finish. Acceptable.”**

Make this feel like a successful correction, not like the user cheated the system.

---

# STATE 3 — REPORTING WINDOW EXPIRES

If the user does not report the outcome before the reporting window ends, transition the bounty into:

**Claimed by Marimo**

Show the commitment as missed.

Example:

**Commitment missed**

Finish the Manager's Insights case study

Deadline:
Thursday, 9:00 PM

Reporting window closed:
Thursday, 10:00 PM

Bounty:
$25 claimed by Marimo

Marimo may visually celebrate or behave smugly.

However, provide a secondary action:

**Dispute this outcome**

This should NOT visually compete with the primary status. It should feel available but intentionally require effort.

---

# STATE 4 — DISPUTE AN OUTCOME

Create a formal but slightly absurd appeals process.

Headline:

**Dispute this outcome**

Supporting copy:

If Marimo claimed your bounty incorrectly, you may submit an appeal.

Marimo commentary:

**“You may present your case.”**

Ask:

**Why are you disputing this outcome?**

Options:

* I completed the task on time but reported it late
* I have evidence the task was completed on time
* An unexpected circumstance affected my commitment
* Something went wrong with the app

Do NOT include a generic option that allows users to simply undo a failed commitment.

The system should make it clear:

**Changing your mind or simply missing the commitment is not grounds for an appeal.**

---

# STATE 5 — FILE AN APPEAL

After selecting a reason, create a structured appeal form.

Show the original commitment terms at the top:

Task
Deadline
Definition of done
Original evidence requirement
Bounty

Then ask the user to provide information relevant to their claim.

For late reporting:

**When did you actually complete the task?**

**Provide the evidence originally agreed upon.**

For unexpected circumstances:

**What happened?**

Provide a short text field.

For technical problems:

Ask the user to briefly describe what went wrong.

Make the process intentionally require some effort.

The goal is not to punish the user.

The goal is to introduce enough friction that users do not automatically dispute every failed commitment.

Primary CTA:

**Submit appeal**

Before submission, show:

**Submitting an appeal does not guarantee your bounty will be returned.**

---

# STATE 6 — MARIMO REVIEWS THE CASE

Create a theatrical review sequence similar to the existing commitment ceremony.

Show messages sequentially:

**Opening case file...**

**Reviewing original terms...**

**Examining submitted evidence...**

**Checking for suspicious excuses...**

**Consulting Marimo...**

Pause.

Show Marimo inspecting documents or behaving like a tiny judge / CEO / compliance officer.

Then reveal the ruling.

---

# OUTCOME A — APPEAL APPROVED

Show a dramatic status:

**RULING OVERTURNED**

Supporting copy:

Your commitment outcome has been corrected.

Show:

**$25 returned**

If the task was legitimately completed:

**$25 → Japan Trip**

Include a small audit trail:

Original outcome:
Missed

Final outcome:
Completed on time

Reason:
Completion reported late

Marimo:

**“The evidence is annoyingly sufficient.”**

Primary CTA:

**Return to commitments**

---

# OUTCOME B — APPEAL DENIED

Show:

**RULING UPHELD**

Supporting copy:

The original commitment outcome remains unchanged.

Show:

**$25 → Marimo**

Provide a brief reason.

Example:

The submitted evidence does not establish that the commitment was completed before the deadline.

Marimo:

**“Nice try.”**

Do not make this screen cruel or overly punitive.

Primary CTA:

**Return to commitments**

---

# COMMITMENT DETAIL — OUTCOME HISTORY

Update the commitment detail screen to include a simple history or audit trail.

Example:

**Commitment created**
Today, 10:14 AM

**Deadline**
Today, 2:30 PM

**Deadline passed**
Today, 2:30 PM

**Completion reported**
Today, 2:35 PM

**Reported completion time**
2:24 PM

**Evidence submitted**
Screenshot

**Final outcome**
Completed

This history should reinforce that Marimo is enforcing an agreement with transparent rules rather than arbitrarily taking money.

---

# DESIGN PRINCIPLES

This feature should introduce the idea of:

**Accountability with due process.**

The system should feel strict but fair.

Users should trust that:

* Marimo will enforce the commitments they make
* Missing a commitment has real consequences
* They cannot casually undo a failure
* Genuine mistakes can be corrected
* Technical errors will not permanently cost them money
* Every financial outcome has a clear explanation
* There is a record of what happened

Avoid creating a prominent “Undo” button.

Avoid making appeals effortless.

Avoid forcing users to interact with the app at the exact moment they complete a real-world task.

Avoid designing the system so that users can repeatedly claim they “actually finished on time” without any accountability.

Keep the existing clean, calm, accountability-forward visual system.

The financial portions should feel credible and trustworthy.

The appeals process can borrow visual language from legal, financial, or bureaucratic systems while maintaining Marimo's deadpan humor.

Marimo should feel like:

**A tiny CEO who enforces the rules but is reluctantly bound by due process.**

The larger product principle is:

**Marimo is strict. The system is fair.**

Build these states into the existing interactive prototype and connect them logically to the existing commitment creation, active commitment, deadline, completion, and bounty flows.
