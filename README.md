# Regalo-1

Regalo de cumpleaños pensado para celular: una pantalla con contraseña y, al acertar, una carta enrollada con un moño que se desata y se desenrolla.

## Qué se edita

Todo está en `js/config.js`:

- **Contraseña**: se guarda como hash. Para cambiarla corré `node scripts/hash.mjs "la contraseña"` y pegá el resultado en `passwordHash`. No distingue mayúsculas ni tildes.
- **Pista** y **mensajes de error**.
- **Carta**: título, destinatario, párrafos, despedida y firma.

## Probar en la compu

```sh
python3 -m http.server 8642
```

Abrí http://localhost:8642 y en Chrome activá la vista de celular (Cmd+Opción+I y después Cmd+Shift+M).

## Publicar

GitHub Pages: Settings → Pages → Deploy from branch → `main` / root. Queda en https://fede-rodriguez1.github.io/Regalo-1/

La contraseña sirve como juego, no como seguridad: alguien que sepa mirar el código puede leer la carta.
