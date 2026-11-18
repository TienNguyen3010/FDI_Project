-- 007_ops_bridge.sql — runtime bridge: customer grant cho admin + view `tickets`
-- từ bảng `alerts` (schema cũ 001-005). Idempotent. Apply sau 006.
-- Lý do: dashboard API v1.0 query `tickets`/`customer_id`, runtime DB dùng `alerts`.
-- Không đổi bảng đã apply (001-005); chỉ thêm view + grant.

BEGIN;

-- 1) Grant customer scope cho admin (super_admin) — deny-by-default nên cần grant.
INSERT INTO public.user_grants (id, user_id, customer_id, role_code, scope, valid_from)
SELECT gen_random_uuid(), u.id, c.id, 'super_admin', 'customer', now()
FROM auth.users u
CROSS JOIN public.customers c
WHERE u.email = 'admin@fdi.local'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_grants g
    WHERE g.user_id = u.id AND g.customer_id = c.id
  );

-- 2) Bridge view: alerts (runtime) -> tickets (contract v1.0).
-- scope customer của alert lấy qua site->customer.
CREATE OR REPLACE VIEW public.tickets WITH (security_invoker = true) AS
SELECT a.id,
       c.id AS customer_id,
       a.site_id,
       ('INC-' || substring(a.id::text, 1, 8)) AS code,
       'incident'::text AS type,
       CASE a.severity WHEN 'critical' THEN 'p1' WHEN 'major' THEN 'p2' ELSE 'p3' END AS priority,
       CASE a.status
         WHEN 'acknowledged' THEN 'triaged'
         WHEN 'closed' THEN 'closed'
         WHEN 'resolved' THEN 'resolved'
         WHEN 'in_progress' THEN 'in_progress'
         ELSE 'new'
       END AS status,
       1 AS version,
       a.created_at
FROM public.alerts a
JOIN public.sites s ON s.id = a.site_id
JOIN public.customers c ON c.id = s.customer_id;

INSERT INTO public.schema_migrations (version) VALUES ('007_ops_bridge')
ON CONFLICT DO NOTHING;

COMMIT;
