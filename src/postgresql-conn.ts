// imports here
import CNShell from "cn-shell";
import * as pg from "pg";

//Interfaces here
interface ReadOptions {
  orderBy: string[];
  orderByDesc: string[];
  groupBy: string[];
  format: "json" | "array";
  distinct: boolean;
}

// CNPostgreSqlConn class here
class CNPostgreSqlConn extends CNShell {
  // Properties here
  private _pool: pg.Pool;
  private _client: pg.PoolClient | null;

  // Constructor here
  constructor(name: string, pool: pg.Pool) {
    super(name);

    this._pool = pool;
    this._client = null;
  }

  // Methods here
  async start(): Promise<boolean> {
    return true;
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async create(
    collection: string,
    fields: { [key: string]: any },
    id?: string,
  ) {
    let fieldsStr = "";
    let valuesStr = "";
    let values = [];

    let position = 1;

    for (const f in fields) {
      if (position > 1) {
        fieldsStr += ",";
        valuesStr += ",";
      }

      fieldsStr += f;
      valuesStr += `$${position}`;
      values.push(fields[f]);

      position++;
    }

    let text = `INSERT INTO ${collection} (${fieldsStr}) VALUES (${valuesStr})`;
    if (id !== undefined) {
      text += ` RETURNING ${id}`;
    }

    let query: pg.QueryConfig = { text, values };

    this.debug("create() query: %j", query);

    let client = this._client === null ? this._pool : this._client;

    let res = await client.query(query).catch((e: Error) => {
      // TODO: Improve error handling
      this.error("'%s' happened for query (%j)", e, query);
      throw new Error("Something wrong with your request");
    });

    return res.rows;
  }

  async read(
    collection: string,
    fields: string[] = ["*"],
    criteria: { [key: string]: any } = {},
    opts: ReadOptions = {
      format: "json",
      distinct: false,
      orderBy: [],
      groupBy: [],
      orderByDesc: [],
    },
  ) {
    let text = "";

    if (opts.distinct) {
      text = `SELECT DISTINCT ${fields.join()} FROM ${collection}`;
    } else {
      text = `SELECT ${fields.join()} FROM ${collection}`;
    }

    let values = [];

    if (Object.keys(criteria).length > 0) {
      text += " WHERE ";

      let position = 1;
      for (const c in criteria) {
        if (position > 1) {
          text += " AND ";
        }

        const val = criteria[c];

        if (Array.isArray(val) && val.length > 0) {
          let inText = "";

          for (let i = 0; i < val.length; i++) {
            if (i > 0) {
              inText += ",";
            }

            inText += `$${position}`;

            values.push(val[i]);
            position++;
          }

          text += `${c} IN (${inText})`;
        } else if (typeof val === "object") {
          text += `${c}${val.op}$${position}`;
          values.push(val.val);
          position++;
        } else {
          text += `${c}=$${position}`;
          values.push(val);
          position++;
        }
      }
    }

    if (opts.groupBy.length > 0) {
      text += ` GROUP BY ${opts.groupBy.join()}`;
    }
    if (opts.orderBy.length > 0) {
      text += ` ORDER BY ${opts.orderBy.join()}`;
      text += " ASC";
    }
    if (opts.orderByDesc.length > 0) {
      if (opts.orderBy.length > 0) {
        text += `, ${opts.orderByDesc.join()} DESC`;
      } else {
        text += ` ORDER BY ${opts.orderByDesc.join()} DESC`;
      }
    }

    let client = this._client === null ? this._pool : this._client;

    if (opts.format === "array") {
      let query: pg.QueryArrayConfig = { values, text, rowMode: "array" };
      this.debug("read() query: (%j)", query);

      let res = await client.query(query).catch(e => {
        // TODO: Improve error handling
        this.error("'%s' happened for query (%j)", e, query);
        throw new Error("Something wrong with your request!");
      });

      let rows = res.fields.map(f => f.name);
      return [rows, ...res.rows];
    }

    let query: pg.QueryConfig = { values, text };
    this.debug("read() query: (%j)", query);

    let res = await client.query(query).catch(e => {
      // TODO: Improve error handling
      this.error("'%s' happened for query (%j)", e, query);
      throw new Error("Something wrong with your request!");
    });

    return res.rows;
  }

  async update(
    collection: string,
    fields: { [key: string]: any },
    criteria: { [key: string]: any } = {},
  ) {
    let fieldStr = "";
    let values = [];

    let position = 1;

    for (const f in fields) {
      if (position > 1) {
        fieldStr += ",";
      }

      fieldStr += `${f}=$${position}`;
      values.push(fields[f]);

      position++;
    }

    let text = `UPDATE ${collection} SET ${fieldStr}`;

    if (Object.keys(criteria).length > 0) {
      let where = "";
      for (const c in criteria) {
        if (where.length !== 0) {
          where += " AND ";
        }

        where += `${c}=$${position}`;
        values.push(criteria[c]);
        position++;
      }

      text += ` WHERE ${where}`;
    }

    let query: pg.QueryConfig = { text, values };
    this.debug("update() query: %j", query);

    let client = this._client === null ? this._pool : this._client;

    let res = await client.query(query).catch(e => {
      // TODO: Improve error handling
      this.error("%s' happened for query (%j)", e, query);
      throw new Error("Something wrong with your request!");
    });

    return res.rowCount;
  }

  async delete(collection: string, criteria: { [key: string]: any } = {}) {
    let text = `DELETE FROM ${collection}`;
    let values = [];

    let position = 1;

    if (Object.keys(criteria).length > 0) {
      let where = "";
      for (const c in criteria) {
        if (where.length !== 0) {
          where += " AND ";
        }

        where += `${c}=$${position}`;
        values.push(criteria[c]);
        position++;
      }

      text += ` WHERE ${where}`;
    }

    let query: pg.QueryConfig = { text, values };
    this.debug("delete() query: %j", query);

    let client = this._client === null ? this._pool : this._client;

    let res = await client.query(query).catch(e => {
      // TODO: Improve error handling
      this.error("'%s' happened for query (%j)", e, query);
      throw new Error("Something wrong with your request!");
    });

    return res.rowCount;
  }

  async query(query: string) {
    this.debug("query() query: %j", query);

    let client = this._client === null ? this._pool : this._client;

    let res = await client.query(query).catch(e => {
      // TODO: Improve error handling
      this.error("'%s' happened for query (%j)", e, query);
      throw new Error("Something wrong with your request!");
    });

    return res.rows;
  }

  async exec(query: string) {
    this.debug("query() query: %j", query);

    let client = this._client === null ? this._pool : this._client;

    let res = await client.query(query).catch(e => {
      // TODO: Improve error handling
      this.error("'%s' happened for query (%j)", e, query);
      throw new Error("Something wrong with your request!");
    });

    return res.rowCount;
  }

  async connect() {
    if (this._client !== null) {
      throw new Error("Already have a connection!");
    }

    this.debug("Getting connection");
    this._client = await this._pool.connect();
  }

  async release() {
    if (this._client === null) {
      throw new Error("Do not have a connection!");
    }

    this.debug("Releasing connection");
    await this._client.release();
    this._client = null;
  }

  async begin() {
    if (this._client === null) {
      throw new Error("Do not have a connection!");
    }

    this.debug("Beginning transaction ...");
    await this._client.query("BEGIN;");
  }

  async commit() {
    if (this._client === null) {
      throw new Error("Do not have a connection!");
    }

    this.debug("Commiting transaction ...!");
    await this._client.query("COMMIT;");
  }

  async rollback() {
    if (this._client === null) {
      throw new Error("Do not have a connection!");
    }

    this.debug("Rolling back transaction ...");
    await this._client.query("ROLLBACK;");
  }
}

export { CNPostgreSqlConn };
