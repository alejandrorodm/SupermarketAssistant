# 🧾 TicketSaver

Asistente de compra que escanea tickets de supermercado con IA, controla tu
presupuesto y te ayuda a ahorrar. Construido con React + TypeScript + Vite,
Supabase y la API de Google Gemini. Funciona como PWA y como app Android (Capacitor).

## ✨ Funcionalidades

- **Escaneo con IA** — fotografía un ticket y Gemini extrae supermercado, fecha,
  total y el desglose de productos (con categorías y nombres limpios).
- **Revisión y edición** — corrige los datos extraídos antes de guardar, y edita
  o elimina cualquier ticket guardado más tarde.
- **Panel de control** — gasto del mes, ticket medio, nº de tickets y desglose
  por categorías.
- **Presupuesto mensual** — define un límite y recibe avisos visuales al
  acercarte o superarlo.
- **Estadísticas** — evolución del gasto de los últimos 6 meses, gasto por
  supermercado y por categoría, e historial completo agrupado por mes.
- **Comparador de precios** — busca un producto y descubre dónde te salió más barato.
- **Lista de la compra inteligente** — la IA analiza tus hábitos y sugiere qué
  comprar, estimando el gasto y teniendo en cuenta lo que ya tienes en la despensa.
- **Inventario / despensa** — se llena solo con cada compra (los productos del
  ticket entran como stock) y se vacía a mano según vas gastando. Personal o
  compartido con el hogar.
- **Exportar a CSV** — descarga todos tus tickets y productos.
- **Modo claro / oscuro** y diseño responsive, listo para móvil.

## 🚀 Puesta en marcha

Requisitos: **Node 22+**.

```bash
npm install
npm run dev          # servidor de desarrollo en http://localhost:5173
```

### Variables de entorno

Crea un archivo `.env.local` en la raíz:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GEMINI_API_KEY=...
```

### Scripts

| Script            | Descripción                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Servidor de desarrollo (Vite + HMR)  |
| `npm run build`   | Build de producción en `dist/`       |
| `npm run preview` | Sirve el build de producción         |
| `npm run lint`    | Linter (ESLint)                      |

## 🗄️ Esquema de base de datos (Supabase)

- **tickets** — `id`, `user_id`, `supermercado`, `fecha`, `total`, `ticket_image_url`,
  `household_id`, `paid_by`, `split_mode`
- **ticket_items** — `id`, `ticket_id`, `producto_nombre`, `cantidad`, `precio_unitario`, `categoria`

> Recomendado: configurar `ON DELETE CASCADE` en `ticket_items.ticket_id` y
> políticas RLS por `user_id`. El presupuesto mensual se guarda en el dispositivo
> (localStorage), no requiere cambios de esquema.

### Cuentas conjuntas / hogares (estilo Splitwise)

Permite compartir gastos en pareja o grupo: invitar por email, marcar quién pagó
cada ticket (entero o a medias) y cuadrar cuentas con balances «quién debe a quién».

Tablas: **profiles**, **households**, **household_members**, **household_invites**,
**household_settlements** (Bizums), más las columnas `household_id` / `paid_by` /
`split_mode` en `tickets`.

> **Migración:** ejecuta `supabase/migrations/0001_households.sql` en el SQL Editor
> de Supabase (es idempotente y no toca tus datos). Crea las tablas, la función
> `is_household_member`, los RPCs y las políticas RLS necesarias.

### Inventario / despensa

Tabla **inventory_items** (`id`, `user_id`, `household_id`, `producto_nombre`,
`categoria`, `cantidad`). Se rellena automáticamente al guardar un ticket y se
edita desde la app. La lista de la compra IA la consulta para no sugerir lo que
ya tienes.

> **Migración:** ejecuta `supabase/migrations/0002_inventory.sql` en el SQL Editor
> de Supabase (idempotente; depende de la 0001). Crea la tabla y sus políticas RLS
> (despensa personal por `user_id` y compartida por hogar).

## 📱 Android (Capacitor)

```bash
npm run build
npx cap sync android
npx cap open android
```

## 🛠️ Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Supabase · Google Gemini ·
Recharts · Lucide · Capacitor · vite-plugin-pwa
