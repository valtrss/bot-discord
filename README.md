# Bot de Discord para el servidor de Minecraft

Controla tu servidor de GameHost.cl desde Discord con los comandos:

- `/encender` — enciende el servidor
- `/apagar` — apaga el servidor
- `/reiniciar` — reinicia el servidor
- `/estado` — muestra si está online/offline, uso de RAM y CPU

## 1. Crear la aplicación de Discord

1. Ve a https://discord.com/developers/applications → **New Application**.
2. Copia el **Application ID** (lo vas a necesitar como `DISCORD_CLIENT_ID`).
3. Ve a la pestaña **Bot** → **Reset Token** → copia el token (`DISCORD_TOKEN`). Guárdalo, no se vuelve a mostrar.
4. En **OAuth2 → URL Generator**, marca el scope `bot` y `applications.commands`, con permisos "Send Messages" y "Use Slash Commands". Abre la URL generada y agrega el bot a tu servidor de Discord.

## 2. Variables de entorno

Copia `.env.example` a `.env` (solo para pruebas locales) y completa:

```
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
PTERODACTYL_URL=https://mcpanel.gamehost.cl
PTERODACTYL_API_KEY=ptlc_...
SERVER_ID=c7fa539d
```

**Nunca subas el archivo `.env` a GitHub ni lo compartas.**

## 3. Probar localmente (opcional)

```bash
npm install
npm start
```

## 4. Desplegar en Railway (recomendado, corre 24/7 en la nube)

1. Ve a https://railway.app y crea una cuenta (puedes usar GitHub).
2. **New Project → Deploy from GitHub repo** (sube esta carpeta a un repo de GitHub primero, puede ser privado) o **Empty Project → Add a service → GitHub Repo**.
3. En la pestaña **Variables** del servicio, agrega las mismas variables del paso 2 (DISCORD_TOKEN, DISCORD_CLIENT_ID, PTERODACTYL_URL, PTERODACTYL_API_KEY, SERVER_ID).
4. Railway va a detectar el `package.json` y correr `npm install` + `npm start` automáticamente.
5. Revisa los logs del deploy — debería decir "Comandos slash registrados." y luego "Bot conectado como...".

## 5. Probar en Discord

Escribe `/estado` en cualquier canal donde esté el bot. Si responde con el estado del servidor, ¡ya quedó funcionando!

## Notas de seguridad

- El `PTERODACTYL_API_KEY` que generaste es de tipo **Client API** — solo tiene acceso a lo que tu propia cuenta puede hacer (no es admin de todo el host), pero igual trátalo como una contraseña.
- Si el bot deja de funcionar, probablemente hay que regenerar el token/key porque se filtró o expiró — bórralo desde el panel y crea uno nuevo.
