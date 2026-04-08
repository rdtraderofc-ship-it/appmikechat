import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory storage for demo/testing purposes
let webhookEvents: any[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- WhatsApp Webhook Routes ---

  // Verification (Meta requirement)
  app.get("/api/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("--- TENTATIVA DE VERIFICAÇÃO DE WEBHOOK ---");
    console.log("Modo:", mode);
    console.log("Token recebido:", token);
    console.log("Token esperado (WHATSAPP_VERIFY_TOKEN):", process.env.WHATSAPP_VERIFY_TOKEN);

    if (mode && token) {
      if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log("✅ WEBHOOK VERIFICADO COM SUCESSO!");
        res.status(200).send(challenge);
      } else {
        console.error("❌ FALHA NA VERIFICAÇÃO: Token não coincide.");
        res.sendStatus(403);
      }
    } else {
      console.error("❌ FALHA NA VERIFICAÇÃO: Parâmetros ausentes.");
      res.sendStatus(400);
    }
  });

  // Receiving Messages
  app.post("/api/webhook", async (req, res) => {
    console.log("--- NOVO POST RECEBIDO EM /api/webhook ---");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));

    const body = req.body;

    // Store event for the frontend monitor
    webhookEvents.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      data: body
    });
    if (webhookEvents.length > 10) webhookEvents.pop();

    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (message) {
        const from = message.from; 
        const msgText = message.text?.body || "Mídia/Outro";
        
        console.log(`Mensagem de ${from}: ${msgText}`);

        // Salvar no Supabase
        try {
          await supabase.from('contacts').upsert({ 
            phone: from, 
            last_message: msgText,
            last_message_time: new Date().toISOString()
          }, { onConflict: 'phone' });

          await supabase.from('messages').insert({
            text: msgText,
            sender_type: 'contact',
            metadata: { raw: body }
          });
          console.log("✅ Dados salvos no Supabase com sucesso.");
        } catch (err) {
          console.error("❌ Erro ao salvar no Supabase:", err);
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  });

  // Rota de Teste Local (Simulação)
  app.post("/api/test-webhook", (req, res) => {
    const mockBody = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: "5511999999999",
              text: { body: req.body.text || "Mensagem de teste do ZapFlow" },
              timestamp: Math.floor(Date.now() / 1000)
            }]
          },
          field: "messages"
        }]
      }]
    };
    
    // Chama o webhook internamente
    app._router.handle({ method: 'POST', url: '/api/webhook', body: mockBody }, res, () => {});
    return;
  });

  // --- API Routes ---
  app.get("/api/webhook-events", (req, res) => {
    res.json(webhookEvents);
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "ZapFlow Pro Server is running" });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
