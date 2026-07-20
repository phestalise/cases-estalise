// js/cartPage.js
// Depende de: cart.js (getCarrinho, salvarCarrinho, calcularSubtotal, calcularFreteCarrinho)

const PLACEHOLDER_CART = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23f0f0f0"/><text x="50%25" y="55%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="14">📷</text></svg>';

let freteSelecionado = null;

function renderizarCarrinho() {
  const itens = getCarrinho();
  const listaEl = document.getElementById("lista-carrinho");
  const resumoEl = document.getElementById("resumo-carrinho");

  if (itens.length === 0) {
    listaEl.innerHTML = `<p class="empty-state">Seu carrinho está vazio.</p>`;
    resumoEl.innerHTML = "";
    return;
  }

  listaEl.innerHTML = itens.map((item) => `
    <div class="cart-item" data-id="${item.id_temp}">
      <div class="cart-item-thumb">
        <img src="${item.imagem_url || PLACEHOLDER_CART}" alt="${item.nome || 'Produto'}" />
      </div>
      <div class="cart-item-info">
        <strong>${item.nome || "Produto"}</strong>
        ${item.is_personalizado ? `<span class="cart-item-meta">Cor: ${item.cor} — "${item.texto_personalizado}"</span>` : ""}
        <span class="cart-item-price">R$ ${Number(item.preco_unitario || 0).toFixed(2)}</span>
      </div>
      <div class="cart-item-qtd">
        <button onclick="alterarQtd('${item.id_temp}', -1)">−</button>
        <span>${item.quantidade}</span>
        <button onclick="alterarQtd('${item.id_temp}', 1)">+</button>
      </div>
      <button class="cart-item-remove" onclick="removerItem('${item.id_temp}')">Remover</button>
    </div>
  `).join("");

  resumoEl.innerHTML = `
    <div class="resumo-box">
      <p class="resumo-subtotal">Subtotal: <strong>R$ ${calcularSubtotal().toFixed(2)}</strong></p>

      <label for="cep-input">CEP de entrega</label>
      <div class="cep-row">
        <input type="text" id="cep-input" placeholder="00000-000" maxlength="9" />
        <button id="btn-calcular-frete" class="btn btn-secondary">Calcular</button>
      </div>

      <div id="opcoes-frete" class="opcoes-frete"></div>

      <p id="total-final" class="resumo-total" style="display:none;">
        Total: <strong id="total-final-valor"></strong>
      </p>

      <button id="btn-finalizar" class="btn btn-primary btn-block" style="display:none;" onclick="irParaCheckout()">
        Finalizar compra
      </button>
    </div>
  `;

  document.getElementById("btn-calcular-frete").addEventListener("click", onCalcularFrete);
}

function alterarQtd(idTemp, delta) {
  const itens = getCarrinho();
  const item = itens.find((i) => i.id_temp === idTemp);
  if (item) atualizarQuantidade(idTemp, item.quantidade + delta);
  renderizarCarrinho();
}

function removerItem(idTemp) {
  removerDoCarrinho(idTemp);
  renderizarCarrinho();
}

async function onCalcularFrete() {
  const cepInput = document.getElementById("cep-input");
  const cep = cepInput.value.replace(/\D/g, "");

  if (cep.length !== 8) {
    alert("Digite um CEP válido (8 dígitos).");
    return;
  }

  const btn = document.getElementById("btn-calcular-frete");
  btn.disabled = true;
  btn.textContent = "Calculando...";

  const resultado = await calcularFreteCarrinho(cep);

  btn.disabled = false;
  btn.textContent = "Calcular";

  const opcoesEl = document.getElementById("opcoes-frete");

  if (!resultado || !resultado.opcoes || resultado.opcoes.length === 0) {
    opcoesEl.innerHTML = `<p class="empty-state">Nenhuma opção de frete encontrada para este CEP.</p>`;
    return;
  }

  opcoesEl.innerHTML = resultado.opcoes.map((op, idx) => `
    <label class="frete-opcao">
      <input type="radio" name="frete" value="${idx}"
        onchange='selecionarFrete(${JSON.stringify(op)})' />
      <span>${op.nome} — R$ ${Number(op.preco).toFixed(2)} — ${op.prazo_dias} dia(s)</span>
    </label>
  `).join("");
}

function selecionarFrete(opcao) {
  freteSelecionado = opcao;
  const subtotal = calcularSubtotal();
  const total = subtotal + Number(opcao.preco);

  document.getElementById("total-final").style.display = "block";
  document.getElementById("total-final-valor").textContent = `R$ ${total.toFixed(2)}`;
  document.getElementById("btn-finalizar").style.display = "inline-block";
}

function irParaCheckout() {
  if (!freteSelecionado) {
    alert("Selecione uma opção de frete antes de continuar.");
    return;
  }
  const cepInput = document.getElementById("cep-input");
  const cep = cepInput ? cepInput.value.replace(/\D/g, "") : "";

  // checkout.js espera { servico, valor, prazo_dias } — normaliza os nomes
  // que vêm da API de frete (nome/preco) antes de salvar.
  const freteParaCheckout = {
    servico: freteSelecionado.nome,
    valor: Number(freteSelecionado.preco),
    prazo_dias: freteSelecionado.prazo_dias,
  };

  localStorage.setItem("cp_frete_selecionado", JSON.stringify(freteParaCheckout));
  localStorage.setItem("cp_cep_destino", cep);
  window.location.href = "checkout.html";
}