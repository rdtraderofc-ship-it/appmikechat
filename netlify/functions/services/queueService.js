const supabase = require('../utils/supabase');
const logger = require('../utils/logger');
const messageService = require('./messageService');
const userService = require('./userService');
const funnelService = require('./funnelService');

const MAX_RETRIES = 3;

module.exports = {
  // 1. Adicionar à Fila (Rápido)
  addToQueue: async (payload) => {
    const { data, error } = await supabase.from('message_queue').insert({ 
      payload, 
      status: 'pending' 
    }).select().single();
    
    if (error) throw error;
    logger.info("📦 Mensagem adicionada à fila", { queueId: data.id });
    return data;
  },

  // 2. Processar Fila (Lógica Pesada)
  processQueueItem: async (queueId) => {
    try {
      // Marcar como processando para evitar duplicados - REQUISITO: Evitar processamento duplicado
      const { data: item, error: lockError } = await supabase
        .from('message_queue')
        .update({ status: 'processing' })
        .eq('id', queueId)
        .eq('status', 'pending') // Garante que só pega se ainda estiver pendente
        .select()
        .single();

      if (lockError || !item) return;

      const body = item.payload;
      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      
      if (message) {
        const wamid = message.id;
        const phone = message.from;
        const normalized = messageService.normalizeMessage(message);

        // A. Idempotência
        const isDuplicate = await messageService.isDuplicate(wamid);
        if (isDuplicate) {
          await supabase.from('message_queue').update({ status: 'completed' }).eq('id', queueId);
          return;
        }

        // B. Usuário e Sessão
        const contact = await userService.getOrCreateUser(phone, normalized.text);
        const conversation = await userService.getOrCreateConversation(contact.id);
        
        // C. Salvar no Banco
        await messageService.saveMessage(normalized, conversation.id);

        // D. Executar Funil de Vendas
        await funnelService.processFunnel(contact, normalized.text);

        // E. Marcar como Processado
        await supabase.from('message_queue').update({ 
          status: 'completed', 
          processed_at: new Date().toISOString() 
        }).eq('id', queueId);

        logger.info("✅ Item da fila processado com sucesso", { queueId });
      }
    } catch (err) {
      // REQUISITO: Retry automático
      const { data: currentItem } = await supabase.from('message_queue').select('retry_count').eq('id', queueId).single();
      const newRetryCount = (currentItem?.retry_count || 0) + 1;

      logger.error("❌ Erro ao processar item da fila", { queueId, retry: newRetryCount, error: err.message });

      const updateData = {
        status: newRetryCount >= MAX_RETRIES ? 'failed' : 'pending',
        retry_count: newRetryCount,
        error_log: err.message
      };

      await supabase.from('message_queue').update(updateData).eq('id', queueId);
    }
  }
};
