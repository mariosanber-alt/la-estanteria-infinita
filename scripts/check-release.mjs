import {readFile} from 'node:fs/promises';
const config = JSON.parse(await readFile('.deployment/site.json', 'utf8'));
const problems = [];
if (!config.legalReady) problems.push('Faltan la identidad legal verificada, el domicilio y la política definitiva de datos.');
for (const file of ['aviso-legal.html', 'privacidad.html']) {
  const content = await readFile(file, 'utf8');
  if (/\[(?:NIF|fecha|domicilio|titular)|[Bb]orrador|[Dd]ocumento en preparación/.test(content)) problems.push(file + ' contiene un borrador.');
}
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
else console.log('Documentos preparados. Validar también permisos, secretos y prueba real del receptor antes del lanzamiento.');
