// Genera el hash de la contraseña para pegar en js/config.js.
// Uso: node scripts/hash.mjs "la contraseña"
import { createHash } from 'node:crypto';

const pass = process.argv[2];
if (!pass) {
  console.error('Uso: node scripts/hash.mjs "la contraseña"');
  process.exit(1);
}

// Misma normalización que js/login.js: sin espacios en los bordes, minúsculas y sin tildes.
const normal = pass.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
console.log(createHash('sha256').update(normal).digest('hex'));
