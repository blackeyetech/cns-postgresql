// imports here
import CNShell from "cn-shell";
import { CNPostgreSqlConn, CNPostgreSqlReadOptions } from "./postgresql-conn";
import * as pg from "pg";

// Postgres config consts here
const CFG_PG_USER = "PG_USER";
const CFG_PG_DB = "PG_DB";
const CFG_PG_PASSWORD = "PG_PASSWORD";
const CFG_PG_HOST = "PG_HOST";
const CFG_PG_PORT = "PG_PORT";
const CFG_PG_SSL = "PG_SSL";

const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = "5432";
const DEFAULT_SSL = "N";

// Class CNPostgreSQL here
class CNPostgreSql extends CNShell {
  // Properties here
  private _pool: pg.Pool;

  // Constructor here
  constructor(name: string) {
    super(name);

    let user = this.getRequiredCfg(CFG_PG_USER);
    let database = this.getRequiredCfg(CFG_PG_DB);
    let password = this.getRequiredCfg(CFG_PG_PASSWORD);
    let host = this.getCfg(CFG_PG_HOST, DEFAULT_HOST);
    let port = parseInt(this.getCfg(CFG_PG_PORT, DEFAULT_PORT), 10);
    let ssl = this.getCfg(CFG_PG_SSL, DEFAULT_SSL).toUpperCase();

    this._pool = new pg.Pool({
      user,
      database,
      password,
      host,
      port,
      ssl: {
        rejectUnauthorized: ssl === "N" ? false : true,
      },
    });

    this._pool.on("error", e => {
      this.error(e);
    });
  }

  // Methods here
  async start(): Promise<boolean> {
    this.info("Starting ...");

    return new Promise((resolve, reject) => {
      this.isServerReady(resolve, reject);
    });
  }

  private isServerReady(
    resolve: (ready: boolean) => void,
    reject: (ready: boolean) => void,
  ): void {
    // Lets check if we can query the time
    const sql = "SELECT now();";

    this._pool
      .query(sql)
      .then(() => {
        this.info("PostgreSQL DB ready");
        this.info("Started!");
        resolve(true);
      })
      .catch(e => {
        // If we get an "ECONNREFUSED" that means the DB has not started
        if (e.code === "ECONNREFUSED") {
          setTimeout(() => {
            this.isServerReady(resolve, reject);
          }, 5000);
        } else {
          this.error("DB returned the following error: (%s)", e);
          reject(false);
        }
      });
  }

  async stop(): Promise<void> {
    this.info("Stopping ...");
    this.info("Closing the pool ...");

    await this._pool.end().catch(e => {
      this.error(e.message);
      return;
    });

    this.info("Pool closed!");
    this.info("Stopped!");
  }

  async healthCheck(): Promise<boolean> {
    // Lets check if we can query the time
    const sql = "SELECT now();";

    let e: Error | undefined;

    await this._pool.query(sql).catch(err => {
      e = err;
      this.error(err);
    });

    if (e === undefined) {
      return true;
    } else {
      return false;
    }
  }

  connection(name: string): CNPostgreSqlConn {
    return new CNPostgreSqlConn(name, this._pool);
  }
}

export { CNPostgreSql, CNPostgreSqlConn, CNPostgreSqlReadOptions };
