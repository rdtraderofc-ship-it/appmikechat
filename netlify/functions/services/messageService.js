const supabase = require('../utils/supabase');

module.exports = {
  // 1. Idempotência: Verificar se a mensagem já existe (wamid)
  isDuplicate: async (wamid) => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    if (!wamid) return false;
    const { data } = await supabase
      .from('messages')
      .select('id')
      .eq('wamid', wamid)
      .single();
    return !!data;
  },

  // 2. Normalização: Tratar múltiplos tipos de mensagens
  normalizeMessage: (message) => {
    const type = message.type;
    const base = {
      wamid: message.id,
      from: message.from,
      timestamp: message.timestamp,
      type: type,
      text: null,
      media_id: null,
      mime_type: null
    };

    switch (type) {
      case 'text':
        base.text = message.text.body;
        break;
      case 'image':
        base.media_id = message.image.id;
        base.mime_type = message.image.mime_type;
        base.text = message.image.caption || "Imagem";
        break;
      case 'audio':
        base.media_id = message.audio.id;
        base.mime_type = message.audio.mime_type;
        base.text = "Áudio";
        break;
      case 'document':
        base.media_id = message.document.id;
        base.mime_type = message.document.mime_type;
        base.text = message.document.filename || "Documento";
        break;
      default:
        base.text = "Tipo não suportado";
    }
    return base;
  },

  // 3. Persistência
  saveMessage: async (msgData, conversationId) => {
    return await supabase.from('messages').insert({
      conversation_id: conversationId,
      text: msgData.text,
      sender_type: 'contact',
      wamid: msgData.wamid,
      media_id: msgData.media_id,
      mime_type: msgData.mime_type,
      metadata: { raw: msgData }
    });
  }
};
