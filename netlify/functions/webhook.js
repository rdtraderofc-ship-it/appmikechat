const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  // 1. VERIFICAÇÃO (GET) - REQUISITO META #1
  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters;
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "meu_token_131588";

    if (params["hub.mode"] === "subscribe" && params["hub.verify_token"] === VERIFY_TOKEN) {
      console.log("✅ Webhook verificado com sucesso!");
      return { statusCode: 200, body: params["hub.challenge"] };
    }
    return { statusCode: 403, body: "Erro de verificação" };
  }

  // 2. RECEBIMENTO DE EVENTOS (POST) - REQUISITO META #1 & #2
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body);
      
      // Log para Debug - REQUISITO META #15
      console.log("📩 Evento recebido:", JSON.stringify(body));

      // Extração de dados - REQUISITO META #2
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message) {
        const from = message.from;
        const text = message.text?.body || "";
        const wamid = message.id; // ID único da mensagem - REQUISITO META #8

        // --- LÓGICA DE PERSISTÊNCIA ---
        
        // A. Upsert Contact
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .upsert({ 
            phone: from, 
            last_message: text,
            last_message_time: new Date().toISOString()
          }, { onConflict: 'phone' })
          .select()
          .single();

        if (contactError) throw contactError;

        // B. Buscar ou Criar Conversa (Controle de Sessão)
        let { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('contact_id', contact.id)
          .eq('status', 'open')
          .single();

        if (!conversation) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({ contact_id: contact.id, status: 'open' })
            .select()
            .single();
          conversation = newConv;
        }

        // C. Salvar Mensagem (Idempotência via wamid)
        if (conversation) {
          await supabase.from('messages').insert({
            conversation_id: conversation.id,
            text: text,
            sender_type: 'contact',
            wamid: wamid,
            metadata: { raw: body }
          });
        }
      }

      // SEMPRE retornar 200 OK para a Meta - REQUISITO META #1 & #9
      return { statusCode: 200, body: "EVENT_RECEIVED" };
    } catch (err) {
      console.error("❌ Erro interno (mas respondendo 200):", err);
      return { statusCode: 200, body: "EVENT_RECEIVED" };
    }
  }

  return { statusCode: 405, body: "Método não permitido" };
};
