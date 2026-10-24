# Voltare OCPP — homologação

Receptor OCPP 1.6 JSON separado do aplicativo financeiro Voltare. O código inicial reaproveita o receptor que já estava salvo no projeto, sem alterar o site, os dados reais ou o Fluxy ERP.

## Teste inicial no Render

- Node.js 24, build `npm ci --omit=dev`, início `npm start`.
- Plano Free, uma instância; porta fornecida em `PORT`, bind `0.0.0.0`.
- `OCPP_MODE=test` e `OCPP_TEST_PASSWORD` privado com pelo menos 24 caracteres.
- Página inicial identifica HOMOLOGAÇÃO. `/healthz` verifica processo, não equipamento real.
- WebSocket: `wss://HOST/ocppj/SIM-TESTE`, subprotocolo `ocpp1.6` e HTTP Basic com usuário `SIM-TESTE` e senha privada configurada no Render.
- Apenas simulador habilitado. Cartão fictício autorizado: `TEST-CARD`; outros cartões são recusados.

O plano gratuito pode dormir após 15 minutos sem tráfego, demorar para despertar e reiniciar. O modo test guarda dados fictícios em memória e perde esses dados em reinícios. **Não é um banco persistente e não deve receber carregadores reais.**

## Testes

`npm ci` e `npm test`.

Para executar o ciclo remoto, fornecer `OCPP_TEST_URL` e `OCPP_TEST_PASSWORD` por ambiente privado e rodar `npm run simulate`. Exercita BootNotification, Heartbeat, StatusNotification, autorização aceita/recusada, início, medição, fim e reenvio idempotente. Não gera recargas nem cobranças financeiras.

## Persistência e equipamentos reais — próxima etapa

O modo `OCPP_MODE=supabase` preserva o adaptador do receptor original. Requer banco isolado com a função `ocpp_ingest` e tabelas compatíveis, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no servidor e arquivo privado `/etc/secrets/chargers.json` (ou `OCPP_CREDENTIALS_FILE`). Provisionamento e schema não são executados por este repositório.

A senha de cada carregador fica no arquivo privado, com identificador, `connectors` e `idTags`. Nunca colocar segredos no Git, frontend ou chat. Não apontar equipamentos reais para a homologação. Antes da migração, validar autenticação, cartões, persistência/reenvio após reinício e reversão do endereço antigo, com os conectores parados.

Esta versão recebe mensagens; não implementa comandos remotos para ligar/desligar carregadores. Não importa histórico do fabricante.

## Segurança e implantação

Payload limitado a 128 KiB, até 32 mensagens pendentes por conexão, JSON e ações validadas, autenticação obrigatória, senha comparada em tempo constante, heartbeat WebSocket e SIGTERM/SIGINT tratados. Segredos gerados/configurados fora do repositório. Dependência fixada e lockfile versionado. Cada atualização deve passar em `npm test` antes de implantar.
