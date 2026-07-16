Add a complete “Dispute Allocation” process to the existing Marimo accountability app.

This is an extension of the current prototype, not a rebuild. Preserve all existing screens, navigation, task data, animations, local state, commitment flows, Future Fund behavior, bounty behavior, and visual identity. Do not remove or simplify any existing functionality.

PURPOSE

Users need a fair way to challenge a bounty allocation when:

- They completed a task on time but reported it late
- A technical issue prevented submission
- An emergency or unavoidable interruption occurred
- The app recorded the wrong deadline or time zone
- A bounty was charged or allocated incorrectly
- Another legitimate error occurred

The process should feel like a real checks-and-balances system. Filing a dispute should require a thoughtful explanation, but it should not be hostile or impossible.

Marimo’s initial decision is not infallible.

ENTRY POINT: OFFICIAL RECORDS

Update the existing “Official Records” page.

For every finalized task record that involved a bounty allocation, add a small secondary button in the upper-right corner:

“Dispute allocation”

Do not show this action for active commitments.

Show the button only while the allocation is eligible for dispute. For the prototype, use a 7-day dispute window.

If the dispute window has expired, replace the button with:

“Dispute window closed”

Each official record should display:

- Task title
- Original deadline
- Recorded task result
- Completion submission time, if applicable
- Bounty amount
- Allocation destination
- Reason for the original decision
- Dispute status, if applicable
- Any later adjustments

Do not erase or overwrite the original decision if a dispute succeeds. Preserve it and append a correction to the record.

DISPUTE FLOW

Create the following interactive flow as either a focused multi-step page, modal, or side panel. On mobile, use a full-screen flow.

STEP 1: REVIEW THE DECISION

When the user selects “Dispute allocation,” show a summary of the original decision.

Example:

“Marimo allocated $25 after no completion was recorded by 2:30 PM.”

Display:

- Task
- Deadline
- Recorded completion status
- Submission time
- Bounty amount
- Allocation destination
- Reason for the decision

Include explanatory copy:

“If this record does not accurately reflect what happened, you may request a review.”

Primary action:

“Start dispute”

Secondary action:

“Return to records”

STEP 2: SELECT WHAT WENT WRONG

Ask:

“What was incorrect about this allocation?”

Use selectable cards or radio buttons:

1. I completed the task before the deadline but reported it late
2. A technical problem prevented me from submitting
3. An emergency or unavoidable interruption occurred
4. The deadline or time zone was recorded incorrectly
5. The bounty was charged or allocated incorrectly
6. Something else happened

The selected reason should determine the questions shown in the next step.

STEP 3: EXPLAIN WHAT HAPPENED

Ask the user for a short, structured timeline.

Always request:

- What happened?
- Why do you believe the allocation should be reversed?
- What correction are you requesting?

Show reason-specific fields.

If the user completed the task but reported it late, ask:

- Approximately when did you complete the task?
- When did you attempt to report it?
- What prevented you from reporting it before the deadline?

If there was a technical problem, ask:

- What happened when you tried to submit?
- Approximately when did the problem occur?
- What device or browser were you using?

If there was an emergency or interruption, ask:

- Did the interruption happen before or after completing the task?
- How did it affect your ability to complete or report the task?

Do not request sensitive medical or personal documentation.

If the deadline or time zone was incorrect, ask:

- What deadline did you expect?
- What deadline did the app display?
- What time zone were you using?

If the bounty was charged incorrectly, ask:

- What amount did you expect?
- What amount was actually allocated?
- Were you charged more than once?

If “Something else” was selected, ask:

- What part of the decision was incorrect?
- What should the correct outcome have been?

Include character guidance that encourages a concise but complete explanation.

STEP 4: SUPPORTING EVIDENCE

Allow the user to optionally add:

- Screenshot
- Image
- Link
- Timestamped document
- Short note
- Other supporting information

Supporting evidence should remain optional for ordinary self-attested tasks.

Use copy:

“Evidence can help, but it is not required for every type of commitment.”

Do not imply that users must photograph private daily activities.

STEP 5: AUTOMATIC FOLLOW-UP QUESTIONS

After the first explanation, simulate an automated review.

Show a short loading sequence:

- “Reviewing your statement…”
- “Comparing the official timeline…”
- “Checking for missing information…”
- “Consulting Marimo Compliance…”

The system should inspect the selected reason and entered responses.

If required information is missing, automatically generate one relevant follow-up question.

Examples:

- “You said the task was completed before the deadline. Approximately what time did you finish?”
- “What happened when you attempted to submit your completion?”
- “Was the task already completed when the interruption occurred?”
- “What deadline did the app display when you created the commitment?”
- “Were you charged more than once?”

Ask no more than two rounds of follow-up questions.

If sufficient information was already provided, skip directly to the review screen.

Do not automatically deny a dispute merely because supporting evidence was not uploaded.

STEP 6: REVIEW AND CONFIRM

Show a complete summary containing:

- Original allocation
- Dispute reason
- User’s timeline
- Requested correction
- Supporting evidence
- Answers to follow-up questions

Include a confirmation checkbox:

“I confirm that this explanation is accurate to the best of my knowledge.”

Disable submission until this checkbox is selected.

Primary action:

“Submit dispute”

Secondary action:

“Edit responses”

STEP 7: DISPUTE SUBMITTED

After submission, show a brief Marimo-themed animation:

- A case folder opens
- The task record enters the folder
- A paw-print case number is stamped onto it
- Marimo appears to inspect the paperwork

Display:

“Dispute filed”

Supporting copy:

“Marimo Compliance has opened a formal review. Your original allocation will remain visible while the case is reviewed.”

Generate a mock case number.

Example:

“Case MRC-0248”

Actions:

- “View case”
- “Return to Official Records”

DISPUTE STATUSES

Add clear, reusable status labels:

- Eligible for dispute
- Dispute filed
- Information needed
- Under review
- Allocation reversed
- Dispute denied
- Appealed
- Final decision

Do not communicate status through color alone. Include an icon and text label.

FOLLOW-UP STATE

If additional information is needed, show an alert on:

- The home screen
- The relevant Official Record
- The dispute case page

Copy:

“Marimo Compliance requires additional testimony.”

Primary action:

“Answer follow-up”

Show the outstanding question and a response field.

For the prototype, allow the user to simulate receiving a follow-up request.

REVIEW AND APPROVAL LOGIC

Create simulated rule-based decision logic.

Use the user’s selected dispute reason and responses to produce one of three results:

1. Approved
2. Additional information needed
3. Denied

Likely approval conditions:

- Evidence or a credible timeline shows the task was completed before the deadline
- A completion report was only slightly late
- It is the user’s first late-reporting dispute
- A technical or payment error is confirmed
- The recorded deadline or time zone was incorrect
- The explanation is complete, consistent, and plausible

Conditions requiring additional information:

- Completion time is missing
- The explanation does not provide a clear timeline
- The requested correction is unclear
- Part of the explanation conflicts with the official record
- A technical issue is mentioned without explaining what happened

Likely denial conditions:

- The user does not claim that the task was completed before the deadline
- The explanation does not identify an error in the allocation
- The timeline indicates that the task was completed after the deadline
- A follow-up request remains unanswered
- The dispute repeats a previously resolved claim without new information

For prototype testing, add discreet demo controls that let the tester simulate:

- Request additional information
- Approve dispute
- Deny dispute

Keep demo controls visually separate from the normal user experience.

APPROVED OUTCOME

When approved:

- Preserve the original allocation record
- Add an “Allocation reversed” adjustment
- Restore the bounty to the appropriate Future Fund
- Restore the user’s streak when applicable
- Update any relevant totals
- Mark the dispute as approved

Show a restrained animation of Marimo reluctantly pushing the bounty back toward the user.

Display:

“Allocation reversed”

Supporting copy:

“The review supports that your commitment was completed before the deadline. $25 has been restored to your Future Fund.”

Marimo commentary:

“Administrative correction issued. Do not make this a habit.”

Actions:

- “View updated record”
- “Return home”

DENIED OUTCOME

When denied:

- Preserve the original allocation
- Keep the original streak result
- Add the decision and explanation to the Official Record
- Mark the dispute as denied

Display:

“Original allocation upheld”

Provide a specific reason, such as:

“The information provided did not establish that the task was completed before the deadline.”

Do not use insulting or shaming language.

Actions:

- “Review decision”
- “Submit final appeal”
- “Make a new commitment”

FINAL APPEAL

Allow one final appeal per allocation.

The appeal should not repeat the entire original form. Ask:

“What new or corrected information should be considered?”

Allow the user to:

- Add new evidence
- Correct a previous response
- Explain a discrepancy
- Submit a final statement

Clearly state:

“A final appeal must include new or corrected information.”

After submission, update the status to:

“Appealed”

The final result must be either:

- Allocation reversed
- Final decision: original allocation upheld

Do not allow further appeals after a final decision.

OFFICIAL RECORD UPDATES

The Official Record should preserve the complete history as a chronological timeline:

- Original commitment created
- Deadline reached
- Original allocation decision
- Dispute filed
- Follow-up requested, if applicable
- User response
- Initial decision
- Appeal, if applicable
- Final adjustment or final denial

If an allocation is reversed, show both:

“Original allocation: $25 allocated to Marimo’s Retirement Fund”

and:

“Adjustment: $25 restored to Japan Trip Future Fund”

Never silently rewrite financial history.

VISUAL AND TONE DIRECTION

Use the existing clean, accountability-forward visual identity.

The dispute process should feel:

- Fair
- Calm
- Structured
- Transparent
- Slightly bureaucratic
- Mildly ridiculous because Marimo operates a compliance department

The humor should appear in secondary copy and animation, not in critical instructions or decision explanations.

Use phrases such as:

- “Marimo Compliance”
- “Official testimony”
- “Reviewing mitigating circumstances”
- “Administrative correction”
- “The original allocation has been upheld”

Avoid:

- Aggressive legal threats
- Shame-based language
- Making the user feel accused of lying
- Excessive paperwork
- More than two follow-up rounds
- Hiding why a decision was made

RESPONSIVE AND ACCESSIBLE BEHAVIOR

- Make the flow work on desktop and mobile
- Use a full-screen dispute flow on small screens
- Preserve entered information when navigating backward
- Include clear focus states and keyboard navigation
- Maintain WCAG AA contrast
- Use text and icons for every status
- Respect reduced-motion preferences
- Replace large animations with short fades and static result illustrations when reduced motion is enabled
- Clearly announce validation errors and status changes
- Never let animation block a required action

PROTOTYPE DATA

Include at least three testable Official Records:

1. A missed task eligible for dispute
2. A dispute currently waiting for additional information
3. A previously approved dispute showing the original allocation and reversal

Use realistic sample data from the existing Marimo app, and make every dispute action interactive.

FINAL REQUIREMENT

Implement this as a functional extension of the existing prototype. Preserve all existing product behavior while adding the complete dispute lifecycle, conditional follow-up questions, simulated review logic, approval and denial outcomes, one final appeal, and transparent Official Record adjustments.