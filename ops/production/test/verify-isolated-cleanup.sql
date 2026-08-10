SELECT SCHEMA_NAME
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME LIKE 'wbd_test_%';

SELECT User, Host
FROM mysql.user
WHERE User LIKE 'wbdt%';

