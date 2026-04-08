const supabase = require('../utils/supabase');

module.exports = {
  getOrCreateUser: async (phone, lastMessage) => {
    const { data: contact, error } = await supabase
      .from('contacts')
      .upsert({ 
        phone: phone, 
        last_message: lastMessage,
        last_interaction_at: new Date().toISOString()
      }, { onConflict: 'phone' })
      .select()
      .single();

    if (error) throw error;
    return contact;
  },

  getOrCreateConversation: async (contactId) => {
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
    return conversation;
  },

  // Janela de 24 horas
  isWithin24hSession: (lastInteraction) => {
    if (!lastInteraction) return false;
    const lastDate = new Date(lastInteraction);
    const now = new Date();
    const diffInHours = (now - lastDate) / (1000 * 60 * 60);
    return diffInHours < 24;
  }
};
