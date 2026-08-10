# Why Google works in the editor but not on the published app

## What I checked

- The live site at `parentpulse-task-digest.lovable.app` is still serving an **older sign-in bundle**. Its code still contains the abandoned custom `/~oauth/initiate` redirect fallback that we already removed from the project. That fallback bypasses the managed session handoff, so Google accepts the login and the app still shows you as signed out.
- The editor preview runs the current code, which uses the supported managed Google flow — that is why sign-in works there.
- Backend auth records confirm Google itself is enabled and issuing successful logins today.

So this is a **deployment gap, not a code bug**: the Google fix exists in the project but has never reached the published site. Frontend changes only go live when the Publish dialog's **Update** is used.

## Why the published app shows different groups

The second screenshot (demo groups, "pending connection") is the published app while **signed out**. When no user session exists the Groups screen falls back to sample data. Once the published build has the working Google sign-in, it will show your real groups and live connection state like the editor does.

## Why messages are not becoming tasks

The worker is healthy and connected, and it is receiving messages — but it is discarding almost all of them:

```text
messagesReceived: 15
skipped: { group-not-tracked: 14, sent-by-self: 1 }
actionableMessages: 0
```

In the database only **1 group out of 187** is marked as tracked, and it is not a group where new messages are arriving. The pipeline is working; it simply has no groups to listen to.

## Plan

1. **Publish an Update** so the live site gets the current, working Google sign-in code, then verify on the published URL: sign in with Google, confirm the app leaves `/auth` and stays signed in after a refresh.
2. **Confirm the published Groups screen** then shows your real WhatsApp groups and "Connected" instead of the sample list.
3. **Turn on the parent groups you care about and press "Save selected groups"** so the tracked-group count in the database goes above 1.
4. **Send a task-style message** in one of those groups from another participant and confirm the worker's `tasksSent` counter increases and the task appears in Actions.
5. If tasks still do not appear after groups are tracked, inspect the worker's extraction rules against real message text and widen them.

## Technical notes

- Live bundle `auth-rK0G0Sx7.js` still contains `oauth/initiate`; current `src/routes/auth.tsx` does not. No code change is required for step 1 — only a publish.
- No source edits are planned unless step 5 is needed; steps 1-4 are deploy and configuration.
