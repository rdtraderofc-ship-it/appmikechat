exports.handler = async (event, context) => {
  // VERIFICAÇÃO DO META
  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters;

    const VERIFY_TOKEN = "meu_token_131588";

    if (
      params["hub.mode"] === "subscribe" &&
      params["hub.verify_token"] === VERIFY_TOKEN
    ) {
      return {
        statusCode: 200,
        body: params["hub.challenge"],
      };
    } else {
      return {
        statusCode: 403,
        body: "Erro de verificação",
      };
    }
  }

  // RECEBER MENSAGEM
  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body);

    console.log("Mensagem recebida:", body);

    return {
      statusCode: 200,
      body: "EVENT_RECEIVED",
    };
  }

  return {
    statusCode: 405,
    body: "Método não permitido",
  };
};
