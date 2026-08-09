# Fix the unreadable WhatsApp QR code

## What's happening

The worker prints the pairing QR using tiny half-block characters. Railway's log
viewer uses line spacing and a font that squashes those blocks, so the QR comes out
smeared and your phone can't read it. Nothing is actually broken with the pairing —
only the way the code is drawn in the log.

## The fix

Change how the worker shows the QR so you have three ways to scan it:

1. Print a **larger, full-block QR** (instead of the compressed "small" version).
   Big blocks survive Railway's log rendering and scan reliably.
2. Also print a **one-click link** that renders the same pairing code as a clean
   image in your browser — you open the link on your computer and scan it with your
   phone. This is the most reliable option.
3. Print the **raw pairing string** as a fallback, so it can be turned into a QR by
   any tool if needed.

Each QR refresh (WhatsApp rotates it about every 20 seconds) will be numbered in the
log so it's obvious which one is current — always use the newest.

## Technical details

- In `worker/src/index.js`, in the `connection.update` handler:
  - call `qrcode.generate(qr, { small: false })` for a full-size terminal QR
  - log a browser URL that encodes the QR payload as an image
  - log the raw `qr` string and an incrementing attempt counter
- No new dependencies, no changes to auth-state handling or the volume.
- After the change you redeploy the worker service on Railway and open the printed
  link from the latest log entry.
