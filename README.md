# Dudu Shop · Catálogo de ropa

Catálogo online rápido y pensado para el móvil, para compartir por Instagram y WhatsApp. Sin carrito ni pagos: cada prenda tiene un botón **«Consultar por WhatsApp»** que abre el chat con un mensaje ya escrito.

- **Catálogo público** (`/`): fotos grandes, buscador, filtros por categoría, etiquetas *Nuevo*, *Reservado* y *Agotado*, y precio o «Precio a consultar».
- **Ficha de producto** (`/p/…`): galería, elección de talla (se añade al mensaje de WhatsApp) y botón para compartir. Cada prenda tiene su propio enlace con vista previa (foto y nombre) en WhatsApp e Instagram.
- **Panel de administración** (`/admin`): pensado para el móvil. Fotos desde la cámara o la galería; editar, duplicar, ocultar, eliminar y ordenar prendas; unidades y estado con un toque; ajustes de la tienda. Todo se guarda solo.

Tecnología: Next.js 16 · TypeScript · Tailwind CSS 4 · Postgres (Neon) · Vercel. Sin servicios externos de login ni de almacenamiento: solo hace falta una base de datos Postgres.

---

## Variables de entorno

| Variable              | Qué es                                                                    |
| --------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`        | Cadena de conexión de Postgres (Neon → *Connection string*). **Secreta.** |
| `ADMIN_PASSWORD_HASH` | Contraseña del panel, cifrada. Se genera con `npm run hash-password`.     |
| `SESSION_SECRET`      | Texto aleatorio largo (≥ 32 caracteres) para firmar la sesión. **Secreta.** |

Ninguna lleva el prefijo `NEXT_PUBLIC_`: ninguna llega nunca al navegador.

## Puesta en marcha

1. **Base de datos.** Crea una base de datos Postgres (por ejemplo en [neon.tech](https://neon.tech), plan gratuito) y copia su *connection string*.
2. **Tablas.** Desde tu ordenador:
   ```bash
   npm install
   DATABASE_URL="postgresql://…" npm run db:migrate
   ```
   (O pega el contenido de [`db/schema.sql`](db/schema.sql) en el *SQL Editor* de Neon.)
3. **Contraseña del panel.**
   ```bash
   npm run hash-password -- "una-contraseña-larga"
   ```
   Copia el resultado (`scrypt:…`) en `ADMIN_PASSWORD_HASH`.
4. **Secreto de sesión.** `openssl rand -base64 48` → `SESSION_SECRET`.
5. **Vercel.** Importa el repositorio de GitHub en [vercel.com](https://vercel.com) → *Add New → Project*, añade las tres variables en *Environment Variables* y pulsa *Deploy*. Cada `git push` a la rama de producción vuelve a publicar.

Después entra en `https://tu-dominio/admin`, inicia sesión y ve a **Ajustes** (icono de controles) para poner tu WhatsApp, tu Instagram y la frase de bienvenida. Desde ahí puedes copiar el enlace del catálogo para la bio de Instagram.

**Cambiar la contraseña:** genera un nuevo hash con `npm run hash-password`, sustituye `ADMIN_PASSWORD_HASH` en Vercel y vuelve a desplegar (*Deployments → Redeploy*). Para cerrar todas las sesiones abiertas, cambia también `SESSION_SECRET`.

## Uso diario

- **Añadir prenda**: botón **Añadir** → *Cámara* o *Galería* → nombre, categoría, tallas… → **Publicar prenda**. Las fotos se reducen en el propio móvil antes de subirse (unos 100-300 KB), así que suben rápido.
- **Unidades**: botones − / + en la lista. Al llegar a 0 la prenda pasa a *Agotado*; si repones, vuelve a *Disponible*.
- **Estado**: Disponible · Reservado · Agotado.
- **Ocultar**: botón *Visible / Oculto*. Las prendas ocultas no aparecen en el catálogo.
- **Ordenar**: flechas ↑ ↓. Las prendas nuevas aparecen arriba.
- **Duplicar**: crea una copia oculta (con sus propias fotos) para hacer variantes rápido.
- **Precios**: cada prenda tiene «Mostrar precio». En **Ajustes → Mostrar precios** puedes ocultarlos todos a la vez.
- **Guardado automático**: al editar una prenda o los ajustes, los cambios se guardan solos («Guardado ✓») y el catálogo público se actualiza al momento.

## Seguridad

- **La base de datos solo se usa desde el servidor.** El navegador nunca recibe la cadena de conexión ni puede consultar la base de datos: el catálogo público solo obtiene productos **publicados** (y sin el precio cuando está oculto).
- **Login seguro**: la contraseña se guarda cifrada con *scrypt*; la sesión es una cookie `httpOnly`, `secure` y firmada (HMAC-SHA256) que caduca a los 30 días. Tras 5 intentos fallidos desde la misma IP, el acceso se bloquea 15 minutos.
- **Triple comprobación en `/admin`**: el proxy de Next.js redirige al login, cada página del panel comprueba la sesión y cada acción del servidor (crear, editar, borrar, reordenar, subir fotos, ajustes) la vuelve a comprobar antes de tocar la base de datos. Todos los datos se validan en el servidor.
- **Fotos**: solo el administrador puede subirlas (máx. 2 MB, solo imágenes). Se guardan en la base de datos y se sirven en `/img/<id>` con caché de un año en el CDN de Vercel; al quitar una foto o borrar una prenda, la foto se elimina.

## Capacidad

El plan gratuito de Neon incluye 0,5 GB. Con fotos de ~200 KB caben unas 2.000 fotos (cientos de prendas). Si algún día se queda corto, basta con ampliar el plan de la base de datos.

## Desarrollo en local

```bash
npm install
cp .env.example .env.local   # rellena las variables
npm run dev                  # http://localhost:3000
```

Comandos: `npm run build`, `npm run typecheck`, `npm run db:migrate`, `npm run hash-password -- "…"`.

## Estructura

```
app/
  page.tsx                 Catálogo público
  p/[id]/page.tsx          Ficha de producto
  img/[id]/route.ts        Sirve las fotos (con caché)
  api/images/route.ts      Subida de fotos (solo administrador)
  admin/login/             Inicio de sesión
  admin/(panel)/           Panel: lista, nueva prenda, editar, ajustes
  admin/actions.ts         Acciones del servidor (validación + permisos)
components/                Catálogo, galería, iconos…
lib/                       Base de datos, sesión, tipos, utilidades, subida de fotos
proxy.ts                   Protege /admin
db/schema.sql              Esquema de la base de datos
scripts/                   Migración y generador del hash de la contraseña
```
