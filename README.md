# Bitácora Personal

Aplicación PWA local-first para organizar prioridades, proyectos, decisiones, agenda, hábitos de ejecución y evidencia desde el teléfono.

## Producto

Esta edición es genérica y está separada de cualquier edición privada personalizada.

Bitácora Personal comienza con un onboarding llamado **Conocerme**. Cada persona decide qué nombre, objetivos, áreas, preferencias y principios desea guardar. No se importa información desde cuentas externas.

## Privacidad

- Los datos viven en el navegador o dispositivo.
- IndexedDB es el almacenamiento principal y `localStorage` funciona como espejo de recuperación.
- La aplicación pública no contiene identidades, proyectos, marcas ni contexto privado precargado.
- No almacena contraseñas, tokens, credenciales bancarias ni documentos privados.
- El respaldo JSON debe guardarse en una ubicación privada elegida por el usuario.

## Funciones v1

- onboarding personal editable;
- foco del día;
- proyectos con objetivo, siguiente acción, bloqueo y gates;
- decisiones que necesitan del usuario;
- agenda y alarmas locales;
- check-ins de vida;
- captura rápida;
- exportación de eventos `.ics`;
- respaldo y restauración JSON;
- funcionamiento offline después de la primera carga;
- instalación desde Chrome o Samsung Internet.

## Arquitectura

Aplicación estática sin build obligatorio ni backend remoto. Se publica mediante GitHub Pages sin costo recurrente.

```bash
python3 -m http.server 8099
# abre http://localhost:8099
```

## Frontera de producto

- `Bitacora-app`: edición privada personalizada.
- `Bitacora-movile`: distribución pública de Bitácora Personal.
- Una futura edición Teams necesitará autenticación, organizaciones, permisos y sincronización privada; no forma parte de v1.

## Estado

La rama `feat/bitacora-personal-v1` contiene la primera conversión genérica. No debe fusionarse hasta completar CI, revisión de contenido, prueba móvil, instalación PWA, modo offline y respaldo/restauración.
