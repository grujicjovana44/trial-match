import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import * as sqliteVec from "sqlite-vec";

const database = new DatabaseSync(":memory:", { allowExtension: true });

try {
  sqliteVec.load(database);
  database.exec(
    "CREATE VIRTUAL TABLE smoke_vectors USING vec0(id TEXT PRIMARY KEY, embedding FLOAT[3])",
  );

  const insert = database.prepare(
    "INSERT INTO smoke_vectors (id, embedding) VALUES (?, ?)",
  );
  const vectors = new Map([
    ["b", [1, 0, 0]],
    ["far", [0, 1, 0]],
    ["a", [1, 0, 0]],
  ]);
  for (const [id, values] of vectors) {
    insert.run(id, new Uint8Array(Float32Array.from(values).buffer));
  }

  const query = database.prepare(
    "SELECT id, distance FROM smoke_vectors WHERE embedding MATCH ? AND k = ? ORDER BY distance",
  );
  const results = query
    .all(new Uint8Array(Float32Array.from([1, 0, 0]).buffer), 3)
    .sort(
      (left, right) =>
        left.distance - right.distance || left.id.localeCompare(right.id, "en"),
    );
  assert.deepEqual(
    results.map((result) => result.id),
    ["a", "b", "far"],
  );

  const { version } = database.prepare("SELECT vec_version() AS version").get();
  console.log(
    `sqlite-vec ${version}: extension load and exact KNN smoke passed`,
  );
} finally {
  database.close();
}
