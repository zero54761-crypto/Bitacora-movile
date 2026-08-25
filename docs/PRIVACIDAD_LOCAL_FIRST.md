# Privacidad local-first

Bitácora Personal guarda sus datos en el navegador o dispositivo donde se utiliza.

## Qué significa

- No se requiere una cuenta para usar v1.
- Los datos no se envían automáticamente a un servidor.
- Cada navegador, perfil o dispositivo mantiene un almacenamiento independiente.
- Borrar los datos del sitio elimina la información local si no existe un respaldo.
- El usuario debe exportar respaldos periódicos y guardarlos en una ubicación privada.

## Qué puede registrarse

Prioridades, proyectos, decisiones, alarmas, eventos, check-ins, capturas rápidas y cifras que el usuario decida introducir.

## Qué no debe registrarse

- contraseñas;
- tokens o claves API;
- números completos de tarjetas;
- documentos de identidad;
- secretos empresariales;
- información sensible de terceros sin autorización.

## Respaldo

El archivo JSON de respaldo no está cifrado por defecto. Debe almacenarse en un lugar privado y no compartirse públicamente.

## Futuro

La sincronización remota, si se desarrolla, deberá ser opcional, cifrada, auditable y separada del funcionamiento local. La aplicación local debe continuar operando cuando esa sincronización no esté disponible.
