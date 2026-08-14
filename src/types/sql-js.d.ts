declare module 'sql.js' {
  interface Database {
    run(sql: string, params?: any[]): void;
    prepare(sql: string): Statement;
    getRowsModified(): number;
    export(): Uint8Array;
    close(): void;
  }

  interface Statement {
    bind(params?: any[]): void;
    step(): boolean;
    getAsObject(): Record<string, any>;
    free(): void;
  }

  interface SqlJsStatic {
    Database: {
      new (): Database;
      new (blob: Uint8Array): Database;
    };
  }

  interface InitSqlJsOptions {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(options?: InitSqlJsOptions): Promise<SqlJsStatic>;
}
