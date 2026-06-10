# Guía de despliegue — Bosco Hub en un servidor (VPS)

Esta guía mueve todo lo que ahora corre en tu portátil (base de datos + n8n +
dashboard) a **un solo servidor en la nube**, siempre encendido, para que los 3
del equipo lo veáis igual desde cualquier sitio.

Resultado final:
- Dashboard del equipo → `http://IP-DEL-SERVIDOR`
- Panel de n8n (para gestionar el agente) → `http://IP-DEL-SERVIDOR:5678`

Hay dos formas de hacerlo:

- **Opción A (recomendada): todo automático con CI/CD.** Creas un servidor vacío
  y con un `git push` se instala y configura todo solo. Casi no tocas la terminal.
- **Opción B: manual paso a paso.** Entras al servidor y vas ejecutando comandos.
  Útil para entender qué pasa por dentro o como plan B.

---

# Opción A — Arranque automático con CI/CD (recomendada)

Con esto, el servidor nace vacío y el primer `git push` lo monta entero
(Docker + código + contraseñas + las 3 piezas). Pasos:

### A1. Crear la clave SSH de despliegue (en tu Mac)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/bosco_deploy -N "" -C "deploy-bosco"
```

Crea dos archivos: `bosco_deploy` (privada) y `bosco_deploy.pub` (pública).

### A2. Crear el servidor en Hetzner (vacío)

1. https://www.hetzner.com/cloud → **New Project** (`bosco-hub`) → **Add Server**.
2. **Location**: Nuremberg/Falkenstein · **Image**: Ubuntu 24.04 · **Type**: CX23.
3. **Backups**: actívalo (recomendado, ~+20%).
4. **SSH Key** → **Add SSH key** → pega el contenido de la clave PÚBLICA:
   ```bash
   cat ~/.ssh/bosco_deploy.pub
   ```
   (Esto es lo que permite a GitHub entrar solo, sin contraseñas.)
5. Crea el servidor y anota su **IP pública** (ej. `5.75.123.45`).

### A3. Subir el repo a GitHub

Si aún no está en GitHub, créalo (privado) y haz el primer push. (Pídeme ayuda
con este paso si lo necesitas.)

### A4. Poner los secretos en GitHub

En el repo: **Settings → Secrets and variables → Actions → New repository secret**.
Crea estos seis (las contraseñas las generas en tu Mac con `openssl rand -base64 24`):

| Nombre | Valor |
|---|---|
| `SSH_HOST` | la IP del servidor (ej. `5.75.123.45`) |
| `SSH_USER` | `root` |
| `SSH_PRIVATE_KEY` | el contenido de `cat ~/.ssh/bosco_deploy` (entero, con BEGIN/END) |
| `POSTGRES_PASSWORD` | una contraseña generada |
| `N8N_BASIC_AUTH_PASSWORD` | otra contraseña generada (tu login en n8n) |
| `N8N_ENCRYPTION_KEY` | otra clave generada (no la cambies después) |

### A5. Lanzar el arranque

Haz cualquier `git push` a `main` (o ve a la pestaña **Actions** → *Run workflow*).
GitHub se conecta al servidor e instala Docker, copia el código, crea el `.env` y
levanta todo. Tarda unos minutos la primera vez. Lo sigues en **Actions**.

Cuando termine: dashboard en `http://IP-DEL-SERVIDOR`.

### A6. Único paso manual: conectar el correo en n8n

El CI/CD lo monta todo menos una cosa que requiere iniciar sesión a mano: la
credencial de correo de n8n. Abre `http://IP-DEL-SERVIDOR:5678`, entra con
`zuk` / tu `N8N_BASIC_AUTH_PASSWORD`, abre el workflow del agente, **reconecta la
credencial de Outlook** y **activa** los dos workflows. Esto se hace una sola vez.

### A7. Cortafuegos (recomendado, una vez)

Entra al servidor (`ssh -i ~/.ssh/bosco_deploy root@IP`) y ejecuta:

```bash
ufw allow 22 && ufw allow 80 && ufw allow 5678 && ufw --force enable
```

A partir de aquí, **cada `git push` actualiza la web sola**. Ya está.

---

# Opción B — Manual paso a paso

## 1. Crear el servidor (Hetzner — ~4,50 €/mes)

1. Crea una cuenta en https://www.hetzner.com/cloud
2. **New Project** → ponle nombre (ej. `bosco-hub`).
3. **Add Server**:
   - **Location**: la más cercana (ej. Nuremberg/Falkenstein).
   - **Image**: **Ubuntu 24.04**
   - **Type**: **CX22** (2 vCPU, 4 GB RAM) — sobra para el prototipo.
   - **SSH Key**: si no sabes qué es, abajo en "Password" elige una contraseña
     root y guárdala. (Con SSH key es más seguro, pero para empezar vale la
     contraseña.)
   - Crea el servidor. Anota la **IP pública** que te muestra (ej. `5.75.123.45`).

---

## 2. Conectarte al servidor

Desde tu Mac, abre la Terminal y escribe (cambia la IP por la tuya):

```bash
ssh root@5.75.123.45
```

La primera vez te preguntará si confías en el servidor → escribe `yes`. Luego la
contraseña que pusiste en Hetzner.

---

## 3. Instalar Docker (una sola vez)

Pega esto en el servidor:

```bash
curl -fsSL https://get.docker.com | sh
```

Espera a que termine. Comprueba que funciona:

```bash
docker --version
```

---

## 4. Traer el código al servidor

La forma más cómoda es subir el repositorio a GitHub (privado) y clonarlo.
Si ya lo tienes en GitHub:

```bash
git clone https://github.com/TU-USUARIO/Bosco_Hub.git
cd Bosco_Hub
```

> ¿No lo tienes en GitHub? Pídeme que te ayude a subirlo, o cópialo desde tu Mac
> con `scp -r ~/Desktop/Bosco_Hub root@IP:/root/`.

---

## 5. Poner las contraseñas (archivo `.env`)

Crea el archivo de configuración a partir de la plantilla:

```bash
cp .env.prod.example .env
```

Genera contraseñas seguras (ejecuta 3 veces y copia cada resultado):

```bash
openssl rand -base64 24
```

Edita el `.env` y rellena los valores:

```bash
nano .env
```

- `POSTGRES_PASSWORD` → una contraseña generada
- `N8N_BASIC_AUTH_PASSWORD` → otra contraseña generada (será tu login en n8n)
- `N8N_ENCRYPTION_KEY` → otra generada (NO la cambies nunca después)
- `SERVER_HOST` → la **IP del servidor** (ej. `5.75.123.45`)

Guarda con `Ctrl+O`, Enter, y sal con `Ctrl+X`.

---

## 6. Arrancar todo

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

La primera vez tarda unos minutos (descarga y compila). Cuando termine, comprueba
que las 3 piezas están "Up":

```bash
docker compose -f docker-compose.prod.yml ps
```

Ya puedes abrir el **dashboard** en el navegador: `http://IP-DEL-SERVIDOR`

---

## 7. Configurar n8n (importante — el agente de emails)

El servidor arranca con n8n "en blanco", así que hay que reconectar la cuenta de
correo una vez:

1. Abre `http://IP-DEL-SERVIDOR:5678`
2. Entra con `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD` del `.env`.
3. Los 2 workflows ya están importados. Abre el del agente de emails.
4. En el nodo de correo (Outlook/IMAP), **vuelve a conectar la credencial**
   (la del servidor es nueva; las credenciales no se copian por seguridad).
5. **Activa** los dos workflows (botón *Active*/*Publish* arriba a la derecha).

A partir de aquí n8n procesa los emails 24/7 aunque apagues tu portátil, y el
dashboard muestra los `inquiries` a todo el equipo.

---

## 8. Protección básica (recomendado)

Activa el cortafuegos dejando solo lo necesario abierto:

```bash
ufw allow 22 && ufw allow 80 && ufw allow 5678 && ufw --force enable
```

> La base de datos NO está expuesta a internet (es interna entre contenedores).

---

## Tareas habituales

**Ver registros / errores:**
```bash
docker compose -f docker-compose.prod.yml logs -f dashboard
docker compose -f docker-compose.prod.yml logs -f n8n
```

**Actualizar tras cambios en el código** (haces `git push` desde tu Mac, y en el servidor):
```bash
cd Bosco_Hub
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

**Reiniciar todo:**
```bash
docker compose -f docker-compose.prod.yml restart
```

**Parar todo (sin borrar datos):**
```bash
docker compose -f docker-compose.prod.yml down
```

**Mirar la base de datos:**
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U zuk -d zuk
```

---

## CI/CD — Despliegue automático

El mismo workflow de la **Opción A** sirve tanto para el primer arranque como para
las actualizaciones: una vez configurados los secretos (paso A4), **cada
`git push` a `main` actualiza la web sola**. No hay que configurar nada más.

> Nota: la build se hace en el propio servidor. En la CX23 (4 GB RAM) funciona,
> pero si alguna vez una build falla por falta de memoria, añade memoria de
> intercambio una sola vez (entrando por SSH):
> ```bash
> fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
> echo '/swapfile none swap sw 0 0' >> /etc/fstab
> ```

---

## Siguiente paso opcional: dominio + HTTPS

Para un prototipo, `http://IP` es suficiente. Cuando queráis algo más serio
(un dominio tipo `boscohub.com` y candado de seguridad HTTPS), pídemelo y añado
un proxy (Caddy) que lo hace automático en unos minutos.
