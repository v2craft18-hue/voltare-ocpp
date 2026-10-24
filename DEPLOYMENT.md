# Homologação publicada — 24/10/2026

- Repositório reaproveitado: v2craft18-hue/voltare-ocpp, main.
- Commit de código publicado: b4f8a76f4f0462b09d3c350b7ea7fb7940e0f05a.
- Render: Gabriel's workspace, tea-db9997ifngtc739cg880.
- Serviço: srv-dbebo9nb9u1s7395p94g, voltare-ocpp-teste, Virginia, plano Free, uma instância.
- Deploy verificado live: dep-dbeboafb9u1s7395pbe0.
- URL: https://voltare-ocpp-teste.onrender.com
- Painel: https://dashboard.render.com/web/srv-dbebo9nb9u1s7395p94g
- Autodeploy desligado; novas versões exigem implantação deliberada.
- OCPP_MODE=test; senha gerada aleatoriamente guardada na variável privada OCPP_TEST_PASSWORD do serviço, nunca no Git.

## Verificações concluídas

4 testes locais passaram e o build do Render executou os mesmos testes. GET /healthz respondeu processReady=true, testOnly=true e storage=ephemeral-memory. A página inicial foi aberta no navegador e identifica HOMOLOGAÇÃO · SOMENTE SIMULADOR.

Ciclo WSS público autenticado pelo simulador: BootNotification aceito, Heartbeat, StatusNotification, Authorize aceito para TEST-CARD e recusado para cartão desconhecido, StartTransaction, MeterValues, StopTransaction e replay idempotente. Foi necessário usar o proxy de rede do ambiente de QA para WSS, sem mudar o servidor hospedado. Esse teste prova troca de mensagens com o receptor e não prova integração com equipamento, medidor ou banco persistente.

## Limites e próximo passo

Não foi criado banco persistente. O modo de teste usa memória e apaga os eventos ao reiniciar. O plano Free pode dormir e não é a configuração final de operação 24 horas. Não há comandos remotos de início/parada nesta versão nem interface administrativa de estações.

Próxima etapa: configurar persistência isolada, testar repetição após reinício, definir cartões e autorização, validar equipamento real e preparar reversão antes de mudar sua URL OCPP. Nenhuma configuração dos carregadores, dado real do Voltare ou projeto Fluxy ERP foi alterado nesta homologação.
