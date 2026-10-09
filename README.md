# Caja Aguila Motors · Taller mecánico

Herramienta web para el rol del servidor: los mecánicos del taller **Aguila Motors** cobran los trabajos desde la Caja, el encargado calcula lo que hay que pagar a cada empleado según su rango y lleva el control del almacén a partir de los logs de Discord.

**Web:** https://dc-david8.github.io/AguilaMotors/

La versión que estás usando aparece al final de la página. Si no ves los últimos cambios, pulsa **Ctrl+F5** o ábrela en una ventana de incógnito.

## Qué hace

1. **Módulo de Caja** · Catálogo de 120 productos y servicios por pestañas. Se pulsa un producto para sumarlo al ticket (clic derecho para restar), se ajustan las cantidades y se copia el **total** o el **concepto** (`x2 Ruedas (Gama Baja) x1 Turbo (Gama Alta)…`) para pegarlo en la factura del juego.
2. **Módulo de Pagos** · Se pega el texto de Discord con las facturas (datáfono TPV y el sistema de facturas antiguo) y las ventas de kits. Calcula el total cobrado por cada empleado, su comisión según el rango y el **Total a Pagar** a toda la plantilla. Se puede exportar a CSV.
3. **Módulo de Almacén** · Se pega el log de inventario de Discord (METER / SACAR) y muestra las existencias, quién mete y quién saca cada artículo (con su Discord) y el historial completo. Avisa cuando un artículo baja del mínimo.

## Catálogo de la Caja

| Pestaña | Contenido |
|---|---|
| Motos, Gama Baja, Gama Media, Gama Alta, Gama VIP, Aéreos | 14 piezas de tuning por gama: pintura, neones, luces, ruedas, humo, carrocería, claxon, tintado, turbo, motor, transmisión, blindaje, suspensión y frenos |
| Full Tuning | El Full Tuning de cada gama, de $10.000 a $50.000 |
| Servicios (Taller) / Servicios (Grúa) | Reparaciones, limpiezas, repostajes, kits y ruedas, dentro y fuera del taller |
| Camaleónica | Pintura camaleónica y cambios de color |
| Nitro | Instalación y botella. Venta restringida: la Caja muestra un aviso |
| Neones RGB | Instalación y mando |
| Compraventa | Cambio de papeles por gama |

Desde **Gestión de Productos** (con contraseña) se pueden agregar productos nuevos con su icono, cambiar precios e imágenes y ocultar o restaurar los fijos.

## Comisiones por rango

| Rango | Comisión |
|---|---|
| Chalán | 40 % |
| Mecánico | 45 % |
| Experimentado | 50 % |
| Subjefe | 50 % |
| Jefe | 50 % |

Se aplican igual a las facturas y a las ventas de kits. El rango de cada empleado se cambia en **Gestión de empleados**. Para que se reconozca a un empleado, su nombre y apellido tienen que ser iguales a los que salen en Discord como *Cobrador* o *Vendedor*.

Los porcentajes se cambian en `app.js` → `RANKS`.

## Almacén

Artículos con control de existencias y aviso de mínimo:

| Artículo | Avisar en |
|---|---|
| Bayetas | 100 |
| Mandos de Neón | 10 |
| Kits de Desvuelco | 10 |
| Ruedas | 8 |

El mínimo se puede cambiar desde la propia tarjeta del artículo, y con **Conteo real** se corrigen las existencias si no cuadran con el juego. El resto de artículos (tickets del datáfono, megáfono…) aparecen en *Otros artículos*. Solo se cuentan los movimientos del almacén del taller (`mecanico_storage_aguilamotor`).

Las existencias salen solo del log del almacén: la Caja no las descuenta al vender, porque el mecánico ya saca el artículo del almacén antes de usarlo.

## Acceso con contraseña

**Módulo de Pagos**, **Módulo de Almacén** y **Gestión de Productos** piden la misma contraseña. Se cambia en `app.js` → `ACCESS_PASSWORDS` y `PRODUCT_ADMIN_PASSWORD`.

> Es una web estática: la contraseña evita miradas casuales, pero no es seguridad real. Quien sepa abrir el código fuente puede leerla.

## Dónde se guardan los datos

Los empleados, los productos agregados o editados y el almacén se guardan **en el navegador de cada PC**, no en este repositorio. Por eso:

- Subir archivos nuevos a GitHub **no borra** los datos.
- En incógnito la página sale vacía (y se borra al cerrar).
- Cada PC y cada navegador tiene sus propios datos. El almacén se puede pasar de uno a otro con **Copiar respaldo** / **Restaurar respaldo**.

## Programa de escritorio

La misma página funciona dentro del programa de escritorio (pywebview, `.exe`), en la carpeta `Empleados_Badulaque/Pagina_badu`. Para actualizarlo, copia `index.html`, `app.js` y `styles.css` encima de los anteriores **sin borrar la carpeta**. En el programa, los empleados los guarda el propio `.exe`.

## Estructura

```
├── index.html               Página: pestañas de Caja, Pagos y Almacén, y ventanas
├── app.js                   Catálogo, ticket, lectura de Discord, comisiones y almacén
├── styles.css               Tema negro y naranja
├── aguila_motors_logo.png   Logo del taller
└── favicon.ico              Icono de la pestaña
```

No necesita servidor ni dependencias: es HTML, CSS y JavaScript puros.

## Personalizar

- **Precios del tuning**: `app.js` → `TUNING_PRICES` (una fila por gama, en el orden de `TUNING_PIECES`).
- **Servicios, camaleónica, nitro, neones y compraventa**: `app.js` → `SERVICE_PRODUCTS`.
- **Pestañas de la Caja**: `app.js` → `PRODUCT_CATEGORIES`.
- **Artículos del almacén y sus mínimos**: `app.js` → `ALM_TRACKED`.
- **Precio por kit** en Pagos: se cambia en la propia página (por defecto $800).
- **Logo**: reemplaza `aguila_motors_logo.png` manteniendo el nombre.

Al publicar un cambio, sube el número de versión en `index.html`: el pie de página y el `?v=` de `styles.css` y `app.js`. Así los navegadores cargan la versión nueva sin Ctrl+F5.

## Bitácora de cambios

### Versión 5 · 8 de octubre de 2026
- Nueva pestaña **Full Tuning** en la Caja con los 6 Full Tunings (Motos, Gama Baja, Media, Alta, VIP y Aéreos).
- Las gamas ya no muestran el Full Tuning, solo sus 14 piezas.
- Los precios o imágenes editados y los productos ocultos se mantienen.

### Versión 4 · 7 de octubre de 2026
- **Módulo de Almacén** protegido con contraseña.
- Nueva contraseña común para Pagos, Almacén y Gestión de Productos. El programa de escritorio sigue guardando los empleados igual que antes.
- Número de versión visible al final de la página.

### Módulo de Almacén · 7 de octubre de 2026
- Nueva pestaña **Módulo de Almacén**, que lee el log de inventario de Discord (METER / SACAR).
- Existencias de Bayetas, Mandos de Neón, Kits de Desvuelco y Ruedas, con aviso de mínimo y conteo real.
- Tabla de quién mete y saca cada artículo, con su Discord y un nombre para reconocerlo.
- Historial con filtros, movimientos manuales, exportación a CSV y respaldo.

### Primera versión · 7 de octubre de 2026
- **Módulo de Caja** con el catálogo de tuning por gamas y los servicios del taller y la grúa, ticket y copia del total y el concepto.
- **Gestión de Productos**: agregar, editar, ocultar y restaurar productos.
- **Módulo de Pagos**: lectura de facturas y venta de kits desde Discord, comisiones por rango, Total a Pagar y gestión de empleados.

---

Proyecto de rol para Jerarquía RP (FiveM). Aguila Motors es un negocio del servidor; no representa a ninguna empresa real.
