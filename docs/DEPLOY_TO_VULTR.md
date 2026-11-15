# Deploy Oracle of Ithaca to Vultr

This guide deploys the app to one Vultr Ubuntu server, uses MongoDB Atlas for persistent data, and uses Caddy to provide HTTPS. It keeps the setup small: one app server, no Docker, and no separate database server to maintain.

The latest app code is on GitHub `main` (including commit `2e7eabd`, which reuses MongoDB connections in production). The app was verified with `npm run lint` and `npm run build` before this guide was written.

## Cost and free-trial notes

Vultr is not permanently free. Vultr currently advertises trial credits for up to 30 days. A payment method may be required, and servers can continue to accrue charges while stopped. Destroy the server in the Vultr console to stop server charges after the trial or demo. Check the current balance and price in the Vultr console before deploying.

MongoDB Atlas has a free cluster suitable for a small demo. Free clusters have limits and do not include enabled automatic backups by default. The city and incident history generated for this project is simulated; do not put private or real operational data in a demo database.

References: [Vultr trial account](https://docs.vultr.com/platform/create-an-account), [Vultr server billing](https://docs.vultr.com/support/platform/billing/how-am-i-billed-for-my-servers), and [Atlas free-cluster limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).

## 1. Prepare a domain and SSH key

You need a domain or subdomain for the standard HTTPS setup. For example, use `ithaca.example.com` and replace it with your real hostname below.

On your Mac, create an SSH key if you do not already have one:

```bash
ssh-keygen -t ed25519 -C "ithaca-vultr"
```

Press Enter to accept the default file location. Then show the public key and add its contents to Vultr when you create the server:

```bash
cat ~/.ssh/id_ed25519.pub
```

Only add the `.pub` public key. Never share or upload the private key file `~/.ssh/id_ed25519`.

## 2. Create the Vultr server

In the Vultr console:

1. Create a **Cloud Compute** instance with **Ubuntu 24.04 LTS**.
2. Choose a region close to your audience and database.
3. Choose at least **2 GB RAM**. Avoid the smallest 0.5 GB plan for a Next.js app build.
4. Enable a public IPv4 address and attach the SSH key you added above.
5. Attach a Vultr Firewall group with inbound TCP rules for:
   - `22` (SSH), restricted to your current public IP if possible.
   - `80` (HTTP), open to the web.
   - `443` (HTTPS), open to the web.

Do not open port `3000` publicly. Caddy will accept web traffic and proxy it to the app locally. Vultr firewall groups filter incoming traffic to an instance; the Ubuntu firewall is configured in a later step. See the [Vultr firewall guide](https://docs.vultr.com/products/compute/instances/cloud-compute/networking/enable-firewall).

Copy the server's public IPv4 address from the Vultr console. Call it `SERVER_IP` in the instructions below.

## 3. Point the domain to the server

At your domain registrar, add an **A** record for the hostname you plan to use, pointing it to `SERVER_IP`.

Example for `ithaca.example.com`:

```text
Type: A
Name: ithaca
Value: SERVER_IP
```

Wait until the DNS record resolves to the Vultr address before configuring Caddy. HTTPS certificate setup depends on the hostname reaching the server.

## 4. Create a free MongoDB Atlas database

In MongoDB Atlas:

1. Create a project and a **Free** cluster in a region near the Vultr server.
2. Create a database user with a long, unique password and read/write access to the demo database.
3. In **Network Access**, add the Vultr server's public IP as a single address, such as `203.0.113.10/32`. Do not use `0.0.0.0/0` for this Vultr setup.
4. Copy the driver's connection string. Replace the username, password, and cluster host with your values.

Use a new database named `citypulse_demo` so the demo seed scripts do not touch another database. If the database password contains special URL characters, URL-encode the password in the connection string. Atlas describes its network allow-list in [Configure IP Access List Entries](https://www.mongodb.com/docs/atlas/security/ip-access-list/).

## 5. Connect to the server and install Node.js

From your Mac, connect with SSH (replace the address):

```bash
ssh root@SERVER_IP
```

On the server, update Ubuntu and install Git and Node.js 22:

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl git gnupg ufw
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
bash /tmp/nodesource_setup.sh
apt install -y nodejs
node --version
npm --version
```

Node.js 22 is an LTS release and matches the version used while checking this project. NodeSource documents its Ubuntu package setup in its [Node.js distribution instructions](https://github.com/nodesource/distributions).

## 6. Create a non-root app user and download the code

Still connected as `root`, create a dedicated user and app directory:

```bash
adduser --disabled-password --gecos "" ithaca
mkdir -p /opt/ithaca.city
chown ithaca:ithaca /opt/ithaca.city
```

Switch to the app user, clone the repository, and install the locked dependencies:

```bash
su - ithaca
git clone https://github.com/Iam-samyog/citypulse.git /opt/ithaca.city/app
cd /opt/ithaca.city/app
npm ci
```

If GitHub says authentication is required, use a read-only SSH deploy key for the repository. Do not put a personal access token in the clone URL or shell history.

## 7. Add production environment variables

Generate values for the demo password and cookie-signing secret. Keep the output private and save it somewhere safe so you can sign in later:

```bash
openssl rand -hex 16
openssl rand -hex 32
```

The first output can be the demo password; the second is the session secret. While still the `ithaca` user, create the ignored local environment file:

```bash
cd /opt/ithaca.city/app
nano .env.local
```

Add the following, replacing every sample value:

```dotenv
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://DB_USER:URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=citypulse_demo
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.6-flash
DEMO_USERNAME=operator
DEMO_PASSWORD=PASTE_THE_FIRST_RANDOM_VALUE_HERE
DEMO_SESSION_SECRET=PASTE_THE_SECOND_RANDOM_VALUE_HERE
```

Save and exit (`Ctrl+O`, Enter, `Ctrl+X` in nano), then restrict access to the file:

```bash
chmod 600 .env.local
```

`.env.local` is ignored by Git. Do not commit it, paste secrets into `NEXT_PUBLIC_*` variables, or share screenshots that show it. Optional Telegram and ElevenLabs features can remain unconfigured.

## 8. Seed the new demo database and build

Only run these commands against the new `citypulse_demo` database:

```bash
npm run seed
npm run seed:demo
npm run build
```

The first command inserts the city's 38 infrastructure assets and 69 dependency links. The second creates simulated incident history and simulator runs for the presentation. Do not add `--reset` unless you intend to clear incident-related collections in that database.

You can do a quick local check on the server before creating the service:

```bash
npm start
```

When it starts, press `Ctrl+C` to stop it. The app will be started and monitored by systemd in the next step.

## 9. Run the app as a system service

Exit the `ithaca` shell to return to `root`:

```bash
exit
```

Create a systemd service. It runs the app as the non-root `ithaca` user and restarts it if it exits:

```bash
cat > /etc/systemd/system/ithaca.service <<'EOF'
[Unit]
Description=Oracle of Ithaca web app
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ithaca
Group=ithaca
WorkingDirectory=/opt/ithaca.city/app
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now ithaca
systemctl status ithaca --no-pager
```

If `npm` is not at `/usr/bin/npm`, run `command -v npm` and use the returned path in `ExecStart`.

To read app logs:

```bash
journalctl -u ithaca -f
```

Press `Ctrl+C` to stop following logs; that does not stop the service.

## 10. Install Caddy and enable HTTPS

Make sure the domain's A record points to the server and ports 80 and 443 are open in the Vultr Firewall group. Install Caddy using its official Ubuntu package repository:

```bash
apt install --yes debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
chmod o+r /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install --yes caddy
```

Replace `ithaca.example.com` below with your actual hostname:

```bash
cat > /etc/caddy/Caddyfile <<'EOF'
ithaca.example.com {
    reverse_proxy 127.0.0.1:3000
}
EOF

systemctl reload caddy
systemctl status caddy --no-pager
```

Caddy obtains and renews the HTTPS certificate automatically when DNS and firewall access are correct. See the [official Caddy install guide](https://caddyserver.com/docs/install) and [Caddy quick-start](https://caddyserver.com/docs/quick-starts/caddyfile).

## 11. Enable the Ubuntu firewall

Configure the OS firewall as well as the Vultr Firewall group. Allow SSH before enabling UFW so you do not lock yourself out:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

Leave port 3000 closed publicly. Caddy reaches the app on the server itself.

## 12. Test the public deployment

Open `https://YOUR_HOSTNAME` in a browser and verify:

1. The site loads with HTTPS and redirects to the login page.
2. Sign in with the `DEMO_USERNAME` and `DEMO_PASSWORD` you configured.
3. The dashboard shows the seeded infrastructure and incidents.
4. Athena responds. If it does not, check the Gemini key and `journalctl -u ithaca -f`.
5. Open the 3D simulator, run a scenario, and save it to history.
6. Refresh the dashboard and verify that the simulator run appears in history.
7. Check `systemctl status ithaca` and `systemctl status caddy` if anything fails.

## 13. Update the app after a GitHub push

After a new commit has been pushed to `main`, connect to the server and update the code:

```bash
ssh root@SERVER_IP
su - ithaca
cd /opt/ithaca.city/app
git pull --ff-only origin main
npm ci
npm run build
exit
systemctl restart ithaca
systemctl status ithaca --no-pager
```

The `.env.local` file stays on the server and is ignored by Git. If a deployment build fails, check `journalctl -u ithaca -n 100 --no-pager` and the output of `npm run build` before making more changes.

## Troubleshooting

- **SSH connection times out:** check the Vultr firewall group and UFW allow TCP 22 from your IP.
- **HTTPS certificate is not issued:** confirm the DNS A record resolves to the Vultr public IP and ports 80/443 are open in both firewalls.
- **Database connection fails:** check `MONGODB_URI`, URL-encoding of its password, Atlas's database user permissions, and the Atlas access-list entry for `SERVER_IP/32`.
- **Login says demo access is not configured:** confirm `DEMO_USERNAME`, `DEMO_PASSWORD`, and a non-empty `DEMO_SESSION_SECRET` are in `.env.local`, then restart `ithaca`.
- **Gemini chat fails:** confirm `GEMINI_API_KEY`, check server logs, and verify that the API key's project has access to the configured model and remaining quota.
- **Vultr credits are nearly gone:** export any database data you need, then destroy the instance in the Vultr console if you do not want billing to continue. Stopping it does not stop hourly charges.
