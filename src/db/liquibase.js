const Liquibase = require('node-liquibase').Liquibase;
const POSTGRESQL_DEFAULT_CONFIG = require('node-liquibase').POSTGRESQL_DEFAULT_CONFIG;
const POSTGRESQL_HOST = process.env.PGHOST ? process.env.PGHOST : 'localhost';
const POSTGRESQL_PORT = process.env.PGPORT ? process.env.PGPORT : 5432;
const POSTGRESQL_DBNAME = process.env.PGDATABASE ? process.env.PGDATABASE : 'boothby';
const POSTGRESQL_USER = process.env.PGUSER ? process.env.PGUSER : 'boothby';
const POSTGRESQL_PASSWORD = process.env.PGPASSWORD ? process.env.PGPASSWORD : 'boothby';

const myConfig = {
  ...POSTGRESQL_DEFAULT_CONFIG,
  changeLogFile: './files/db/master.xml',
  url: `jdbc:postgresql://${POSTGRESQL_HOST}:${POSTGRESQL_PORT}/${POSTGRESQL_DBNAME}?useUnicode=true&characterEncoding=UTF-8`,
  username: POSTGRESQL_USER,
  password: POSTGRESQL_PASSWORD,
}
const instTs = new Liquibase(myConfig);
instTs.update();
