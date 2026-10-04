# Administrar las fotografías

Abre `admin.html` o el enlace **Administrar fotografías** al pie de la página.

## Acceso

Crea una clave personal de acceso detallado (fine-grained personal access token) en GitHub, para el propietario `RiodeGloria`, únicamente el repositorio `rio-de-gloria`, con `Contents: Read and write`. El formulario incluye una guía y el enlace oficial para crearla. La autorización efectiva de escritura la aplica GitHub en cada operación; la página de acceso es pública.

La clave solo se conserva en memoria de la pestaña. No se incluye en los archivos, no se guarda en localStorage ni sessionStorage, y no se envía a servicios distintos de la API de GitHub. Al recargar o cerrar la sesión debes volver a ingresarla. No la compartas en chats. Puedes revocarla desde GitHub.

## Fotos

- **Subir fotografías:** selecciona hasta 20 JPG, PNG o WebP por carga, de hasta 20 MB y 50 megapíxeles cada una. El navegador prepara versiones WebP de hasta 1600 y 480 píxeles. Las fotos nuevas se agregan al final. Usa Chrome actualizado.
- **Orden:** arrastra en computadora o escribe la posición en **Mover a**. Los números representan la galería completa, incluso con filtros activos. También hay flechas.
- **Descripción y categoría:** se editan en cada tarjeta.
- **Quitar:** retira la foto del álbum, conservando el archivo y el historial. Si se usa en otra sección (historia, antes/ahora o pastores), el mensaje lo indica y esa sección se conserva. Este panel administra la galería, no esas imágenes destacadas.
- **Deshacer:** revierte los últimos 50 cambios de la sesión antes de publicar.
- **Vista previa:** muestra todas las fotos en su orden final; toca una para ampliarla.
- **Guardar y publicar:** pide confirmar el resumen y guarda imágenes, orden y textos en un único commit. La publicación de Pages tarda unos minutos. El panel proporciona el enlace para consultar su estado.

Las ediciones viven en esta pestaña hasta publicarlas. No cierres ni recargues con cambios pendientes. Un fallo de conexión no elimina el borrador mientras mantengas la pestaña.

## Conservación de cambios

El panel carga `index.html` de un commit específico. Antes de publicar, verifica que `main` no haya cambiado y avanza la rama sin forzarla. Ante modificaciones simultáneas, detiene la publicación para evitar sobrescribirlas. Los archivos nuevos pueden quedar como objetos sin referencia si una operación falla; no aparecen en la página hasta completar el commit.

El orden público sigue estando en el HTML. `assets/galeria.json` del paquete anterior fue documentación del inventario inicial y no se usa para cargar ni publicar el álbum.

## Alcance de verificación

Las verificaciones automatizadas del panel utilizan respuestas simuladas de GitHub para no alterar las fotografías existentes. Se comprueban las operaciones de edición, la generación del HTML, la publicación atómica y los conflictos. La publicación inicial del panel conserva las 94 fotografías.
