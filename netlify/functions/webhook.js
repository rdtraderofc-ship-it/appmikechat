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
      // Apenas jogamos na fila e respondemos 200
      const queueItem = await queueService.addToQueue(body);

      // Disparamos o processamento de forma assíncrona (Fire and Forget)
      // No Netlify, isso pode ser feito chamando a própria função ou uma dedicada
      // Para este ambiente, vamos processar logo após o insert para garantir a execução
      queueService.processQueueItem(queueItem.id).catch(e => logger.error("Erro assíncrono", e));

      return { statusCode: 200, body: "EVENT_RECEIVED" };
    } catch (err) {
      logger.error("❌ Erro ao receber evento", { error: err.message });
      return { statusCode: 200, body: "EVENT_RECEIVED" };
    }
  }

  return { statusCode: 405, body: "Método não permitido" };
};
