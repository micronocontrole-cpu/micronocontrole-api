# Micro no Controle V2 - PostgreSQL no Railway

Esta versão remove o uso de `dados.json`, `usuarios.json` e repositories legacy.
O banco principal agora é PostgreSQL.

## O que mudou

- Saiu JSON local.
- Entrou PostgreSQL.
- O schema cria as tabelas automaticamente no startup.
- Usuários agora têm `token` salvo no banco.
- Rotas de cliente usam token e filtram os dados pelo telefone do usuário autenticado.
- Rotas `/api/dados` e `/api/usuarios` agora exigem `admin_secret`.

## Variáveis obrigatórias no Railway

No serviço da API, configure:

```env
DATABASE_URL=cole_aqui_a_url_do_postgres_do_railway
PGSSL=true
ADMIN_SECRET=crie_uma_senha_grande
```

Depois, se usar WhatsApp:

```env
ZAPI_INSTANCE=
ZAPI_TOKEN=
ZAPI_CLIENT_TOKEN=
```

## Como rodar localmente

```bash
npm install
npm start
```

## Como testar no navegador

Health:

```txt
/api
```

Listar usuários como admin:

```txt
/api/admin/usuarios?admin_secret=SUA_SENHA
```

Ver dashboard do cliente:

```txt
/api/dashboard?token=TOKEN_DO_CLIENTE
```

## Importante

Não suba `.env` para o GitHub. Use apenas `.env.example`.
