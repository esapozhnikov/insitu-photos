#!/bin/bash
set -e

if [ "$ENABLE_DB_MONITORING" = "true" ]; then
  echo "Enabling Database Observability..."
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'db_o11y') THEN
            CREATE ROLE db_o11y LOGIN PASSWORD '${DB_O11Y_PASSWORD:-db_o11y_pass}';
        END IF;
    END
    \$\$;

    GRANT pg_monitor TO db_o11y;
    GRANT pg_read_all_stats TO db_o11y;
    ALTER ROLE db_o11y SET pg_stat_statements.track = 'none';
    
    GRANT pg_read_all_data TO db_o11y;
EOSQL
else
  echo "Database Observability is disabled."
fi
