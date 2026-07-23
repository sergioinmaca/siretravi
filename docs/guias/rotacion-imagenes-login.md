# Como cambiar las imagenes del fondo del login

Las imagenes rotan diariamente usando `src/data/login-images.json`. Cada posicion del array corresponde a un dia del mes (dia 1, dia 2... dia 7, luego se repite).

## Agregar o reemplazar una imagen

1. Coloca el archivo nuevo en `public/img/login/` con el nombre que prefieras (ej: `campamento-vista.jpg`)

2. Abri `src/data/login-images.json` y cambia la ruta en la posicion que quieras:

```json
[
  "/img/login/dia-01.png",    ← dia 1 del mes
  "/img/login/campamento-vista.jpg",  ← cambiaste dia 2
  "/img/login/dia-01.png",    ← dia 3
  "/img/login/dia-01.png",    ← dia 4
  "/img/login/dia-01.png",    ← dia 5
  "/img/login/dia-01.png",    ← dia 6
  "/img/login/dia-01.png"     ← dia 7
]
```

3. Reinicia el dev server si estas en desarrollo. En produccion, solo despliega el JSON y las imagenes nuevas.

## Nota

- Formatos aceptados: `.jpg`, `.png`, `.webp`
- Si una imagen no carga, el login muestra fondo gris y sigue funcionando
- No se necesita tocar codigo TSX — solo JSON e imagenes
