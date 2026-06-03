# Iconos de la app (TicketSaver)

Fuente del icono del APK. Diseño: ticket blanco con badge verde de "guardado"
sobre degradado azul→índigo (la identidad de la app).

- `gen.js` — genera los SVG (`full.svg`, `fg.svg`, `bg.svg`).
- `icon-only.png` (1024) — icono completo (legacy / Play Store).
- `icon-foreground.png` (1024, transparente) — capa frontal del icono adaptativo.
- `icon-background.png` (1024) — capa de fondo (degradado) del icono adaptativo.

## Regenerar todos los tamaños de Android

```bash
node assets/gen.js                      # crea los SVG en /tmp/icon (ajusta rutas)
# rasteriza los SVG a PNG 1024 (full→icon-only, fg→icon-foreground, bg→icon-background)
npx @capacitor/assets generate --android
# IMPORTANTE: tras generar, deja los XML de mipmap-anydpi-v26 SIN <inset>
# (fondo a sangre completa + foreground a tamaño natural).
```
