# Sketchy human playtest protocol

Status: NOT RUN. Automated clients and synthetic test drawings are not human participants.

Recruit two consenting first-time groups: one with eight players, one with people in separate locations (four or more). Do not send invitations or record participants without the user's explicit instructions and their consent. Use the eventual public build; record its URL and commit.

Give only: “One player has a different drawing prompt. Draw yours and work out who it is.” Let onboarding explain the rest. Observe without coaching unless someone is stuck; record any help given.

| Observation | Group 1 | Group 2 |
|---|---|---|
| Date, build, player/device counts | Not run | Not run |
| Consent / recording preference | Not obtained | Not obtained |
| Time to first drawing action | Unmeasured | Unmeasured |
| Rules questions and missed actions | Unobserved | Unobserved |
| Small-screen drawing/gallery/result problems | Unobserved | Unobserved |
| Did everyone find their verdict? | Unobserved | Unobserved |
| Remote discussion and reconnect | Unobserved | Unobserved |
| What was funny, unfair, slow, unclear? | Unasked | Unasked |
| Voluntary replay, without prompting | Unobserved | Unobserved |

Record feedback without personal identifiers unless necessary and consented. Separate observations from design hypotheses. Fix recurring problems and retest affected steps. Add mechanics only in response to an observed problem or a clearly stated creative hypothesis.

## Human labeling for AI evaluation

Run `npm run eval:prepare`. Open artifacts/ai-eval/review.html. For each sketch, a human records their name/pseudonym, review timestamp, visible subject, distinguishing clue and expected score range in labels.json before live outputs are generated. For blank sketches, explicitly label no subject/clue and [0,0]. Author-intent metadata is not a human judgment of what is actually visible.

After `npm run eval:run`, inspect comparison.html including failed edits. Record whether each distinguishing clue was preserved; calculate the fraction of successfully assessed transformations preserving it, plus the rate including failed edits. Compare real/decoy groups. Proposed target ≥90% is a release hypothesis, not a contest rule or an observed result. Review repeated ratings (median absolute difference ≤10 target) and document disagreements instead of relabeling the input to suit outputs.
