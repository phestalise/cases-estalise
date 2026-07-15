// js/productDetail.js
let produtoAtual = null;
let estado = {
  personalizado: false,
  cor: "preto",
  texto: "",
  quantidade: 1,
};

async function carregarDetalheProduto() {
  const id = new URLSearchParams(location.search).get("id");
  const container = document.getElementById("produto-container");
  if (!id) {
    container.innerHTML = `<p class="empty-state">Produto não encontrado.</p>`;
    return;
  }

  try {
    const doc = await db.collection("produtos").doc(id).get();
    if (!doc.exists) {
      container.innerHTML = `<p class="empty-state">Produto não encontrado.</p>`;
      return;
    }
    produtoAtual = { id: doc.id, ...doc.data() };
    renderizarDetalhe();
  } catch (error) {
    console.error(error);
    container.innerHTML = `<p class="empty-state">Erro ao carregar produto.</p>`;
  }
}

function renderizarDetalhe() {
  const p = produtoAtual;
  const tipoLabel = p.tipo === "case" ? "Case" : "Pasta";

  document.title = `${p.nome} — Sua Marca`;

  document.getElementById("produto-container").innerHTML = `
    <div class="gallery">
      ${p.imagem_url ? `<img src="${p.imagem_url}" alt="${p.nome}" />` : `<span>${tipoLabel}</span>`}
    </div>
    <div class="detail-info">
      <span class="tag">${tipoLabel}</span>
      <h1>${p.nome}</h1>
      <div class="price" id="preco-dinamico">${formatarMoeda(p.preco_padrao)}</div>
      <p class="desc">${p.descricao || ""}</p>

      ${p.permite_personalizacao ? `
      <div class="option-group">
        <label class="title">Personalização</label>
        <div class="toggle-row">
          <div class="toggle-opt selected" id="opt-padrao" onclick="selecionarPersonalizacao(false)">
            Sem personalização<br><small>${formatarMoeda(p.preco_padrao)}</small>
          </div>
          <div class="toggle-opt" id="opt-personalizado" onclick="selecionarPersonalizacao(true)">
            Personalizar<br><small>${formatarMoeda(p.preco_personalizado)}</small>
          </div>
        </div>
      </div>

      <div class="option-group hidden" id="campos-personalizacao">
        <label class="title">Nome ou texto personalizado</label>
        <input type="text" class="field" id="texto-personalizado" maxlength="30" placeholder="Ex: João Silva" oninput="estado.texto = this.value" />

        <label class="title" style="margin-top:20px">Cor</label>
        <div class="color-row">
          <div class="color-item">
            <div class="color-swatch selected" data-color="preto" onclick="selecionarCor('preto')"></div>
            <div class="color-label">Preto</div>
          </div>
          <div class="color-item">
            <div class="color-swatch" data-color="marrom" onclick="selecionarCor('marrom')"></div>
            <div class="color-label">Marrom</div>
          </div>
          <div class="color-item">
            <div class="color-swatch" data-color="quadriculado" onclick="selecionarCor('quadriculado')"></div>
            <div class="color-label">Quadriculado</div>
          </div>
        </div>
      </div>
      ` : ""}

      <div class="qty-row" style="margin-top:28px">
        <label class="title" style="margin:0">Quantidade</label>
        <div class="qty-control">
          <button onclick="alterarQtd(-1)">−</button>
          <span id="qtd-label">1</span>
          <button onclick="alterarQtd(1)">+</button>
        </div>
      </div>

      <button class="btn btn-primary btn-block" onclick="handleAdicionarCarrinho()">Adicionar ao carrinho</button>
      <p id="erro-personalizacao" class="form-error" style="margin-top:12px"></p>
    </div>
  `;
}

// ... (funções selecionarPersonalizacao, selecionarCor, alterarQtd, handleAdicionarCarrinho PERMANECEM IDÊNTICAS) ...