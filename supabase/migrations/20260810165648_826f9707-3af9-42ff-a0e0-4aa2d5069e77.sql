DELETE FROM public.tracked_groups t
USING public.tracked_groups keep
WHERE t.user_id = keep.user_id
  AND t.group_jid = keep.group_jid
  AND t.id <> keep.id
  AND (
    (keep.is_tracked AND NOT t.is_tracked)
    OR (keep.is_tracked = t.is_tracked AND keep.created_at <= t.created_at AND keep.id < t.id)
  );

ALTER TABLE public.tracked_groups
  ADD CONSTRAINT tracked_groups_user_group_unique UNIQUE (user_id, group_jid);