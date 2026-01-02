// test-firebird.js
const Firebird = require('node-firebird');

const options = {
  host: '192.168.3.104',
  port: 3050,
  database: 'C:/Datos_TNS/PRUEBA.GDB',
  user: 'SYSDBA',
  password: 'masterkey',
  pageSize: 4096,
  lowercase_keys: false,
  role: null
};

Firebird.attach(options, function (err, db) {
  if (err) {
    console.error('❌ ERROR CONECTANDO:', err);
    return;
  }

  console.log('✅ CONECTADO A FIREBIRD');

  db.query(
    'SELECT FIRST 5 MATID, CODIGO, DESCRIP FROM MATERIAL',
    function (err, result) {
      if (err) {
        console.error('❌ ERROR QUERY:', err);
      } else {
        console.table(result);
      }

      db.detach();
    }
  );
});

