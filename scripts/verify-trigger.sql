-- verify-trigger.sql
-- Run via: npx supabase db query --linked -f scripts/verify-trigger.sql
-- Verifies the track_idea_content_version trigger against 3 properties:
--   (a) No-op: same content → no second version row
--   (b) Change: different content → new version row with chained previous_hash
--   (c) No infinite recursion: row count stays bounded

do $$
declare
  test_id      uuid;
  v_count      int;
  v_hash1      text;
  v_hash2      text;
  v_prev       text;
  bh_len       int;
  bh_val       text;
begin

  -- ── 1. INSERT a test idea ──────────────────────────────────────────────
  insert into ideas (title, problem, solution, visibility)
  values ('__verify_trigger_test__', 'test problem', 'test solution', 'private')
  returning id into test_id;

  -- Allow trigger's recursive UPDATE to settle (it fires synchronously, so no wait needed)

  -- ── CHECK (a-pre): exactly 1 version row exists after insert ──────────
  select count(*) into v_count
  from idea_content_versions where idea_id = test_id;

  assert v_count = 1,
    format('FAIL (a-pre): expected 1 version row after insert, got %s', v_count);

  -- Capture the first hash
  select content_hash into v_hash1
  from idea_content_versions where idea_id = test_id
  order by created_at desc limit 1;

  -- ── CHECK: blockchain_hash is a real 64-char hex SHA-256 ──────────────
  select blockchain_hash into bh_val from ideas where id = test_id;
  bh_len := length(bh_val);

  assert bh_len = 64,
    format('FAIL (d): blockchain_hash length is %s, expected 64. Value: %s', bh_len, bh_val);

  assert bh_val ~ '^[0-9a-f]{64}$',
    format('FAIL (d): blockchain_hash is not lowercase hex. Value: %s', bh_val);

  assert bh_val = v_hash1,
    format('FAIL (d): blockchain_hash %s != version content_hash %s', bh_val, v_hash1);

  -- ── CHECK (a): UPDATE with identical content → still 1 version row ────
  update ideas set title = '__verify_trigger_test__' where id = test_id;

  select count(*) into v_count
  from idea_content_versions where idea_id = test_id;

  assert v_count = 1,
    format('FAIL (a): no-op update created extra version row, count = %s', v_count);

  -- ── CHECK (b): UPDATE with changed content → 2nd version row ──────────
  update ideas set problem = 'changed problem' where id = test_id;

  select count(*) into v_count
  from idea_content_versions where idea_id = test_id;

  assert v_count = 2,
    format('FAIL (b): expected 2 version rows after content change, got %s', v_count);

  -- Verify previous_hash of new row chains to old row's content_hash
  select content_hash, previous_hash into v_hash2, v_prev
  from idea_content_versions where idea_id = test_id
  order by created_at desc limit 1;

  assert v_prev = v_hash1,
    format('FAIL (b): previous_hash %s != first content_hash %s', v_prev, v_hash1);

  assert v_hash2 != v_hash1,
    'FAIL (b): second content_hash should differ from first';

  -- ── CHECK (c): no runaway recursion — only 2 version rows total ────────
  select count(*) into v_count
  from idea_content_versions where idea_id = test_id;

  assert v_count = 2,
    format('FAIL (c): expected exactly 2 version rows, got %s (possible recursion?)', v_count);

  -- ── CLEANUP ────────────────────────────────────────────────────────────
  delete from idea_content_versions where idea_id = test_id;
  delete from ideas where id = test_id;

  raise notice 'ALL CHECKS PASSED';
  raise notice '  (a) no-op update: no duplicate version row ✓';
  raise notice '  (b) content change: new version row with correct previous_hash ✓';
  raise notice '  (c) no infinite recursion: total version rows = 2 ✓';
  raise notice '  (d) blockchain_hash = 64-char hex SHA-256 ✓';
  raise notice '      hash1=%', v_hash1;
  raise notice '      hash2=%', v_hash2;
  raise notice '      previous_hash=%', v_prev;

end $$;
