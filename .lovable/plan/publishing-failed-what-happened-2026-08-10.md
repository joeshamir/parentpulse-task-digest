# Publishing failed — what happened

The error is not in your app's code. The build itself finished; the step that
uploads the finished build to Lovable's storage was rejected:

```text
dist upload failed: AccessDenied ... status code: 403
```

That is a permissions error on Lovable's own storage bucket — a platform-side
hiccup. Nothing in ParentPulse (worker, auth, database) caused it, and nothing
in the code needs changing to resolve it.

## What to do

1. Retry the publish. Transient 403s on the upload step usually clear on the
   next attempt.
2. If it fails a second time with the same AccessDenied message, it is an
   infrastructure issue on Lovable's side and needs to be reported to support
   with the timestamp — no code fix will help.

## Meanwhile

Your previously published version stays live and unaffected; a failed upload
does not take the site down.

If you approve, I will trigger a fresh publish and report whether the upload
succeeds this time.
