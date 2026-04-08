const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  // VERIFICAÇÃO DO META
  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters;
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "meu_token_131588";

    if (
      params["hub.mode"] === "subscribe" &&
      params["hub.verify_token"] === VERIFY_TOKEN
    ) {
      return { statusCode: 200, body: params["hub.challenge"] };
    }
    return { statusCode: 403, body: "Erro de verificação" };
  }

  // RECEBER MENSAGEM
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body);
      console.log("Mensagem recebida:", JSON.stringify(body));

      if (body.object === "whatsapp_business_account") {
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const message = value?.messages?.[0];

        if (message) {
          const from = message.from;
          const text = message.text?.body || "Mídia/Outro";

          // 1. Upsert Contact
          const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .upsert({ 
              phone: from, 
              last_message: text,
              last_message_time: new Date().toISOString()
            }, { onConflict: 'phone' })
            .select()
            .single();

          if (contactError) console.error("Erro ao salvar contato:", contactError);

          // 2. Save Message (Opcional: vincular a uma conversa se existir)
          // Para este teste, vamos apenas registrar no log do Supabase ou em uma tabela de logs
          await supabase.from('messages').insert({
            text: text,
            sender_type: 'contact',
            metadata: { raw: body }
          });
        }
      }

      return { statusCode: 200, body: "EVENT_RECEIVED" };
    } catch (err) {
      console.error("Erro no processamento:", err);
      return { statusCode: 500, body: "Internal Error" };
    }
  }

  return { statusCode: 405, body: "Método não permitido" };
};
