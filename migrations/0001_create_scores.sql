-- One row per finished year. Both outcomes are recorded: a run that ran out of
-- time still has a standing, and being told it is the point of the board.
CREATE TABLE IF NOT EXISTS scores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  -- 'kind' | 'fair' | 'exacting'. One board per setting: the targets differ by
  -- a third and the workshop runs slower, so the times are not comparable.
  difficulty  TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  -- Ranking key, higher is better. Derived on the server from the three
  -- columns below, never taken from the client. See src/game/score.ts.
  score       INTEGER NOT NULL,
  won         INTEGER NOT NULL,
  -- Half-days elapsed when the run finished, 0..728.
  tick        INTEGER NOT NULL,
  -- Presents made, stored and airborne. Real, because it can exceed 2^53.
  delivered   REAL    NOT NULL,
  recorded_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- The board query and the rank query are both (difficulty, score desc, id asc).
CREATE INDEX IF NOT EXISTS scores_board ON scores (difficulty, score DESC, id ASC);
