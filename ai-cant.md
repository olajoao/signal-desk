
  2. Infrastructure / deploy
  Domain + DNS
  - Point yourdomain.com at your server (A record)
  - Point api.yourdomain.com at the API (or use a reverse proxy path)

  SSL/TLS
  - Use a reverse proxy (Caddy, nginx, Traefik) in front of docker-compose
  - Caddy is simplest — auto-HTTPS with Let's Encrypt:
  yourdomain.com {
      reverse_proxy web:3000
  }
  api.yourdomain.com {
      reverse_proxy api:3001
  }

