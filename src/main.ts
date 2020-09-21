// imports here
import CNShell from "cn-shell";
import { CNPostgreSqlConn } from "./postgresql-conn";
import * as pg from "pg";

// Class CNPostgreSQL here
class CNPostgreSql extends CNShell {
  // Properties here
  private _pool: pg.Pool;

  // Constructor here
  constructor(name: string, poolCfg: pg.PoolConfig) {
    super(name);

    this._pool = new pg.Pool(poolCfg);

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

export { CNPostgreSql, CNPostgreSqlConn };
