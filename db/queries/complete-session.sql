BEGIN;

UPDATE sessions
SET status = 'completed',
    duration_seconds = $3,
    completed_at = NOW(),
    updated_at = NOW()
WHERE id = $1
  AND user_id = $2
  AND status = 'active'
RETURNING id;

UPDATE users
SET remaining_sessions = remaining_sessions - 1,
    updated_at = NOW()
WHERE id = $2
  AND remaining_sessions > 0
RETURNING remaining_sessions;

INSERT INTO evaluations (
  session_id,
  user_id,
  clarity,
  relevance,
  persuasion,
  tone_composure,
  overall_score,
  strongest_point,
  priority_improvement,
  better_phrasing_example,
  recurring_weakness_tag
)
VALUES ($1, $2, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING id;

COMMIT;
