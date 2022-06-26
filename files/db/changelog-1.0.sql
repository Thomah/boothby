--liquibase formatted sql

--changeset boothby:create-sequence-id_number
CREATE SEQUENCE IF NOT EXISTS id_number
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--rollback drop sequence id_number;

--changeset boothby:create-table-users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    created_by CHARACTER VARYING(255) DEFAULT 'System'::CHARACTER VARYING,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_by CHARACTER VARYING(255) DEFAULT 'System'::CHARACTER VARYING,
    password CHARACTER VARYING(255) NOT NULL,
    username CHARACTER VARYING(255)
);
--rollback drop table users;
