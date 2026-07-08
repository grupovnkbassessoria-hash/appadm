function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 1024 * 1024) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(new Error("JSON inválido."));
      }
    });
    req.on("error", reject);
  });
}

function requiredEnv() {
  return [
    "NFSE_API_BASE_URL",
    "NFSE_CERT_BASE64",
    "NFSE_CERT_PASSWORD",
    "NFSE_CITY_CODE"
  ].filter(name => !process.env[name]);
}

function buildPreRegistro(body) {
  return {
    id: "NFSE-PRE-" + Date.now(),
    destinatario: body.destinatario,
    valor: body.valor,
    status: "pre_registro",
    ambiente: process.env.NFSE_ENVIRONMENT || "producao-restrita",
    message: "Pre-registro criado. Configure as credenciais NFS-e no servidor para autorização oficial."
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, message: "Método não permitido." });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return json(res, 400, { ok: false, message: error.message });
  }

  if (!body.destinatario || !Number(body.valor)) {
    return json(res, 400, { ok: false, message: "Informe destinatário e valor da NFS-e." });
  }

  const missing = requiredEnv();
  if (missing.length) {
    return json(res, 202, {
      ok: true,
      official: false,
      nfse: buildPreRegistro(body),
      missingConfig: missing,
      message: "NFS-e salva como pre-registro. A autorização oficial depende da configuração fiscal no servidor."
    });
  }

  return json(res, 501, {
    ok: false,
    official: false,
    message: "Credenciais encontradas, mas a transmissão oficial ainda precisa implementar assinatura DPS e envio ao endpoint vigente da NFS-e Nacional."
  });
};
