const whatsappService = require('./whatsappService');
const logger = require('../utils/logger');
const supabase = require('../utils/supabase');

const DEFAULT_FUNNEL_NAME = 'financeiro_v1';

module.exports = {
  processFunnel: async (contact, messageText) => {
    const phone = contact.phone;
    const currentStage = contact.funnel_stage || 'START';
    
    try {
      logger.info("🤖 Iniciando processamento de funil dinâmico", { phone, currentStage });

      // 1. Verificar Janela de 24h - REQUISITO: Bloquear fora da janela
      const lastInteraction = contact.last_interaction_at;
      const now = new Date();
      const lastDate = new Date(lastInteraction);
      const diffInHours = (now - lastDate) / (1000 * 60 * 60);

      if (diffInHours >= 24) {
        logger.warn("⏳ Janela de 24h expirada. Resposta comum bloqueada.", { phone });
        // Futuramente: Enviar Template Message aqui
        return;
      }

      // 2. Buscar Configuração do Funil no Banco - REQUISITO: Funil Dinâmico
      const { data: step, error: stepError } = await supabase
        .from('funnel_steps')
        .select(`
          message_text,
          next_step_key,
          funnels!inner(name)
        `)
        .eq('funnels.name', DEFAULT_FUNNEL_NAME)
        .eq('step_key', currentStage)
        .single();

      if (stepError || !step) {
        logger.error("❌ Etapa do funil não encontrada no banco", { currentStage, error: stepError });
        return;
      }

      // 3. Enviar Resposta via WhatsApp API - REQUISITO: Envio automático
      await whatsappService.sendMessage(phone, step.message_text);
      logger.info("✅ Resposta do funil enviada", { phone, stage: currentStage });

      // 4. Atualizar para a Próxima Etapa
      if (step.next_step_key) {
        const { error: updateError } = await supabase
          .from('contacts')
          .update({ funnel_stage: step.next_step_key })
          .eq('id', contact.id);
        
        if (updateError) throw updateError;
        logger.info("➡️ Estágio do funil atualizado", { phone, nextStage: step.next_step_key });
      }

    } catch (err) {
      // REQUISITO: Tratamento de erros robusto
      logger.error("❌ Falha crítica no funnelService", { 
        phone, 
        stage: currentStage, 
        error: err.message 
      });
      // Não lançamos o erro para não quebrar a fila, apenas logamos
    }
  }
};
