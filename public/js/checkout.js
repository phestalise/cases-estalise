// js/checkout.js
async function initCheckout() {
  const user = await exigirLogin("checkout.html");
  if (!user) return;

  const itens = getCarrinho();
  if (!itens.length) {
    window.location.href = "carrinho.html";
    return;
  }

  const frete = JSON.parse(localStorage.getItem("cp_frete_selecionado") || "null");
  const cep = localStorage.getItem("cp_cep_destino") || "";

  if (!frete) {
    alert("Selecione uma opção de frete no carrinho antes de continuar.");
    window.location.href = "carrinho.html";
    return;
  }

  document.getElementById("cep-endereco").value = formatarCEP(cep);

  const subtotal = calcularSubtotal();
  const total = subtotal + frete.valor;

  document.getElementById("resumo-checkout").innerHTML = `
    <div class="summary-box">
      <h3 style="margin-bottom:20px">Resumo do pedido</h3>
      ${itens.map((i) => `
        <div class="summary-row">
          <span>${i.quantidade}x ${i.nome}${i.is_personalizado ? " (personalizado)" : ""}</span>
          <span>${formatarMoeda(i.preco_unitario * i.quantidade)}</span>
        </div>
      `).join("")}
      <div class="summary-row"><span>Frete (${frete.servico})</span><span>${formatarMoeda(frete.valor)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${formatarMoeda(total)}</span></div>
    </div>
  `;
}

function formatarCEP(cep) {
  return (cep || "").replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2");
}

async function finalizarPedido(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-finalizar");
  const msgEl = document.getElementById("checkout-msg");
  btn.disabled = true;
  btn.textContent = "Processando...";

  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const endereco = {
      cep: document.getElementById("cep-endereco").value.replace(/\D/g, ""),
      logradouro: document.getElementById("logradouro").value,
      numero: document.getElementById("numero").value,
      complemento: document.getElementById("complemento").value,
      bairro: document.getElementById("bairro").value,
      cidade: document.getElementById("cidade").value,
      uf: document.getElementById("uf").value,
    };

    const itens = getCarrinho();
    const frete = JSON.parse(localStorage.getItem("cp_frete_selecionado"));
    const subtotal = calcularSubtotal();
    const total = subtotal + frete.valor;

    // Converte os itens do carrinho para o formato que será salvo no Firestore
    const itensSalvos = itens.map(i => ({
      produto_id: i.produto_id,
      nome: i.nome,
      tipo: i.tipo,
      imagem_url: i.imagem_url || "",
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      is_personalizado: i.is_personalizado,
      personalizacao: i.is_personalizado ? {
        texto_personalizado: i.texto_personalizado,
        cor: i.cor
      } : null
    }));

    // Cria o documento do pedido
    const pedidoRef = await db.collection("pedidos").add({
      user_id: user.uid,
      endereco,
      itens: itensSalvos,
      subtotal,
      valor_frete: frete.valor,
      total,
      metodo_envio: frete.servico,
      status: "aguardando_pagamento",
      codigo_rastreio: "",
      pagamento: {
        status: "pendente",
        metodo: "",
        valor: total
      },
      frete: {
        servico: frete.servico,
        valor: frete.valor,
        prazo_dias: frete.prazo_dias
      },
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Chama a Cloud Function que gera o link de pagamento na InfinityPay
    const token = await user.getIdToken();
    const resp = await fetch(`${window.APP_CONFIG.FUNCTIONS_URL}/infinitypay-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ pedido_id: pedidoRef.id }),
    });

    const resultado = await resp.json();
    if (!resp.ok || resultado.error) throw new Error(resultado.error || "Erro ao gerar pagamento");

    // Limpa carrinho local e redireciona para o checkout da InfinityPay
    limparCarrinho();
    localStorage.removeItem("cp_frete_selecionado");
    localStorage.removeItem("cp_cep_destino");

    window.location.href = resultado.checkout_url;
  } catch (e) {
    console.error(e);
    msgEl.textContent = "Não foi possível finalizar o pedido. Tente novamente.";
    msgEl.className = "form-msg error show";
    btn.disabled = false;
    btn.textContent = "Ir para pagamento";
  }
}