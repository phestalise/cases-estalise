// js/products.js

// Placeholder SVG para o card (tamanho menor)
const PLACEHOLDER_CARD = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f0f0f0"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="24">📷</text></svg>';

function cardProdutoHTML(produto) {
  const tipoLabel = produto.tipo === "case" ? "Case" : "Pasta";
  
  // --- ALTERADO AQUI: usa imagem_base64, depois imagem_url, depois placeholder ---
  const imagem = produto.imagem_base64 || produto.imagem_url
    ? `<img src="${produto.imagem_base64 || produto.imagem_url}" alt="${produto.nome}" />`
    : `<img src="${PLACEHOLDER_CARD}" alt="${tipoLabel}" />`;

  return `
    <a href="produto.html?id=${produto.id}" class="product-card">
      <div class="thumb">${imagem}</div>
      <div class="info">
        <span class="tag">${tipoLabel}</span>
        <h3>${produto.nome}</h3>
        <div class="price">
          ${formatarMoeda(produto.preco_padrao)}
          <small>a partir de · personalizado ${formatarMoeda(produto.preco_personalizado)}</small>
        </div>
      </div>
    </a>
  `;
}

async function carregarDestaques() {
  const container = document.getElementById("destaques");
  if (!container) return;

  try {
    const snapshot = await db.collection("produtos").where("ativo", "==", true).limit(4).get();
    const produtos = [];
    snapshot.forEach(doc => produtos.push({ id: doc.id, ...doc.data() }));
    container.innerHTML = produtos.map(cardProdutoHTML).join("") || `<p class="empty-state">Nenhum produto cadastrado ainda.</p>`;
  } catch (error) {
    console.error(error);
    container.innerHTML = `<p class="empty-state">Não foi possível carregar os produtos.</p>`;
  }
}

async function carregarCatalogo() {
  const container = document.getElementById("catalogo");
  if (!container) return;

  const params = new URLSearchParams(location.search);
  const tipoFiltro = params.get("tipo"); // 'case' | 'pasta' | null

  let query = db.collection("produtos").where("ativo", "==", true);
  if (tipoFiltro) query = query.where("tipo", "==", tipoFiltro);

  try {
    const snapshot = await query.get();
    const produtos = [];
    snapshot.forEach(doc => produtos.push({ id: doc.id, ...doc.data() }));
    container.innerHTML = produtos.map(cardProdutoHTML).join("") || `<p class="empty-state">Nenhum produto encontrado.</p>`;

    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.tipo === (tipoFiltro || "todos"));
    });
  } catch (error) {
    console.error(error);
    container.innerHTML = `<p class="empty-state">Erro ao carregar produtos.</p>`;
  }
}

function aplicarFiltro(tipo) {
  const url = new URL(location.href);
  if (tipo === "todos") url.searchParams.delete("tipo");
  else url.searchParams.set("tipo", tipo);
  location.href = url.toString();
}