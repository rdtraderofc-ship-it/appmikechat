const axios = require('axios');
const logger = require('../utils/logger');

module.exports = {
  sendMessage: async (to, text) => {
    try {
      const url = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const response = await axios.post(url, {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text }
      }, {
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
      });
      
      logger.info("📤 Mensagem enviada via API", { to, messageId: response.data.messages[0].id });
      return response.data;
    } catch (err) {
      logger.error("❌ Erro ao enviar mensagem WhatsApp", { error: err.response?.data || err.message });
      throw err;
    }
  }
};
