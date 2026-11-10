# Marimo's Bounty 🐈

*A mildly judgmental accountability app, supervised by Marimo, CEO of Marimo Industries.*

Marimo's Bounty is a playful, interactive prototype for following through on personal commitments. Set a task and deadline, assign a **simulated** cash bounty, and report back to Marimo. Finish on time and your bounty goes toward your imaginary Future Fund (and Marimo gets a treat). Miss the deadline and management may launch the bounty into orbit.

**This is a concept prototype, not a financial product.** It does not collect payments, move money, or verify task completion independently.

## What you can explore

- Create commitments with deadlines, bounty amounts, notes, and completion-proof preferences.
- Track an active commitment, countdown, and Marimo's increasingly pointed commentary.
- Submit completion evidence or experience the missed-deadline sequence.
- Review commitment outcomes, streaks, treats, and a simulated Future Fund.
- Explore a prototype dispute/appeal flow for missed commitments.
- Try the responsive interface on desktop or mobile.

## How I built it

I'm a product designer exploring how AI-assisted development can turn interaction concepts into functional prototypes.

1. **Concept and interaction design:** I developed the accountability premise, the character of Marimo as a deadpan feline executive, and the commitment → outcome → consequence journey.
2. **Figma Make prototyping:** I used structured design and implementation prompts in Figma Make to generate and iterate on a React-based interactive prototype. The original design file is linked below.
3. **Design refinement:** I iterated on the visual hierarchy, task and deadline clarity, playful microcopy, mascot illustrations, and animated success/failure states.
4. **Workflow expansion:** The prototype includes additional flows for commitment records, the Future Fund, and disputed outcomes, using local browser state rather than a backend.

The repository preserves some of the original prompts and design notes in `src/imports/`, including `FIGMA-MAKE-PROMPT.md` and the design brief. They document design intent and may not match every detail of the latest implementation.

## Tech stack

- **React + TypeScript** for the interface and application state
- **Vite** for local development and builds
- **React Router** for navigation
- **Tailwind CSS** and reusable UI components, including **Radix/shadcn-style** primitives
- **Motion** and illustration assets for playful feedback
- **Browser localStorage** for prototype state, history, and preferences

There is no production database, account system, payment processor, or server-side verification in this repository.

## Run locally

You'll need a recent version of Node.js and npm.

```bash
git clone https://github.com/kayoitokuda/Marimo-App.git
cd Marimo-App
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production bundle:

```bash
npm run build
```

**Note:** The app stores prototype data in your browser's local storage. Clearing site data or using a different browser may reset your progress. Any displayed money is fictional.

## Project links

- [Figma Make prototype](https://www.figma.com/make/8NfxezR3NTuKjkIZ7DaY7X/Marimo-s-Bounty-Prototype?t=sAAga4pDQJvpgtRI-20&fullscreen=1&preview-route=%2Fonboarding)

## Notes and limitations

This is an experimental design prototype, not a production-ready service. Some flows simulate decisions and consequences; submitted proof and disputes are not independently reviewed. There are no real transfers or enforceable financial stakes. Avoid entering sensitive personal information.

Third-party UI components and image sources are noted in [ATTRIBUTIONS.md](./ATTRIBUTIONS.md). Review asset licenses and commit history before redistributing or publishing the repository.

---

**Marimo has reviewed this README. Management remains cautiously optimistic.**
