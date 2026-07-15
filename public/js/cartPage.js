let freteSelecionado = null;

function renderizarCarrinho() {
  const itens = getCarrinho();
  const listaEl = document.getElementById("lista-carrinho");
  const resumoEl = document.getElementById("resumo-carrinho");

  if (!itens.length) {
    listaEl.innerHTML = `<div class="empty-state">Seu carrinho está vazio. <br><a href="cases.html" class="btn btn-outline" style="margin-top:16px">Ver produtos</a></div>`;
    resumoEl.innerHTML = "";
    return;
  }

  listaEl.innerHTML = itens
    .map(
      (item) => `
    <div class="cart-item">
      <div class="thumb-sm">${item.imagem_url ? `<img src="${item.imagem_url}" style="width:100%;height:100%;object-fit:cover">` : ""}</div>
      <div>
        <strong>${item.nome}</strong>
        <div class="meta">
          ${item.is_personalizado ? `Personalizado · ${item.cor} · "${item.texto_personalizado}"` : "Padrão, sem personalização"}
        </div>
        <div class="meta">${formatarMoeda(item.preco_unitario)} un.</div>
        <div class="qty-control" style="margin-top:8px">
          <button onclick="mudarQtd('${item.id_temp}', -1)">−</button>
          <span>${item.quantidade}</span>
          <button onclick="mudarQtd('${item.id_temp}', 1)">+</button>
        </div>
        <button class="remove" onclick="removerItem('${item.id_temp}')">Remover</button>
      </div>
      <div><strong>${formatarMoeda(item.preco_unitario * item.quantidade)}</strong></div>
    </div>
  `
    )
    .join("");

  const subtotal = calcularSubtotal();

  resumoEl.innerHTML = `
    <div class="summary-box">
      <h3 style="margin-bottom:20px">Resumo</h3>

      <div class="option-group">
        <label class="title">Calcular frete</label>
        <div class="flex gap-8">
          <input type="text" id="input-cep" class="field" placeholder="00000-000" maxlength="9" />
          <button class="btn btn-outline" onclick="calcularFrete()">Calcular</button>
        </div>
        <div id="opcoes-frete" class="shipping-options"></div>
      </div>

      <div class="summary-row"><span>Subtotal</span><span>${formatarMoeda(subtotal)}</span></div>
      <div class="summary-row"><span>Frete</span><span id="valor-frete-label">${freteSelecionado ? formatarMoeda(freteSelecionado.valor) : "A calcular"}</span></div>
      <div class="summary-row total"><span>Total</span><span id="valor-total-label">${formatarMoeda(subtotal + (freteSelecionado?.valor || 0))}</span></div>

      <button class="btn btn-primary btn-block" style="margin-top:20px" onclick="irParaCheckout()">Finalizar compra</button>
    </div>
  `;
}

function mudarQtd(idTemp, delta) {
  const item = getCarrinho().find((i) => i.id_temp === idTemp);
  if (item) atualizarQuantidade(idTemp, item.quantidade + delta);
  renderizarCarrinho();
}

function removerItem(idTemp) {
  removerDoCarrinho(idTemp);
  renderizarCarrinho();
}

async function calcularFrete() {
  const cep = document.getElementById("input-cep").value;
  const opcoesEl = document.getElementById("opcoes-frete");

  if (!/^\d{5}-?\d{3}$/.test(cep)) {
    opcoesEl.innerHTML = `<p class="form-error" style="display:block">CEP inválido.</p>`;
    return;
  }

  opcoesEl.innerHTML = `<p style="color:var(--gray);font-size:13px">Calculando...</p>`;

  const itens = getCarrinho().map((i) => ({
    tipo: i.tipo,
    quantidade: i.quantidade,
    valor_unitario: i.preco_unitario,
  }));

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const resp = await fetch(`${window.APP_CONFIG.SUPABASE_URL}/functions/v1/superfrete-calc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session?.access_token || window.APP_CONFIG.SUPABASE_ANON_KEY}`,
        apikey: window.APP_CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ cep_destino: cep, itens }),
    });

    const resultado = await resp.json();

    if (!resp.ok || resultado.error) {
      opcoesEl.innerHTML = `<p class="form-error" style="display:block">Não foi possível calcular o frete agora.</p>`;
      return;
    }

    localStorage.setItem("cp_cep_destino", cep);

    opcoesEl.innerHTML = resultado.opcoes
      .map(
        (op, idx) => `
      <div class="shipping-opt" id="frete-opt-${idx}" onclick="selecionarFrete(${idx}, ${JSON.stringify(resultado.opcoes).replace(/"/g, "&quot;")})">
        <span>${op.servico} · ${op.prazo_dias} dias úteis</span>
        <strong>${formatarMoeda(op.valor)}</strong>
      </div>
    `
      )
      .join("");
  } catch (e) {
    console.error(e);
    opcoesEl.innerHTML = `<p class="form-error" style="display:block">Erro ao calcular o frete.</p>`;
  }
}

function selecionarFrete(idx, opcoes) {
  freteSelecionado = opcoes[idx];
  localStorage.setItem("cp_frete_selecionado", JSON.stringify(freteSelecionado));

  document.querySelectorAll(".shipping-opt").forEach((el, i) => el.classList.toggle("selected", i === idx));

  const subtotal = calcularSubtotal();
  document.getElementById("valor-frete-label").textContent = formatarMoeda(freteSelecionado.valor);
  document.getElementById("valor-total-label").textContent = formatarMoeda(subtotal + freteSelecionado.valor);
}

async function irParaCheckout() {
  const sessao = await getSessaoAtual();
  if (!sessao) {
    window.location.href = "login.html?redirect=carrinho.html";
    return;
  }
  if (!freteSelecionado) {
    alert("Calcule e selecione uma opção de frete antes de continuar.");
    return;
  }
  window.location.href = "checkout.html";
}
