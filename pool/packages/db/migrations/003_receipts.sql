-- Receipt uniqueness: https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
CREATE UNIQUE INDEX payments_pa_reference_unique ON payments(pa_reference);
