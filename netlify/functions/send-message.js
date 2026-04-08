const whatsappService = require('./services/whatsappService');
const logger = require('./utils/logger');
const supabase = require('./utils/supabase');

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { phone, text, contactId } = JSON.parse(event.body);

    if (!phone || !text) {
      return { statusCode: 400, body: "Missing phone or text" };
    }

    // 1. Enviar via WhatsApp API
    await whatsappService.sendMessage(phone, text);

    // 2. Salvar no Supabase
    // Buscar conversa aberta
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', contactId)
      .eq('status', 'open')
      .single();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ contact_id: contactId, status: 'open' })
        .select()
        .single();
      conversation = newConv;
    }

    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      text: text,
      sender_type: 'agent',
      created_at: new Date().toISOString()
    });

    return { 
      statusCode: 200, 
      body: JSON.stringify({ success: true }) 
    };
  } catch (err) {
    logger.error("❌ Erro ao enviar mensagem manual", { error: err.message });
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: err.message }) 
    };
  }
};
