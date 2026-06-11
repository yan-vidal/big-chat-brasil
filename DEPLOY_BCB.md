# Deploy BCB em bcb.yanlucas.com

Este projeto sobe em produção com containers para `api`, `worker`, `web` e `db`.
O `docker-compose.yml` da raiz continua sendo o caminho local simples:

```bash
docker compose up --build
```

Para produção, use `docker-compose.prod.yml`. Ele espera imagens já carregadas no host:

- `bcb-api:latest`
- `bcb-worker:latest`
- `bcb-web:latest`

O workflow `.github/workflows/deploy-bcb.yml` segue o padrão do Arateki: build no GitHub, upload de um tar com as imagens, `docker load` no runner self-hosted Arch e `docker compose -f docker-compose.prod.yml up -d`.

## Secrets do GitHub Actions

Crie estes secrets no ambiente `production`:

```text
BCB_DB_PASSWORD
BCB_JWT_SECRET
BCB_ADMIN_PASSWORD
BCB_INTERNAL_API_TOKEN
```

Use valores sem caracteres problemáticos para URL no `BCB_DB_PASSWORD` ou ajuste o `DATABASE_URL` manualmente no workflow.

## Portas locais no servidor

O compose de produção publica somente em loopback:

```text
api: 127.0.0.1:3020
web: 127.0.0.1:4220
```

O Postgres não é publicado no host.

## Nginx

Adicione um mount para o domínio no compose da infra apenas se for servir arquivos estáticos. Para BCB não precisa de mount de pasta, porque o frontend roda no container `bcb-web`.

Adicione um bloco parecido com este em `/opt/home-server/infra/nginx/nginx.conf`:

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name bcb.yanlucas.com;

    ssl_certificate /etc/letsencrypt/live/yanlucas.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yanlucas.com/privkey.pem;

    limit_req zone=soft_limit burst=100 nodelay;
    limit_conn addr_limit 30;

    location /api/ {
        proxy_pass http://127.0.0.1:3020/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3020;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:4220;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

O frontend recebe:

```text
BCB_API_BASE_URL=https://bcb.yanlucas.com/api
BCB_REALTIME_BASE_URL=https://bcb.yanlucas.com
```

Isso evita conflito entre rotas Angular (`/conversations/:id`) e endpoints REST (`GET /conversations/:id`), mantendo o Socket.IO no namespace `/chat` pela rota `/socket.io/`.

## Validação manual no servidor

Depois do deploy:

```bash
docker compose -f docker-compose.prod.yml ps
curl -fsS http://127.0.0.1:3020/health
curl -I http://127.0.0.1:4220
curl -I https://bcb.yanlucas.com
```

Se o Nginx for alterado manualmente:

```bash
docker exec nginx_direct nginx -t
docker restart nginx_direct
```
