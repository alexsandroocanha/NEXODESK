# NEXODESK

## Passo a passo para executar

Requisito: Docker Desktop instalado e rodando.

1. Extraia o projeto e abra um terminal na pasta `chamados-app`.

2. Copie o arquivo de ambiente:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Edite o `.env` e troque `POSTGRES_PASSWORD` e `DJANGO_SECRET_KEY` por valores fortes (a chave do Django precisa ter pelo menos 50 caracteres). Use uma senha de banco sem caracteres reservados de URL (`@`, `:`, `/`, `#`, `?`).

4. Suba os serviços:

   ```powershell
   docker compose up --build
   ```

5. Em outro terminal, crie o administrador:

   ```powershell
   docker compose exec backend python manage.py createsuperuser
   ```

6. Acesse:
   - Frontend: http://localhost:5173
   - API: http://localhost:8000/api/
   - Admin do Django: http://localhost:8000/admin/

Para parar os serviços sem perder os dados, use `docker compose down`. Não use `docker compose down -v`, porque isso apaga o volume do banco.
