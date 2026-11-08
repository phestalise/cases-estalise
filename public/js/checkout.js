// js/checkout.js

window.initCheckout = async function () {

  const itens = getCarrinho();

  if (!itens || !itens.length) {
    window.location.href = "carrinho.html";
    return;
  }

  const frete = JSON.parse(
    localStorage.getItem("cp_frete_selecionado")
  ) || {
    servico: "Entrega",
    valor: 0,
    prazo_dias: 0
  };

  window.__checkoutFrete = frete;
  renderResumoCheckout();

  configurarCEP();

  // ------------------------------------------------------------------
  // Reaproveita o CEP já digitado na página do carrinho, evitando que
  // o cliente precise informá-lo de novo aqui.
  // ------------------------------------------------------------------
  const cepSalvo = localStorage.getItem("cp_cep_destino");

  if (cepSalvo) {
    const cepInput = document.getElementById("cep-endereco");

    if (cepInput) {
      cepInput.value = formatarCep(cepSalvo);
      await buscarEnderecoPorCep(cepSalvo);
    }
  }
};


// ================================
// RESUMO + CUPOM DE DESCONTO
// ================================

// Cupom aplicado: { codigo, tipo, valor, valor_minimo }
let cupomCheckout = null;

function calcularDescontoCupom(subtotal) {
  if (!cupomCheckout) return 0;
  if (Number(cupomCheckout.valor_minimo) > 0 && subtotal < Number(cupomCheckout.valor_minimo)) return 0;
  const valor = Number(cupomCheckout.valor || 0);
  const desconto = cupomCheckout.tipo === "fixo" ? valor : subtotal * (valor / 100);
  return Math.round(Math.min(Math.max(0, desconto), subtotal) * 100) / 100;
}

function escaparTexto(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function renderResumoCheckout() {
  const resumo = document.getElementById("resumo-checkout");
  if (!resumo) return;

  const itens = getCarrinho();
  const frete = window.__checkoutFrete || { servico: "Entrega", valor: 0 };
  const subtotal = calcularSubtotal();
  const desconto = calcularDescontoCupom(subtotal);
  const total = subtotal - desconto + Number(frete.valor || 0);

  resumo.innerHTML = `
  <div class="cart-card">
    <h3>Resumo do Pedido</h3>

    ${itens.map(item => `
      <div style="display:flex;justify-content:space-between;gap:12px;margin:12px 0;">
        <span>${escaparTexto(item.nome || "Produto")} x${Number(item.quantidade || 1)}</span>
        <strong style="white-space:nowrap">R$ ${(Number(item.preco_unitario || 0) * Number(item.quantidade || 1)).toFixed(2)}</strong>
      </div>
    `).join("")}

    <hr>

    <div style="display:flex;justify-content:space-between;margin-top:15px;">
      <span>Subtotal</span>
      <strong>R$ ${subtotal.toFixed(2)}</strong>
    </div>

    ${desconto > 0 ? `
    <div style="display:flex;justify-content:space-between;margin-top:10px;color:var(--success);">
      <span>Cupom ${escaparTexto(cupomCheckout.codigo)}</span>
      <strong>− R$ ${desconto.toFixed(2)}</strong>
    </div>` : ""}

    <div style="display:flex;justify-content:space-between;margin-top:10px;">
      <span>${escaparTexto(frete.servico || "Entrega")}</span>
      <strong>R$ ${Number(frete.valor || 0).toFixed(2)}</strong>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:15px;font-size:20px;">
      <span>Total</span>
      <strong>R$ ${total.toFixed(2)}</strong>
    </div>

    <div class="form-group" style="margin-top:20px;margin-bottom:0">
      <label>Cupom de desconto</label>
      ${cupomCheckout ? `
        <div class="flex gap-8" style="align-items:center">
          <span style="flex:1"><strong>${escaparTexto(cupomCheckout.codigo)}</strong> aplicado</span>
          <button type="button" class="btn btn-ghost" onclick="removerCupomCheckout()">Remover</button>
        </div>` : `
        <div class="flex gap-8">
          <input type="text" id="cupom-input" class="field" placeholder="Digite seu cupom" style="text-transform:uppercase;flex:1;min-width:0" />
          <button type="button" class="btn btn-outline" id="btn-aplicar-cupom" onclick="aplicarCupomCheckout()">Aplicar</button>
        </div>`}
      <p id="cupom-checkout-msg" class="form-msg"></p>
    </div>
  </div>
  `;
}

function mostrarMsgCupomCheckout(texto, tipo) {
  const el = document.getElementById("cupom-checkout-msg");
  if (!el) return;
  el.textContent = texto;
  el.className = `form-msg ${tipo} show`;
}

// Validação no navegador é só para mostrar o desconto ao cliente;
// a API valida o cupom de novo antes de gerar o pagamento.
window.aplicarCupomCheckout = async function () {
  const input = document.getElementById("cupom-input");
  const codigo = (input?.value || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!codigo) return mostrarMsgCupomCheckout("Digite um cupom.", "error");

  const btn = document.getElementById("btn-aplicar-cupom");
  if (btn) { btn.disabled = true; btn.textContent = "..."; }

  try {
    const doc = await db.collection("cupons").doc(codigo).get();
    const c = doc.exists ? doc.data() : null;
    const subtotal = calcularSubtotal();
    let erro = null;

    if (!c) erro = "Cupom inválido.";
    else if (c.ativo === false) erro = "Este cupom não está mais ativo.";
    else if (c.validade?.toDate && c.validade.toDate() < new Date()) erro = "Este cupom expirou.";
    else if (Number(c.usos_max) > 0 && Number(c.usos || 0) >= Number(c.usos_max)) erro = "Este cupom atingiu o limite de usos.";
    else if (Number(c.valor_minimo) > 0 && subtotal < Number(c.valor_minimo)) erro = `Compra mínima de R$ ${Number(c.valor_minimo).toFixed(2)} para este cupom.`;

    if (erro) {
      if (btn) { btn.disabled = false; btn.textContent = "Aplicar"; }
      return mostrarMsgCupomCheckout(erro, "error");
    }

    cupomCheckout = { codigo, tipo: c.tipo, valor: Number(c.valor), valor_minimo: Number(c.valor_minimo || 0) };
    renderResumoCheckout();
    mostrarMsgCupomCheckout("Cupom aplicado!", "success");
  } catch (error) {
    console.error("Erro cupom:", error);
    if (btn) { btn.disabled = false; btn.textContent = "Aplicar"; }
    mostrarMsgCupomCheckout("Não foi possível validar o cupom agora.", "error");
  }
};

window.removerCupomCheckout = function () {
  cupomCheckout = null;
  renderResumoCheckout();
};


// ================================
// FORMATAÇÃO / BUSCA DE CEP
// ================================

function formatarCep(cep) {
  const digits = String(cep).replace(/\D/g, "");
  return digits.length === 8
    ? digits.replace(/(\d{5})(\d{3})/, "$1-$2")
    : cep;
}

async function buscarEnderecoPorCep(cep) {
  const digits = String(cep).replace(/\D/g, "");

  if (digits.length !== 8) return;

  try {
    const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await resp.json();

    if (data.erro) return;

    document.getElementById("logradouro").value = data.logradouro || "";
    document.getElementById("bairro").value = data.bairro || "";
    document.getElementById("cidade").value = data.localidade || "";
    document.getElementById("uf").value = data.uf || "";
  } catch (error) {
    console.error("Erro CEP:", error);
  }
}

function configurarCEP() {
  const cepInput = document.getElementById("cep-endereco");

  if (!cepInput) return;

  cepInput.addEventListener("blur", () => {
    buscarEnderecoPorCep(cepInput.value);
  });
}


// "5511999998888" -> "(11) 99999-8888"
function formatarWhatsapp(numero) {
  const d = String(numero).replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return numero;
}


// ================================
// FINALIZAR PEDIDO
// ================================

window.finalizarPedido = async function (event) {
  event.preventDefault();

  // Alerta: a página da InfinitePay sempre mostra a opção de cartão,
  // então avisamos antes de redirecionar.
  const aceitouPix = confirm(
    "⚠️ ATENÇÃO: aceitamos SOMENTE pagamento via PIX.\n\n" +
    "Na próxima tela, escolha a opção PIX.\n" +
    "Caso o pagamento seja feito via cartão de crédito, o pedido será CANCELADO.\n\n" +
    "Dúvidas? Entre em contato pelo nosso WhatsApp" +
    (window.APP_CONFIG?.WHATSAPP ? `: ${formatarWhatsapp(window.APP_CONFIG.WHATSAPP)}` : ".") +
    "\n\nDeseja continuar para o pagamento via Pix?"
  );
  if (!aceitouPix) return;

  const btn = document.getElementById("btn-finalizar");
  const msgEl = document.getElementById("checkout-msg");

  btn.disabled = true;
  btn.textContent = "Processando...";

  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    const endereco = {
      cep: document.getElementById("cep-endereco").value.replace(/\D/g, ""),
      logradouro: document.getElementById("logradouro").value,
      numero: document.getElementById("numero").value,
      complemento: document.getElementById("complemento").value,
      bairro: document.getElementById("bairro").value,
      cidade: document.getElementById("cidade").value,
      uf: document.getElementById("uf").value
    };

    const itens = getCarrinho();

    const frete = JSON.parse(
      localStorage.getItem("cp_frete_selecionado")
    ) || {
      servico: "Entrega",
      valor: 0,
      prazo_dias: 0
    };

    const subtotal = calcularSubtotal();
    const desconto = calcularDescontoCupom(subtotal);
    const total = subtotal - desconto + Number(frete.valor || 0);

    // Aviso de consistência: se o CEP final for diferente do usado no
    // cálculo de frete, o valor do frete pode não corresponder mais.
    const cepFreteCalculado = localStorage.getItem("cp_cep_destino");
    if (cepFreteCalculado && cepFreteCalculado !== endereco.cep) {
      const confirmar = confirm(
        "O frete foi calculado para um CEP diferente do informado agora. Deseja continuar mesmo assim? (recomendado voltar ao carrinho e recalcular)"
      );
      if (!confirmar) {
        btn.disabled = false;
        btn.textContent = "Pagar com Pix";
        return;
      }
    }

    const pedidoRef = db.collection("pedidos").doc();

    await pedidoRef.set({
      user_id: user.uid,
      endereco,
      itens,
      subtotal,
      desconto,
      cupom: cupomCheckout ? { codigo: cupomCheckout.codigo } : null,
      valor_frete: Number(frete.valor || 0),
      total,
      metodo_envio: frete.servico,
      status: "aguardando_pagamento",
      pagamento: {
        status: "pendente",
        valor: total
      },
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    const resp = await fetch(
      `${window.APP_CONFIG.FUNCTIONS_URL}/infinitypay-checkout`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pedidoRef.id,
          itens,
          total,
          frete,
          cupom: cupomCheckout ? cupomCheckout.codigo : null
        })
      }
    );

    const resultado = await resp.json();

    if (!resp.ok || resultado.error) {
      throw new Error(resultado.error || "Erro ao gerar pagamento.");
    }

    localStorage.removeItem("cp_frete_selecionado");
    localStorage.removeItem("cp_cep_destino");

    limparCarrinho();

    window.location.href =
      resultado.checkout_url || resultado.url || resultado.link;

  } catch (error) {
    console.error("Erro checkout:", error);

    msgEl.textContent = error.message;
    msgEl.className = "form-msg error show";

    btn.disabled = false;
    btn.textContent = "Pagar com Pix";
  }
};