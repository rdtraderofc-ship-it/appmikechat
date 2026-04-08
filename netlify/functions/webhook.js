const logger = require('./utils/logger');
const queueService = require('./services/queueService');

exports.handler = async (event, context) => {
  // 1. VERIFICAÇÃO (GET)
  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters;
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "meu_token_131588";

    if (params["hub.mode"] === "subscribe" && params["hub.verify_token"] === VERIFY_TOKEN) {
      logger.info("✅ Webhook verificado com sucesso!");
      return { statusCode: 200, body: params["hub.challenge"] };
    }
    return { statusCode: 403, body: "Erro de verificação" };
  }

  // 2. RECEBIMENTO DE EVENTOS (POST)
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body);
      
      // REQUISITO: Responder rápido (< 5s)
      // No Netlify, precisamos dar await para garantir que o processamento ocorra
      // antes da função ser encerrada.
      const queueItem = await queueService.addToQueue(body);
      await queueService.processQueueItem(queueItem.id);

      return { statusCode: 200, body: "EVENT_RECEIVED" };
    } catch (err) {
      logger.error("❌ Erro ao receber evento", { error: err.message });
      return { statusCode: 200, body: "EVENT_RECEIVED" };
    }
  }

  return { statusCode: 405, body: "Método não permitido" };
};
