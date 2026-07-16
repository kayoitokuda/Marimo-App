Build and prototype the core **“Create a Commitment” flow** for the Marimo accountability app.

## Product context

Marimo is an accountability platform disguised as a funny cat app.

Users create commitments by putting a real financial bounty behind something they intend to complete. The product should make commitments feel like a clear agreement with your future self—not like casually adding another item to a to-do list.

Marimo, the cat mascot, acts like a tiny deadpan CEO / compliance officer. She takes the user's commitments extremely seriously, even when the interface is absurd and funny.

The emotional arc of this flow should be:

**Intent → Clarity → Stakes → Commitment → Ceremony**

As the user progresses, the experience should gradually shift from friendly and conversational to more structured, financial, and consequential.

Keep the existing Marimo visual identity and design system wherever possible. Do not redesign the entire application. Build this as a polished core flow that fits naturally into the existing product.

The interface should remain clean, spacious, pleasant, and highly usable. Humor should come primarily from Marimo's commentary, microcopy, and animation—not from cluttering the UI.

---

# FLOW: CREATE A COMMITMENT

Create this as a multi-step flow with a subtle progress indicator so users understand they are constructing an agreement.

Allow users to move backward and edit previous answers without losing their progress.

The primary CTA should remain visually consistent across steps and evolve with the context:

Continue → Define success → Set deadline → Set bounty → Review agreement → Commit $25

---

## SCREEN 1 — WHAT ARE YOU COMMITTING TO?

Headline:

**What are you committing to?**

Supporting copy:

Make it specific. Future You is going to need receipts.

Include:

* Large task title input
* Optional category selector
* Suggested commitment examples
* Continue CTA

Suggested examples:

Finish the Manager's Insights case study
Submit 5 job applications
Run 3 miles
Clean the entire kitchen
Finish portfolio homepage

After the user enters a task, show a small Marimo reaction.

Example:

User enters:

**Finish the Manager's Insights case study**

Marimo appears with commentary:

**“Specific. Long overdue. Acceptable.”**

Make Marimo's reaction feel responsive to the user's action rather than permanently displayed.

---

## SCREEN 2 — WHAT COUNTS AS DONE?

Headline:

**What counts as done?**

Supporting copy:

Define success now, before emotion and procrastination enter the chat.

Ask:

**What evidence will Future You accept?**

Present four selectable verification methods as clear cards:

* Self-attestation
* Submit a link
* Upload a screenshot
* Complete a measurable target

Selecting an option should reveal the relevant configuration.

Examples:

Self-attestation:
User confirms completion themselves.

Submit a link:
Provide a URL as proof.

Upload a screenshot:
Upload visual evidence of completion.

Measurable target:
Define a numeric target and unit.

Example:
5 job applications
3 miles
10 pages

Make this screen feel like defining the terms of an agreement, but keep the interaction simple.

---

## SCREEN 3 — SET THE DEADLINE

Headline:

**When is this due?**

Include:

* Date picker
* Time picker
* Live time-remaining preview

Quick-select options:

**Tonight**
**Tomorrow**
**This Weekend**

Show the calculated time remaining prominently after selection.

Example:

**9 hours, 14 minutes remaining**

Marimo should occasionally comment on the selected timeline.

Example:

**“Nine hours. Ambitious, but technically legal.”**

If the deadline appears unusually aggressive, show a subtle warning encouraging intentionality without preventing the user from continuing.

Example:

**This is a tight deadline. Are you setting yourself up to succeed?**

Do not make the warning feel punitive.

---

## SCREEN 4 — CHOOSE YOUR BOUNTY

This screen should represent the emotional turning point of the flow.

Headline:

**Put something on the line.**

Supporting copy:

Choose what this commitment is worth.

Suggested bounty options:

**$5**
**$10**
**$25**
**Custom**

Make $25 selected in the primary prototype path.

The interface should now feel slightly more financial and serious. Introduce stronger hierarchy, monetary formatting, and a clear outcome comparison.

Show the two possible outcomes:

### IF YOU COMPLETE IT

**+$25 → Japan Trip**

Your bounty moves toward your Future Fund.

### IF YOU MISS IT

**$25 → Marimo**

Marimo claims the bounty.

Visually contrast these outcomes without making the experience threatening or gambling-like.

The user should clearly understand the consequence before proceeding.

Include an option to select or change the success destination, such as:

**Japan Trip**

CTA:

**Review my agreement**

---

## SCREEN 5 — REVIEW THE AGREEMENT

This should feel like reviewing a tiny contract with yourself.

Headline:

**Review your commitment**

Display a clean structured summary:

**Commitment**
Finish the Manager's Insights case study

**Definition of done**
Submit final published case study URL

**Deadline**
Thursday, 9:00 PM

**Time remaining**
9 hours, 14 minutes

**Bounty**
$25.00

**If completed**
$25 → Japan Trip

**If missed**
$25 → Marimo

**Reminders**
3 hours before
1 hour before

Allow each section to be edited.

Include a small acknowledgment near the final action:

**I understand what counts as done, when this commitment is due, and what happens to my bounty.**

Primary CTA:

**Commit $25**

This CTA should feel more consequential than a normal app button.

---

# COMMITMENT CEREMONY

After the user presses **Commit $25**, do not immediately return them to the dashboard.

Create a short, ridiculous processing sequence.

The experience should parody a serious financial or legal transaction.

Animate through these messages one at a time:

**Reviewing terms...**

then

**Evaluating potential excuses...**

then

**Assessing likelihood of “I'll do it later”...**

then

**Informing Marimo...**

Pause briefly.

Show Marimo reacting.

Then:

**Commitment accepted.**

Final confirmation:

**$25 is now riding on this.**

**Finish the Manager's Insights case study**

**Due tonight at 9:00 PM**

Primary CTA:

**Get to work**

Secondary CTA:

**View commitment**

The ceremony should be satisfying, theatrical, and slightly absurd while remaining fast enough that it doesn't become annoying after repeated use.

Use playful motion:

* subtle loading states
* Marimo inspecting the agreement
* stamps or approval gestures
* small celebratory effects
* exaggerated seriousness

Avoid excessive confetti.

The humor should feel deadpan.

---

# INTERACTION AND UX REQUIREMENTS

Build the full flow as an interactive prototype, not just static screens.

Include:

* Forward navigation
* Back navigation
* Persistent entered data
* Selected states
* Input states
* Verification-method selection
* Date and time selection
* Quick deadline options
* Bounty selection
* Custom bounty input
* Success destination selection
* Editable review sections
* Final commitment ceremony
* Confirmation state

Add subtle transitions between steps.

Keep Marimo present throughout the experience, but vary her prominence. She should mostly observe during information entry and become increasingly involved as financial stakes are introduced.

Do not let Marimo commentary interrupt task completion.

Prioritize mobile-first responsive behavior, but ensure the flow also works cleanly as a responsive web application.

---

# DESIGN DIRECTION

The product should feel:

**Clean**
**Calm**
**Accountability-forward**
**Financially credible**
**Playfully bureaucratic**
**Slightly ridiculous**

Think of the experience as:

*A tiny startup CEO cat administering a legally questionable contract between Present You and Future You.*

The UI itself should be credible enough that the user trusts it with money.

Marimo is where the absurdity lives.

Use the existing application's typography, components, colors, spacing, and visual language as the foundation.

Do not make the interface overly cute or gamified.

Avoid generic productivity-app patterns where possible.

The key product principle is:

**Creating a commitment should feel meaningfully different from creating a task.**

By the time the user presses **Commit $25**, they should feel:

“I have clearly defined what I said I would do, when I will do it, how I will prove it, and what is at stake.”
