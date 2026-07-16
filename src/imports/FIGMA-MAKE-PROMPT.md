# Figma Make starter prompt — Marimo's Bounty

Build a polished, responsive web-app prototype called **Marimo’s Bounty**. It is a cute, playful, slightly passive-aggressive accountability tool featuring Marimo, a fluffy calico cat mascot. A user commits to a task, chooses a deadline, and stakes a simulated cash “bounty.” If they complete the task, they keep the bounty and Marimo earns a treat. If they miss the deadline, Marimo yeets the bounty into the stratosphere.

Use the attached transparent Marimo assets as core product UI, not decoration:

- `marimo-idle.png`: default and judgmental waiting state
- `marimo-laptop.png`: empty state or “you should be working” state
- `marimo-treat-paw.png`: success state and treat reward
- `marimo-bounty-yeet.png`: failed-task state
- `marimo-avatar.png`: header/profile mascot

## Product experience

Create one cohesive, stateful single-page app with these functional states:

1. **New commitment**
   - Task name field
   - Optional short note
   - Date and time deadline picker
   - Bounty presets: $5, $10, $25, $50, plus custom amount
   - Proof requirement selector: honor system, upload screenshot, or paste link
   - Primary button: “Inform Marimo”
   - Before submission, show Marimo lounging on the laptop with: “She cannot believe this required supervision.”
   - Validate required fields and show clear inline errors.

2. **Active commitment**
   - Prominent task card with task, countdown, bounty, and proof requirement
   - Use `marimo-idle.png` beside the card
   - Status copy: “Marimo has been informed.”
   - As the deadline gets closer, rotate through increasingly judgmental messages:
     - “Plenty of time. Allegedly.”
     - “Marimo has begun monitoring the situation.”
     - “She would like to remind you that failure is not free.”
   - Actions: “I finished it” and a quieter “Edit commitment.”
   - Include a small development/demo control labeled “Simulate missed deadline” so the failure state can be tested immediately.

3. **Proof and success**
   - Clicking “I finished it” opens a proof modal appropriate to the selected proof type.
   - After submission, transition to a success card using `marimo-treat-paw.png`.
   - Headline: “Acceptable. Marimo will take her treat now.”
   - Show “Bounty kept” and increment a visible treat counter.
   - Add a restrained treat animation and a button to create another commitment.

4. **Failure and bounty yeet**
   - When the deadline passes or the demo control is selected, transition into a dramatic but cute failure state using `marimo-bounty-yeet.png`.
   - Animate the bounty counter or coin flying diagonally offscreen with a tiny sparkle trail.
   - Headline: “Deadline missed. Marimo has made an executive decision.”
   - Supporting copy: “Your $25 bounty has entered low Earth orbit.” Use the actual selected amount dynamically.
   - Show “Bounty lost” and provide a button to try again.

5. **History**
   - Include a compact history section showing completed and failed commitments.
   - Each row includes task, date, bounty, result, and treat earned.
   - Summary stats: tasks completed, bounties kept, bounties yeeted, and treats earned.

## Visual direction

The interface should feel like a charming indie productivity product, not a bank, casino, children’s game, or generic SaaS dashboard. Marimo’s deadpan personality is the emotional center.

- Warm cream background: `#FFF8EC`
- Deep forest green text and primary controls: `#29483D`
- Soft sage surfaces: `#DDE8DA`
- Dusty pink secondary accent: `#E8B7AE`
- Golden bounty accent: `#E5A93D`
- Dark ink text: `#24251F`
- Rounded cards with subtle borders and soft shadows
- Friendly rounded grotesk typography such as Nunito Sans, Manrope, or a similar available font
- Spacious layout, large readable type, strong accessibility contrast
- Use small paw, treat, clock, and coin icons sparingly
- Avoid gradients everywhere, glassmorphism, loud fintech styling, excessive gamification, and overly childish visuals

## Interaction and implementation requirements

- Make every primary action functional.
- Persist current commitment, history, selected bounty, and treat count in `localStorage` so state survives refreshes.
- Use simulated money only. Do not implement Stripe, authentication, real payments, a database, or external APIs.
- Build responsive desktop and mobile layouts.
- Use smooth 180–300ms transitions and respect reduced-motion preferences.
- Keep the mascot images sharp, uncropped, and proportionally scaled.
- Start with realistic sample data: task “Finish portfolio case study,” deadline “Tonight at 10:00 PM,” and bounty `$25`.
- Include a reset-demo control in a discreet settings menu.

The result should feel complete enough to click through and user-test, while keeping the architecture simple enough to revise inside Figma Make.
