// import { CNPostgreSqlConn } from "./postgresql-conn";
// import * as pg from "pg";
import { CNPostgreSql } from "./main";

async function run() {
  let pgsql = new CNPostgreSql("PG-SQL", {});
  let conn = pgsql.connection("conn");
  let res = await conn.read("switch", ["name"]);

  console.log("%j", res);
}

run();
// let pool = new pg.Pool();

// let conn = new CNPostgreSqlConn("PGSQL", pool);

// conn.read(
//   "table",
//   ["f1", "f2", "f3"],
//   {
//     field1: "value1",
//     field2: "value2",
//     field3: { val: 10, op: "<" },
//   },
//   {
//     format: "json",
//     distinct: false,
//     orderBy: [],
//     groupBy: ["field3"],
//     orderByDesc: ["field2", "field1"],
//   },
// );
