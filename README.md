# Caja Aguila Motors · Taller mecánico

Herramienta web para el rol del servidor: los mecánicos del taller **Aguila Motors** cobran los trabajos desde la Caja, el encargado calcula lo que hay que pagar a cada empleado según su rango y lleva el control del almacén a partir de los logs de Discord.

**Web:** https://dc-david8.github.io/AguilaMotors/

La versión que estás usando aparece al final de la página. Si no ves los últimos cambios, pulsa **Ctrl+F5** o ábrela en una ventana de incógnito.

## Qué hace

1. **Módulo de Caja** · Catálogo de 131 productos y servicios por pestañas. Se pulsa un producto para sumarlo al ticket (clic derecho para restar), se ajustan las cantidades y se copia el **total** o el **concepto** para pasarlo por el datáfono (máximo 40 caracteres, ver *Concepto para el datáfono*).
2. **Módulo de Pagos** · Se pega el texto de Discord con las facturas (datáfono TPV y el sistema de facturas antiguo) y las ventas de kits. Calcula el total cobrado por cada empleado, su comisión según el rango y el **Total a Pagar** a toda la plantilla. Se puede exportar a CSV.
3. **Módulo de Almacén** · Se pega el log de inventario de Discord (METER / SACAR) y muestra las existencias, quién mete y quién saca cada artículo (con su Discord) y el historial completo. Avisa cuando un artículo baja del mínimo.

## Catálogo de la Caja

| Pestaña | Contenido |
|---|---|
| Motos, Gama Baja, Gama Media, Gama Alta, Gama VIP, Camiones, Aéreos | 14 piezas de tuning por gama: pintura, neones, luces, ruedas, humo, carrocería, claxon, tintado, turbo, motor, transmisión, blindaje, suspensión y frenos |
| Full Tuning | El Full Tuning de cada gama, de $10.000 a $50.000 |

Los **Camiones** tienen los mismos precios que la Gama Alta, porque su precio de compra es parecido.
| Servicios (Taller) / Servicios (Grúa) | Reparaciones, limpiezas y repostajes, dentro y fuera del taller. Los kits de reparación no están: se venden desde el menú de kits del juego y se cuentan en Pagos → Venta de Kits |
| Tienda | La tienda junto al taller: Kit de Desvuelco ($1.500), Rueda ($500), Mando de Neones RGB ($2.000) y Bayetas ($400). Se compran a precio de taller y se revenden aquí |
| Camaleónica | Pintura camaleónica y cambios de color |
| Nitro | Instalación y botella. Venta restringida: la Caja muestra un aviso |
| Neones RGB | Instalación (el mando está en Tienda) |
| Compraventa | Cambio de papeles por gama |

Desde **Gestión de Productos** (con contraseña) se pueden agregar productos nuevos con su icono, cambiar precios e imágenes y ocultar o restaurar los fijos.

## Concepto para el datáfono

El datáfono solo acepta **40 caracteres** de concepto. Debajo del total del ticket se ve cuántos ocupa, y **Copiar concepto** elige solo:

1. **Completo**, si cabe: `x1 Turbo (Gama Alta)`.
2. **Abreviado**, si el completo no cabe. La gama o el lugar se escribe una vez al final: `Neon+Turbo+FT GA`, `4xRued+Turbo GB, Rep T`.
3. **En varios cobros**, si ni abreviado cabe: se abre una ventana con cada cobro (total y concepto) para pasarlos por el datáfono uno tras otro.

| Abreviatura | Significa |
|---|---|
| MT, GB, GM, GA, VIP, CAM, AE | Motos, Gama Baja, Media, Alta, VIP, Camiones, Aéreos |
| T / G | Taller / Grúa |
| Pint, Neon, Luces, Rued, Humo, Carr, Clax, Tint | Pintura, Neones, Cambio de Luces, Ruedas, Humo de Ruedas, Carrocería, Claxon, Tintado de Lunas |
| Turbo, Motor, Trans, Blind, Susp, Fren, FT | Turbo, Motor, Transmisión, Blindaje, Suspensión, Frenos, Full Tuning |
| Rep, Limp, Gas, Grua | Reparación, Limpieza, Repostaje, Servicio de Grúa |
| Desvuelco, Rueda, Mando RGB, Bayeta | Productos de la Tienda |
| Camaleon, Color cam | Pintura Camaleónica, Cambio de Color Camaleónico |
| Nitro, Bot nitro, Neon RGB, Compra | Instalación de Nitro, Botella de Nitro, Instalación de Neones RGB, Compraventa |
| `2x` delante | Cantidad (si es más de 1) |

Los productos agregados desde Gestión de Productos usan su nombre completo. Las abreviaturas se cambian en `app.js` → `PIECE_SHORT`, `GAMA_SHORT` y `SERVICE_SHORT`.

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

### Etiquetar a cada empleado en Discord

En **Gestión de empleados** cada empleado tiene una casilla **Discord** para su ID de usuario (modo desarrollador de Discord → clic derecho sobre la persona → *Copiar ID de usuario*; también vale pegarlo como `<@ID>`). Al copiar los totales, a quien lo tenga se le etiqueta:

```
* Damián Alberto (Jefe) <@ID>: 5000 <@&ID-del-rol>
```

Los IDs se guardan en el navegador de cada PC, como el resto de datos.

### IBAN para la nómina

Cada empleado tiene también una casilla **IBAN** con la cuenta de su personaje en el banco del servidor (una letra y 6 números, como `J739745`; sale en el banco, en *Informaciones*). Al copiar los totales aparece junto a lo que hay que pagarle; si falta, sale **IBAN pendiente** en negrita:

```
* Esteban Dido (Jefe) <@ID>: 2000 · IBAN J739745
* Gxbo Dead (Mecánico) <@ID>: 4500 · **IBAN pendiente** <@&ID-del-rol>
```

Los IBAN se publican en `datos.js` junto con el rango y el Discord.

### Empleados que no cobran

En **Gestión de empleados**, la casilla **No cobra** marca a quien no recibe nómina. Sigue apareciendo con lo que factura, pero:

- En Pagos y en Totales empleados, su pago sale como **No cobra** y no suma al **Total a Pagar**.
- Al copiar sale `* Nombre (Rango) <@ID>: No cobra`, sin IBAN ni aviso de *IBAN pendiente*.
- Puede seguir siendo el empleado de la semana si es quien más factura.

Se marca y desmarca cuando haga falta (por ejemplo, si alguien deja de cobrar más adelante) y se publica en `datos.js`.

### Kits vendidos a sí mismo

En el log de **Venta de kits**, cuando *Vendedor* y *Comprador* son la misma persona, el kit se cuenta como vendido **a sí mismo**. Se siguen pagando como cualquier kit, pero se señalan:

- **Venta de Kits** (resumen): «A sí mismos: 20 de 35 (57%)».
- **Kits por empleado**: columna **A sí mismo** con cuántos y qué porcentaje de sus kits.
- **Totales empleados**: debajo del nombre, «Kits a sí mismo: 9 de 12».

Sale en naranja cuando es la mitad o más. No aparece en el texto que se copia a Discord.

### Empleado de la semana

En **Totales empleados**, quien más cobra lleva la etiqueta del rol de Discord *Empleado de la semana* (`<@&ID>`) al copiar, tanto en **Copiar seleccionado** como en **Copiar todo**. Al pegarlo en Discord se ve el rol con su color. Si hay empate, la llevan todos los empatados. El texto solo menciona el rol: asignarlo se sigue haciendo en Discord.

El rol se cambia en `app.js` → `EMPLOYEE_OF_WEEK_ROLE_ID` (ID del rol: con el modo desarrollador de Discord, clic derecho sobre el rol → *Copiar ID del rol*).

## Almacén

Artículos con control de existencias y aviso de mínimo:

| Artículo | Avisar en |
|---|---|
| Bayetas | 100 |
| Mandos de Neón | 10 |
| Kits de Desvuelco | 10 |
| Ruedas | 8 |

El mínimo se puede cambiar desde la propia tarjeta del artículo, y con **Conteo real** se corrigen las existencias si no cuadran con el juego. El resto de artículos (tickets del datáfono, megáfono…) aparecen en *Otros artículos*. Solo se cuentan los movimientos del almacén del taller (`mecanico_storage_aguilamotor`). Si el almacén pasa a la tienda y en el log sale con otro nombre, hay que cambiarlo en `app.js` → `ALM_INVENTORY`.

Las existencias salen solo del log del almacén: la Caja no las descuenta al vender, porque el mecánico ya saca el artículo del almacén antes de usarlo.

## Acceso con contraseña

**Módulo de Pagos**, **Módulo de Almacén**, **Gestión de Productos** y **Gestión de empleados** piden la misma contraseña de acceso. En el código **no está escrita**: solo se guarda su huella SHA-256 (`app.js` → `ACCESS_PASSWORD_SHA256`), igual que la del encargado. Quien abra el código ve una cadena de letras y números de la que no se puede sacar la contraseña.

**Cambiarla:** calcula la huella de la nueva (en una terminal: `echo -n "NuevaContraseña" | sha256sum`) y sustitúyela en `ACCESS_PASSWORD_SHA256`.

> Es una web estática: la contraseña evita miradas casuales, pero no es seguridad real.

## Datos compartidos (empleados y productos)

El encargado publica los empleados (con rango, Discord e IBAN) y los productos para que todos vean lo mismo. Los jefes de taller solo los ven: no pueden cambiarlos.

**Cómo funciona**

- Si en el repositorio hay un archivo `datos.js`, la página lo carga sola al abrirse (siempre la última versión). Gestión de empleados queda en solo lectura y Gestión de Productos no se abre.
- Si no hay `datos.js`, cada PC usa sus propios datos como antes.
- El programa de escritorio carga `datos.js` de la web publicada; si no hay internet, usa el de su carpeta.

**Publicar cambios (encargado)**

1. En **Módulo de Pagos → Datos compartidos**, pulsa **Soy el encargado** y escribe la contraseña del encargado. Esa PC queda en modo encargado.
2. Edita empleados, rangos, Discord y productos como siempre (son los datos de tu PC).
3. Pulsa **Exportar datos (datos.js)**.
4. Sube el archivo al repositorio con **Add file → Upload files**, con el nombre exacto `datos.js` (reemplaza al anterior). En uno o dos minutos todos lo ven.

En una PC nueva, después de entrar en modo encargado, **Cargar los publicados en esta PC** copia lo publicado para seguir editando desde ahí.

**Contraseña del encargado:** en el código solo está su huella SHA-256 (`app.js` → `EDITOR_PASSWORD_SHA256`). Para cambiarla, calcula la huella de la nueva (`echo -n "NuevaContraseña" | sha256sum`) y sustitúyela.

> El repositorio es público: los nombres de los empleados, sus IDs de Discord y sus IBAN de `datos.js` los puede ver cualquiera que lo busque.

## Dónde se guardan los datos

Los empleados, los productos agregados o editados y el almacén se guardan **en el navegador de cada PC**, no en este repositorio. Por eso:

- Subir archivos nuevos a GitHub **no borra** los datos.
- En incógnito la página sale vacía (y se borra al cerrar).
- Cada PC y cada navegador tiene sus propios datos. El almacén se puede pasar de uno a otro con **Copiar respaldo** / **Restaurar respaldo**.

## Vista para móvil

En pantallas pequeñas (móvil o app de la pantalla de Inicio) la página cambia sola; en PC se ve igual que siempre:

- Cabecera compacta con un botón **☰** que abre un menú lateral con las secciones (Caja, Pagos, Almacén) y las categorías de productos.
- El botón **Categoría ▾** encima de la lista abre ese mismo menú en las categorías.
- Los productos se ven en **lista**: icono pequeño, nombre y precio en una fila, y un contador (×2) en los que ya están en el ticket.
- Una barra abajo muestra cuántos productos y el total del ticket; al tocarla baja hasta el ticket.
- En el ticket del móvil no sale la columna Precio (el subtotal ya lo incluye) ni el logo grande.

## Como app en el iPhone

En Safari, abre la web → botón **Compartir** → **Añadir a pantalla de inicio**. Queda con el icono de Aguila Motors y, al abrirla, muestra el logo mientras carga y se abre a pantalla completa, sin la barra de Safari. En Android (Chrome) es **Menú → Añadir a pantalla de inicio**.

> La app de la pantalla de Inicio guarda sus datos aparte de Safari: los empleados y el almacén que tengas en Safari no aparecen en ella, y al borrarla del Inicio se borran los suyos.

## Programa de escritorio

La misma página funciona dentro del programa de escritorio (pywebview, `.exe`), en la carpeta `Empleados_Badulaque/Pagina_badu`. Para actualizarlo, copia `index.html`, `app.js` y `styles.css` encima de los anteriores **sin borrar la carpeta**. En el programa, los empleados los guarda el propio `.exe`.

## Estructura

```
├── index.html               Página: pestañas de Caja, Pagos y Almacén, y ventanas
├── app.js                   Catálogo, ticket, lectura de Discord, comisiones y almacén
├── styles.css               Tema negro y naranja
├── aguila_motors_logo.png   Logo del taller
├── favicon.ico              Icono de la pestaña
├── datos.js                 Empleados y productos publicados por el encargado (se genera desde la página)
├── manifest.webmanifest     Nombre e iconos de la app en la pantalla de Inicio
└── icons/                   Icono del iPhone/Android y pantallas de arranque del iPhone
```

No necesita servidor ni dependencias: es HTML, CSS y JavaScript puros.

## Personalizar

- **Precios del tuning**: `app.js` → `TUNING_PRICES` (una fila por gama, en el orden de `TUNING_PIECES`).
- **Servicios, camaleónica, nitro, neones y compraventa**: `app.js` → `SERVICE_PRODUCTS`.
- **Pestañas de la Caja**: `app.js` → `PRODUCT_CATEGORIES`.
- **Artículos del almacén y sus mínimos**: `app.js` → `ALM_TRACKED`.
- **Precio por kit** en Pagos: se cambia en la propia página (por defecto $800).
- **Logo**: reemplaza `aguila_motors_logo.png` manteniendo el nombre. Los iconos y pantallas de arranque de `icons/` se generan a partir de él, así que si cambia el logo hay que generarlos de nuevo.

Al publicar un cambio, sube el número de versión en `index.html`: el pie de página (formato «Versión N - Aguila Motors») y el `?v=` de `styles.css`, `app.js` y el icono. Así los navegadores cargan la versión nueva sin Ctrl+F5.

## Bitácora de cambios

### Versión 19 · 12 de octubre de 2026
- El pie de página solo muestra la versión y el taller: «Versión 19 - Aguila Motors». Lo que cambia en cada versión queda en esta bitácora.

### Versión 18 · 12 de octubre de 2026
- **Contraseña de acceso nueva** (Pagos, Almacén, Gestión de Productos y Gestión de empleados). La anterior deja de funcionar.
- Ya no está escrita en el código: solo se guarda su huella SHA-256, como la del encargado.

### Versión 17 · 12 de octubre de 2026
- **Kits vendidos a sí mismo**: si en el log de Venta de kits el Vendedor y el Comprador son la misma persona, se cuenta aparte. Sale en el resumen de Venta de Kits, en una columna nueva de Kits por empleado y en Totales empleados, en naranja si es la mitad o más. Se siguen pagando igual.

### Versión 16 · 11 de octubre de 2026
- **Vista para móvil**: menú oculto (☰) con secciones y categorías, productos en lista con iconos pequeños y contador de unidades, y barra del ticket abajo con el total.
- En PC la página se ve igual que antes.

### Versión 15 · 11 de octubre de 2026
- Nueva pestaña **Tienda** con los productos de la tienda junto al taller: Kit de Desvuelco, Rueda, Mando de Neones RGB y Bayetas, con los mismos precios.
- Se quitan de Servicios (Taller), Servicios (Grúa) y Neones RGB. «Bayetas o Limpieza (Grúa)» se queda en Grúa porque es un servicio de limpieza en la calle. La Caja queda con 131 productos.

### Versión 14 · 11 de octubre de 2026
- **Concepto para el datáfono** (máximo 40 caracteres): se copia completo si cabe; si no, abreviado (`Neon+Turbo+FT GA`); y si ni así cabe, se reparte en varios cobros con su total y concepto.
- Debajo del total del ticket se ve cuántos caracteres ocupa el concepto.
- Nueva pestaña **Camiones** con los mismos precios que la Gama Alta, y su Full Tuning ($40.000) en la pestaña Full Tuning. La Caja queda con 133 productos.

### Versión 13 · 11 de octubre de 2026
- Se quitan **Kit de Reparación (Taller)** y **Kit de Reparación (Grúa)** de la Caja: nunca se cobran por datáfono, se venden desde el menú de kits del juego («Vender a») y se cuentan en Pagos → Venta de Kits. La Caja queda con 118 productos.

### Versión 12 · 10 de octubre de 2026
- **Gestión de empleados**: nueva casilla **No cobra** para quien no recibe nómina.
- Quien no cobra sale como **No cobra** en Pagos, en Totales empleados y al copiar, sin IBAN ni *IBAN pendiente*, y no suma al Total a Pagar.
- Los cambios de rango, Discord, IBAN o No cobra actualizan Pagos al momento, sin volver a procesar.
- «No cobra» se publica en `datos.js`.

### Versión 11 · 10 de octubre de 2026
- **Gestión de empleados**: nueva casilla **IBAN** (cuenta del personaje en el banco, como J739745), también al añadir un empleado. Avisa si el formato no es válido.
- **Copiar seleccionado** y **Copiar todo** añaden el IBAN de cada empleado, o **IBAN pendiente** en negrita si falta.
- Los IBAN se incluyen en `datos.js` para que los jefes de taller también los vean.

### Versión 10 · 10 de octubre de 2026
- **Datos compartidos**: el encargado exporta `datos.js` con empleados (rango y Discord) y productos y lo sube al repositorio; la página lo carga sola para todos.
- Con datos publicados, los jefes de taller ven los empleados y productos en solo lectura (Gestión de empleados y Gestión de Productos bloqueadas).
- **Modo encargado** con contraseña propia, para editar, exportar y cargar lo publicado en una PC nueva.
- El programa de escritorio carga los datos publicados de la web, o los de su carpeta sin internet.

### Versión 9 · 10 de octubre de 2026
- Se quita el botón **Rellenar Discord desde Almacén**: el log copiado de Discord no siempre trae el enlace con el Discord de cada persona. Los IDs se ponen a mano en Gestión de empleados.

### Versión 8 · 10 de octubre de 2026
- **Gestión de empleados**: nueva casilla **Discord** con el ID de usuario de cada empleado, también al añadir uno nuevo.
- **Copiar seleccionado** y **Copiar todo** etiquetan a cada empleado (`<@ID>`) junto a su nombre.

### Versión 7 · 10 de octubre de 2026
- En **Totales empleados**, el empleado que más cobra lleva la etiqueta del rol de Discord *Empleado de la semana* en lugar del 🏆.
- La etiqueta sale en **Copiar seleccionado** (cuando la persona elegida es la que más cobra) y en **Copiar todo**.

### Versión 6 · 9 de octubre de 2026
- Icono de Aguila Motors al añadir la web a la pantalla de Inicio del iPhone (y Android), con el nombre «Aguila Motors».
- Al abrirla desde el Inicio aparece el logo mientras carga y se abre a pantalla completa.
- Pantallas de arranque para los iPhone desde el SE hasta el 17 Pro Max.

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
