# Preparación de Cloudflare Pages (0 € fijos)

Estado: web estática preparada; este proyecto no incluye un receptor de consultas ni Pages Functions. No se ha creado un proyecto en Cloudflare ni un script en Google. No hay una URL pages.dev asignada. No activar hasta completar los datos del titular y probar la recepción.

## Archivos

- `.deployment/site.json`: lista explícita de páginas y recursos publicables. `legalReady` sigue en `false`.
- `scripts/build.mjs`: genera `dist/`, CSP con hashes y encabezados de seguridad; excluye código interno, pruebas, documentación y secretos.
- En Brújula y Nexo, `functions/api/contact.js`: receptor público mínimo de contacto para Pages Functions. Solo acepta origen propio, JSON limitado, datos validados y Turnstile válido. No conecta a los programas del ordenador.
- En Brújula y Nexo, `deployment/google-apps-script/`: código del receptor privado en su configuración, expuesto como web app pero protegido por firma HMAC y vigencia de cinco minutos. Un script por web; destinatario fijo en propiedades, nunca suministrado por el visitante.
- En Brújula y Nexo, `contacto.js`: formulario de Brújula y Nexo con estado real y alternativa de correo explícita; no abre mailto automáticamente ni muestra un éxito ficticio.
- `tests/`: pruebas sin enviar correos reales ni hacer pagos.
- `wrangler.jsonc`: configuración de Pages sin identificadores de cuenta ni credenciales.

## Construcción y verificación

Requiere Node.js 24. No hay dependencias npm ni una instalación de paquetes necesaria.

```sh
npm test
npm run build
npm run check:release
```

La última comprobación debe fallar mientras los textos legales sean borradores. No falsear el resultado ni inventar datos para superarla. Las compilaciones de preparación usan noindex y robots Disallow: /; esto no restringe el acceso ni protege datos privados.

## Publicación en Pages

1. Verificar la copia actual del ordenador frente a la revisión de esta rama. La sesión que preparó estos cambios no pudo montar los discos Windows.
2. Completar aviso legal y privacidad con datos verificados del titular, domicilio profesional, NIF cuando corresponda, proveedores, base de tratamiento y conservación. No dar por realizada ninguna alta administrativa.
3. En una cuenta Cloudflare Free, crear un proyecto Pages con acceso **solo a este repositorio**. Rama de producción: la rama acordada tras integrar estos cambios; framework: ninguno; comando: `npm run build`; salida: `dist`. Node: 24. No usar la raíz del repositorio como salida.
4. Se asignará un subdominio `pages.dev` según disponibilidad. No contratar dominio, Workers Paid, R2 ni otros complementos. Cloudflare Free limita compilaciones y Functions; no añadir facturación para aumentar cuotas.
5. Mantener desactivado el formulario hasta probar su receptor. A las vistas previas no se les habilitarán secretos de producción. No configurar publicación automática de todas las ramas del repositorio privado.
6. Tras verificar la web en Pages, actualizar las URLs absolutas Open Graph de La Estantería y cualquier referencia al alojamiento antiguo. No cambiar URLs de Amazon ni de PayPal.
7. Desactivar el alojamiento anterior solo después de validar el nuevo. No dejar permanentemente un negocio en GitHub Pages, cuyas condiciones limitan ese uso. Nunca publicar el repositorio privado de Brújula ni sus programas.

## Contacto gratuito, sin claves en el navegador

Esta sección aplica a Brújula y Nexo. La Estantería conserva PayPal externo y entrega manual; no necesita el receptor de consultas para sus pagos.

1. En la cuenta Google del titular, crear un proyecto Apps Script con los dos archivos de `deployment/google-apps-script/`. No usar una prueba de Google Workspace ni activar facturación Google Cloud.
2. Guardar en **Propiedades del script**, fuera del código: `CONTACT_SIGNING_SECRET` (aleatorio, al menos 32 caracteres), `CONTACT_SITE_ID` (nombre exacto de este proyecto) y `CONTACT_EMAIL` (buzón fijo de recepción). No añadir como destinatario el email del visitante: solo es Reply-To.
3. Publicar la web app ejecutándose como el propietario y con acceso anónimo. La autorización de Google es únicamente para enviar correo. El `doPost` rechaza firmas incorrectas, sitios distintos y peticiones antiguas. No convertirla en un proxy abierto ni registrar los cuerpos enviados.
4. Crear un widget Turnstile Free para el **hostname exacto** del sitio. Su clave de sitio es un identificador público del widget, no una credencial de acceso. El secreto de validación solo va en el servidor.
5. En Cloudflare, guardar como **Secrets** `CONTACT_SIGNING_SECRET`, `CONTACT_RECEIVER_URL` (la URL /exec de Google) y `TURNSTILE_SECRET`. Como variables: `SITE_ID`, `TURNSTILE_SITE_KEY`, `LEGAL_READY=true` y `CONTACT_ENABLED=true`. Nunca escribir secretos en wrangler.jsonc, JS público, GitHub, logs o mensajes.
6. Tras completar la información legal, cambiar `.deployment/site.json` a `legalReady: true`. Activar ambas variables requiere una decisión consciente: la ausencia de configuración deja cerrado el receptor.
7. Hacer una consulta real de prueba, comprobar que llega al buzón previsto y que permite responder al visitante. Probar rechazo de origen ajeno, captcha inválido, límite de tamaño, indisponibilidad y texto conservado tras error. Las pruebas automáticas actuales usan sustitutos y no certifican entrega real.

El receptor verifica la cuota de MailApp. Un fallo o un tiempo de espera nunca se comunica como pago ni recepción confirmados. Un tiempo de espera puede ocurrir después de que se acepte un correo: consultar la referencia antes de repetir. La deduplicación en caché reduce reintentos idénticos durante diez minutos, pero no es una garantía de entrega exactamente una vez.

## Cuotas y condiciones contrastadas el 17–18 de noviembre de 2026

- Pages Free: 500 builds/mes, 20.000 archivos y 25 MiB por archivo. Estáticos sin invocar Functions: peticiones gratuitas e ilimitadas sujetas a condiciones del servicio. https://developers.cloudflare.com/pages/platform/limits/
- Functions Free comparte 100.000 peticiones/día con Workers. Configuramos `_routes.json` para que solo `/api/contact` invoque una Function. https://developers.cloudflare.com/pages/functions/pricing/
- Turnstile Free: hasta 20 widgets y desafíos ilimitados; apto para pequeñas empresas y producción. https://developers.cloudflare.com/turnstile/plans/
- MailApp con cuenta personal: 100 destinatarios/día por usuario, compartidos entre scripts, no 100 por proyecto. Otros límites: 6 minutos por ejecución y 30 ejecuciones simultáneas por usuario. Las cuotas pueden cambiar o detener el envío. https://developers.google.com/apps-script/guides/services/quotas
- GitHub Pages restringe el alojamiento de negocios y webs dirigidas a transacciones comerciales. https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- PayPal puede cobrar comisiones por venta; no es un gasto fijo de alojamiento. Verificar las tarifas reales de la cuenta, especialmente para 0,20 € y 0,50 €. https://www.paypal.com/es/business/paypal-business-fees

No se promete disponibilidad sin interrupciones ni entrega de email en bandeja principal. Mantener una alternativa de contacto y copias propias; nunca contratar un plan al agotarse una cuota sin nueva autorización.

## Reversión

La revisión previa figura en el informe central de la tarea y en la PR. Para deshacer una integración, usar un commit de reversión de esa PR; no forzar main ni borrar trabajo posterior. En Pages se puede restaurar una versión anterior. Los bundles de respaldo están en la carpeta de trabajo de la tarea y contienen el historial completo; el bundle del repositorio privado debe permanecer privado.
