Paste this into Figma Make with your existing app open:

```text
Refine the existing Marimo accountability app’s visual identity and interaction design.

This is an update to the existing product—not a rebuild. Preserve all current screens, routes, functionality, task states, local data, buttons, countdown behavior, simulation controls, and existing Marimo assets. Do not remove or simplify working features.

PRODUCT POSITIONING

Marimo is an accountability platform disguised as a funny cat app.

The product should feel genuinely useful for helping people keep commitments—not like a generic task manager or novelty pet game. The interface should communicate:

- Clear commitments
- Meaningful stakes
- Visible deadlines
- Satisfying follow-through
- Playful consequences

Marimo is a tiny, mildly passive-aggressive CEO who supervises the user, expects treats, reviews completed work, and dramatically yeets missed bounties into the stratosphere.

The humor should come primarily through Marimo’s behavior, microcopy, and cinematic animations. Keep the core interface clean, calm, and credible.

VISUAL DIRECTION

Create a clean, polished, accountability-forward visual system with a warm and pleasant personality.

The interface should feel like a combination of:

- A calm financial wellness product
- A focused commitment tracker
- A restrained but humorous cat-led company

Avoid:

- Excessively childish styling
- Generic productivity-dashboard aesthetics
- Too many pastel colors
- Excessive gradients
- Constant decorative animation
- Cartoonish UI components
- Overusing cat imagery
- Making every component rounded and bubbly

Use a restrained visual system:

- Warm ivory or cream page background
- Deep forest green for primary text, navigation, and major actions
- Muted sage for secondary surfaces and progress areas
- Soft warm gray for inactive and supporting information
- Golden amber reserved for bounty amounts, treats, rewards, and financial stakes
- Muted coral or red only for genuine risk, failed commitments, or destructive actions
- White or lightly tinted cards with subtle borders and shadows

Typography should be modern, highly legible, and slightly editorial. Use strong differences between task titles, bounty values, countdown information, supporting labels, and Marimo’s commentary.

Create a reusable system for:

- Page titles
- Section labels
- Task cards
- Bounty badges
- Countdown modules
- Status indicators
- Progress bars
- Primary and secondary buttons
- Empty states
- Dialogs
- Toast notifications
- Marimo commentary
- Success and failure states

ACCOUNTABILITY HIERARCHY

On every active commitment screen, make this information immediately understandable in this order:

1. What the user promised to complete
2. When it must be completed
3. How much money or value is at stake
4. What proof or completion requirement is expected
5. The primary completion action
6. Marimo’s current judgment or supervision status

Make deadlines and stakes prominent without making the interface visually stressful.

The task title should be the strongest element. The countdown should be easy to scan. The bounty should feel meaningful and financially tangible, but it should not overpower the task itself.

Use plain language such as:

- Active commitment
- Time remaining
- Bounty at stake
- Completion requirement
- Submit completion
- Commitment completed
- Deadline missed

Marimo’s secondary commentary can carry more personality, such as:

- “Marimo has been informed.”
- “Plenty of time. Allegedly.”
- “Management is monitoring the situation.”
- “Evidence has been forwarded for review.”
- “Marimo recognizes your compliance.”
- “The bounty has left the atmosphere.”

INTERACTION AND MOTION PRINCIPLES

Keep normal navigation and task management calm, fast, and restrained. Use small, polished transitions for everyday actions.

Reserve large, ridiculous animations for meaningful moments:

- Creating a commitment
- Increasing a bounty
- Submitting proof
- Completing a task
- Reaching a streak milestone
- Missing a deadline
- Attempting to abandon a commitment

Animations should feel responsive and satisfying, not random or continuous.

Use subtle motion for standard interactions:

- 150–250ms button and hover transitions
- Gentle card elevation on hover
- Smooth number changes
- Progress bars that animate to their new state
- Clear pressed, loading, success, disabled, and error states
- Small status transitions when a commitment changes state

Use larger cinematic sequences lasting approximately 1.5–4 seconds only for major outcomes.

MARIMO ANIMATION SEQUENCES

1. CREATING A COMMITMENT

After the user confirms a new task:

- Transition into a short “Reviewing commitment” state
- Cycle through brief status messages:
  - “Reviewing terms…”
  - “Evaluating excuses…”
  - “Informing Marimo…”
- Show Marimo looking at or inspecting the commitment
- Finish with a firm approval stamp or paw-print stamp
- Display: “Commitment accepted. Marimo has been informed.”
- Continue naturally to the active commitment screen

Do not make the user wait more than a few seconds, and provide reduced-motion behavior.

2. ADDING OR INCREASING A BOUNTY

As the amount increases:

- Animate the bounty number smoothly
- Let Marimo’s expression or posture become slightly more attentive
- For larger amounts, show a small treat indicator or sparkle near Marimo
- Keep this subtle; do not trigger a full-screen animation for every amount change

3. SUBMITTING COMPLETION

When the user selects “I finished it”:

- Open the existing completion or proof flow
- Change the primary action copy to “Submit for review”
- After submission, show a short mock review sequence:
  - “Receiving evidence…”
  - “Checking for suspicious behavior…”
  - “Consulting management…”
- Show Marimo inspecting the submitted link, text, or completion claim
- End with a decisive approval state

4. SUCCESS

When a commitment is completed:

- Transition the interface into a warm success state
- Show the bounty moving safely toward the user’s selected Future Fund
- Give Marimo a treat
- Trigger a short celebratory Marimo spin
- Use restrained confetti, stars, or treat particles
- Display:
  - “Commitment honored.”
  - “Your bounty is safe.”
  - “Marimo acknowledges your competence.”
- Show the updated streak and Future Fund progress
- Keep the action satisfying but not visually overwhelming

5. MISSED DEADLINE / BOUNTY YEET

Preserve the existing missed-deadline simulation control for prototype testing.

When a deadline is missed:

- Briefly quiet or dim the interface
- Show: “Deadline missed.”
- Let Marimo enter or become the visual focus
- Show the bounty amount being collected
- Pause briefly for comedic timing
- Animate Marimo swatting or launching the bounty upward
- The bounty should accelerate dramatically into the sky or outer space
- Add a shrinking coin or bounty object, motion trail, stars, and a distant sparkle
- Display:
  - “The bounty has left the atmosphere.”
  - “Marimo has allocated the funds accordingly.”
- Transition into the failed commitment summary
- Clearly explain where the bounty went and how the user can recover or rebuild their streak

Make this funny and memorable, but never shame or insult the user.

6. ATTEMPTING TO ABANDON A COMMITMENT

When the user tries to cancel or abandon an active commitment:

- Open a clear confirmation dialog
- Show the actual consequence before cancellation
- Optionally show Marimo slowly placing one paw near or over the cancel action
- Use microcopy such as:
  - “Leaving so soon?”
  - “Marimo requires a reason for the quarterly report.”
- Keep the dialog usable and do not obstruct the user from making the final choice

SCREEN-SPECIFIC REFINEMENTS

HOME / DASHBOARD

Make the current active commitment the primary focus.

Include:

- A concise greeting or supervision status
- One clearly featured active commitment
- Time remaining
- Bounty at stake
- Current streak
- Future Fund progress
- A clear action to create another commitment, if allowed
- A smaller history or recent activity section

Avoid turning the home screen into a dense analytics dashboard.

CREATE COMMITMENT

Structure the flow as a focused agreement:

- Task
- Definition of done
- Deadline
- Bounty amount
- Destination if successful
- Consequence if missed
- Final review

Use clear progressive disclosure. Make the final confirmation feel like signing a commitment rather than casually adding a to-do.

ACTIVE COMMITMENT

Emphasize the task title, countdown, bounty, completion requirement, and completion action.

Marimo should act as a supervisor beside the commitment but should not compete with the critical information.

HISTORY

Clearly distinguish:

- Completed
- Missed
- Active
- Canceled

Use compact status chips, dates, bounty outcomes, and small Marimo reactions. Keep this screen easy to scan.

FUTURE FUND / REWARDS

Make successful follow-through feel cumulative.

Show:

- Fund name
- Current amount
- Progress toward target
- Contributions from completed commitments
- Streak milestones
- Treats earned for Marimo

This should reinforce long-term progress, not feel like a banking wallet.

RESPONSIVE BEHAVIOR

Design the experience mobile-first while keeping the desktop version polished.

On mobile:

- Keep the primary task and action above the fold when possible
- Stack task information logically
- Make touch targets at least 44px
- Keep bottom actions reachable
- Avoid tiny countdown labels
- Ensure animations fit within the viewport

On desktop:

- Use a centered, comfortably narrow content area
- Avoid stretching cards across the full screen
- Use optional side-by-side layouts only when they improve hierarchy
- Maintain generous whitespace

ACCESSIBILITY

- Maintain WCAG AA color contrast
- Do not communicate status through color alone
- Include visible focus states
- Support keyboard navigation
- Provide clear loading and error states
- Respect reduced-motion preferences
- When reduced motion is enabled, replace cinematic sequences with short fades, scale changes, and static illustrated result states
- Do not allow animations to prevent the user from completing an action

FINAL QUALITY

The finished product should feel credible enough for someone to trust with a real commitment, but distinctive enough that they want to show friends what Marimo did after they succeeded or failed.

The interface should be calm during planning, focused during execution, and absurdly satisfying during major outcomes.

Apply this visual system and interaction direction consistently throughout the existing prototype without removing its current functionality.
```
