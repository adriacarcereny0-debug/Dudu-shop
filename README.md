# Dudu Shop · Catálogo de ropa

Catálogo online rápido y pensado para el móvil, para compartir por Instagram y WhatsApp. Sin carrito ni pagos: cada prenda tiene un botón **«Consultar por WhatsApp»** que abre el chat con un mensaje ya escrito.

- **Catálogo público** (`/`): fotos grandes, buscador, filtros por categoría, etiquetas *Nuevo*, *Reservado* y *Agotado*, y precio o «Precio a consultar».
- **Ficha de producto** (`/p/…`): galería, elección de talla (se añade al mensaje de WhatsApp) y botón para compartir. Cada prenda tiene su propio enlace con vista previa (foto y nombre) en WhatsApp e Instagram.
- **Panel de administración** (`/admin`): pensado para usarlo desde el móvil. Puedes hacer fotos con la cámara o elegirlas de la galería, editar, duplicar, ocultar, eliminar y ordenar prendas, cambiar unidades y estado con un toque, y configurar la tienda. Todo se guarda solo.

Tecnología: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (base de datos, login y fotos) · Vercel.

---

## 1. Crear el proyecto en Supabase

1. Entra en [supabase.com](https://supabase.com), crea una cuenta y pulsa **New project**. Elige una región cercana (por ejemplo, *West EU*).
2. Cuando esté listo, ve a **SQL Editor → New query**, pega el contenido de [`supabase/migrations/20261023000000_init.sql`](supabase/migrations/20261023000000_init.sql) y pulsa **Run**.
   Esto crea las tablas, las políticas de seguridad (RLS) y el almacén de fotos `product-images`.
3. Ve a **Authentication → Sign In / Providers** y **desactiva «Allow new users to sign up»**. Así nadie puede registrarse por su cuenta.

## 2. Crear el administrador

1. **Authentication → Users → Add user → Create new user**. Escribe tu email y una contraseña segura y marca **Auto Confirm User**.
2. Dale permisos de administrador. En **SQL Editor** ejecuta (cambiando el email):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'tu@email.com';
   ```

Solo los usuarios de la tabla `admins` pueden modificar datos; estar registrado no es suficiente. Para quitarle el acceso a alguien: `delete from public.admins where user_id = '…';`.

## 3. Variables de entorno

En Supabase ve a **Project Settings → API** (o **API Keys**) y copia:

| Variable                        | Dónde está                                         |
| ------------------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project URL (`https://xxxx.supabase.co`)           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave **anon** / **publishable** (`sb_publishable_…` o `eyJ…`) |

> ⚠️ Nunca uses la clave **service_role** / **secret**. La app no la necesita.
> La clave pública puede estar en el navegador: lo que protege los datos son las políticas RLS.

Para trabajar en tu ordenador, copia `.env.example` a `.env.local` y rellénalo.

## 4. Publicar en Vercel

1. Sube este repositorio a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repositorio.
3. En **Environment Variables** añade las dos variables del paso 3.
4. Pulsa **Deploy**. En un par de minutos tendrás una dirección como `https://dudu-shop.vercel.app`.
5. (Opcional) En **Settings → Domains** puedes conectar un dominio propio.

Después entra en `https://tu-dominio/admin`, inicia sesión y ve a **Ajustes** (icono de controles) para poner tu número de WhatsApp, tu Instagram y la frase de bienvenida. Desde ahí puedes copiar el enlace del catálogo para la bio de Instagram.

## Uso diario

- **Añadir prenda**: botón **Añadir** → *Cámara* o *Galería* → nombre, categoría, tallas… → **Publicar prenda**. Las fotos se reducen en el propio móvil antes de subirse (unos cientos de KB), así que suben rápido.
- **Unidades**: botones − / + en la lista. Al llegar a 0 la prenda pasa a *Agotado*; si repones, vuelve a *Disponible*.
- **Estado**: Disponible · Reservado · Agotado.
- **Ocultar**: botón *Visible / Oculto*. Las prendas ocultas no aparecen en el catálogo.
- **Ordenar**: flechas ↑ ↓. Las prendas nuevas aparecen arriba.
- **Duplicar**: crea una copia oculta (con sus propias fotos) para crear variantes rápido.
- **Precios**: cada prenda tiene «Mostrar precio». En **Ajustes → Mostrar precios** puedes ocultarlos todos a la vez.
- **Guardado automático**: al editar una prenda o los ajustes, los cambios se guardan solos (verás «Guardado ✓»). El catálogo público se actualiza al momento.

## Seguridad

- **RLS activado en todas las tablas.** El público (y cualquier usuario que no sea administrador) solo puede **leer** la configuración y los productos **publicados**. Crear, editar, borrar y reordenar exige ser administrador (`public.is_admin()`), y lo comprueba la propia base de datos.
- **Fotos**: el almacén es de lectura pública por URL (necesario para mostrarlas), pero solo el administrador puede subir, cambiar, borrar o listar archivos. Límite de 5 MB y solo formatos de imagen.
- El panel `/admin` está protegido en tres capas: el proxy de Next.js redirige al login, cada página verifica la sesión y el rol, y cada acción del servidor lo vuelve a comprobar antes de tocar la base de datos.
- Ninguna clave privada se usa en el proyecto.
- Nota: cuando un precio está oculto, el catálogo no lo envía al navegador. Aun así, el precio sigue guardado en la fila del producto publicado, así que alguien con conocimientos técnicos podría leerlo con la clave pública. Para un catálogo esto suele ser aceptable; si un precio debe ser secreto, déjalo vacío.

## Desarrollo en local

```bash
npm install
cp .env.example .env.local   # rellena las variables
npm run dev                  # http://localhost:3000
```

Con Docker también puedes levantar Supabase en local (aplica la migración automáticamente):

```bash
npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,mailpit,postgres-meta
```

Usa la `API_URL` y la `PUBLISHABLE_KEY` que muestra como variables de entorno, y crea el administrador como en el paso 2 (Studio no se arranca con ese comando; usa `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres` para el SQL y la API de administración de Auth, o quita `studio` de la lista).

Comandos útiles: `npm run build` (compila para producción) y `npm run typecheck`.

## Estructura

```
app/
  page.tsx                 Catálogo público
  p/[id]/page.tsx          Ficha de producto
  admin/login/             Inicio de sesión
  admin/(panel)/           Panel: lista, nueva prenda, editar, ajustes
  admin/actions.ts         Acciones del servidor (validación + permisos)
components/                Catálogo, galería, iconos…
lib/                       Clientes de Supabase, tipos, utilidades, subida de fotos
proxy.ts                   Protege /admin y refresca la sesión
supabase/migrations/       Esquema SQL, políticas RLS y almacén de fotos
```
