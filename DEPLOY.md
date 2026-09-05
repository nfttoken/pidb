# PIDB VPS Deployment

Prerequisites:

- Docker Engine with the Compose plugin
- DNS `A` record for `pidb.oyct.eu.org` pointing to the VPS
- VPS firewall allowing TCP ports 80 and 443
- Host Nginx configured to terminate HTTPS and proxy to `127.0.0.1:19623`

Deploy from the repository root:

```bash
docker compose --env-file .env.production up -d --build
```

The stack runs database migrations, creates the first Admin user if it does not exist, serves the React application on `127.0.0.1:19623`, and runs the Shopify queue worker every 60 seconds. Host Nginx remains responsible for the domain and HTTPS certificate.

Example host Nginx proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name pidb.oyct.eu.org;

    ssl_certificate /etc/letsencrypt/live/pidb.oyct.eu.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pidb.oyct.eu.org/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:19623;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Open:

```text
https://pidb.oyct.eu.org
```

Useful checks:

```bash
docker compose ps
docker compose logs -f backend
docker compose exec backend alembic current
```

The file `.env.production` contains deployment credentials and must not be committed or exposed publicly. Replace the Shopify settings before enabling Shopify synchronization.
