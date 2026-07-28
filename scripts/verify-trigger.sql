-- verify-trigger.sql
-- Run via: npx supabase db query --linked -f scripts/verify-trigger.sql
-- Verifies the track_idea_content_version trigger against 5 properties:
--   (1) INSERT → 64-char SHA-256 blockchain_hash + exactly 1 version row
--   (2) No-op UPDATE (same content) → still 1 version row
--   (3) Content-change UPDATE → 2nd version row with correct previous_hash chain
--   (4) No infinite recursion → still exactly 2 version rows after repeat no-op
--   (5) ideas.blockchain_hash always matches latest version content_hash

do $$
declare
  test_id      uuid;
  v_count      int;
  v_hash1      text;
  v_hash2      text;
  v_prev       text;
  bh_val       text;
  bh_len       int;
begin

  -- ── CHECK 1: INSERT → blockchain_hash populated + 1 version row ──────────
  insert into ideas (
    user_id, title, problem, solution, category, visibility, owner_email
  ) values (
    '588da391-4769-4b2f-8452-ce348002d921',
    '__verify_trigger_test__',
    'test problem',
    'test solution',
    '{Other}',
    'private',
    'corinnapcampbell@gmail.com'
  )
  returning id into test_id;

  select blockchain_hash into bh_val from ideas where id = test_id;
  bh_len := coalesce(length(bh_val), 0);

  assert bh_len = 64,
    format('CHECK 1 FAIL: blockchain_hash length is %s (expected 64). Value: [%s]', bh_len, bh_val);

  assert bh_val ~ '^[0-9a-f]{64}$',
    format('CHECK 1 FAIL: blockchain_hash is not lowercase hex. Value: [%s]', bh_val);

  select count(*) into v_count from idea_content_versions where idea_id = test_id;

  assert v_count = 1,
    format('CHECK 1 FAIL: expected 1 version row after insert, got %s', v_count);

  select content_hash into v_hash1
  from idea_content_versions where idea_id = test_id
  order by created_at desc, id desc limit 1;

  assert bh_val = v_hash1,
    format('CHECK 1 FAIL: blockchain_hash %s != version content_hash %s', bh_val, v_hash1);

  raise notice 'CHECK 1 PASS: INSERT → blockchain_hash=%, 1 version row', v_hash1;

  -- ── CHECK 2 (no-op): UPDATE same content → still 1 version row ───────────
  update ideas set title = '__verify_trigger_test__' where id = test_id;

  select count(*) into v_count from idea_content_versions where idea_id = test_id;

  assert v_count = 1,
    format('CHECK 2 FAIL: no-op update created extra version row, count=%s', v_count);

  raise notice 'CHECK 2 PASS: no-op UPDATE → still 1 version row';

  -- ── CHECK 3: UPDATE with changed content → 2nd version row ───────────────
  update ideas set problem = 'changed problem' where id = test_id;

  select count(*) into v_count from idea_content_versions where idea_id = test_id;

  assert v_count = 2,
    format('CHECK 3 FAIL: expected 2 version rows after content change, got %s', v_count);

  select content_hash, previous_hash into v_hash2, v_prev
  from idea_content_versions where idea_id = test_id
  order by created_at desc, id desc limit 1;

  assert v_prev = v_hash1,
    format('CHECK 3 FAIL: previous_hash %s != first content_hash %s', v_prev, v_hash1);

  assert v_hash2 != v_hash1,
    'CHECK 3 FAIL: second content_hash should differ from first';

  select blockchain_hash into bh_val from ideas where id = test_id;
  assert bh_val = v_hash2,
    format('CHECK 3 FAIL: ideas.blockchain_hash %s != new content_hash %s', bh_val, v_hash2);

  raise notice 'CHECK 3 PASS: content change → 2nd version row, previous_hash chains correctly';

  -- ── CHECK 4: repeat same content → still 2 rows (no infinite recursion) ──
  update ideas set problem = 'changed problem' where id = test_id;

  select count(*) into v_count from idea_content_versions where idea_id = test_id;

  assert v_count = 2,
    format('CHECK 4 FAIL: expected exactly 2 version rows (no recursion), got %s', v_count);

  raise notice 'CHECK 4 PASS: no-op after content change → still 2 version rows (no recursion)';

  -- ── CHECK 5: blockchain_hash matches latest version hash ─────────────────
  select blockchain_hash into bh_val from ideas where id = test_id;

  assert bh_val = v_hash2,
    format('CHECK 5 FAIL: blockchain_hash %s != latest version hash %s', bh_val, v_hash2);

  assert length(bh_val) = 64 and bh_val ~ '^[0-9a-f]{64}$',
    format('CHECK 5 FAIL: blockchain_hash is not valid 64-char SHA-256 hex: [%s]', bh_val);

  raise notice 'CHECK 5 PASS: ideas.blockchain_hash=% (valid SHA-256)', bh_val;

  -- ── CLEANUP ──────────────────────────────────────────────────────────────
  delete from idea_content_versions where idea_id = test_id;
  delete from ideas where id = test_id;

  raise notice '────────────────────────────────────────────────────';
  raise notice 'ALL 5 CHECKS PASSED — safe for CEO to test in live app';
  raise notice '  hash1 (insert): %', v_hash1;
  raise notice '  hash2 (update): %', v_hash2;
  raise notice '  previous_hash:  %', v_prev;

end $$;
