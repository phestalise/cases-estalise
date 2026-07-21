// js/layout.js
async function renderLayout(paginaAtiva) {
  const headerEl = document.getElementById("site-header");
  const footerEl = document.getElementById("site-footer");

  let logoUrl = "assets/ESTALISE.png";
  let nomeMarca = "Cases Estalise";

  try {
    const doc = await db.collection("configuracoes_loja").doc("global").get();
    if (doc.exists) {
      const data = doc.data();
      logoUrl = data.logo_url || logoUrl;
      nomeMarca = data.nome_marca || nomeMarca;
    }
  } catch (e) {
    console.warn("Não foi possível carregar configurações da loja:", e);
  }

  const user = await getCurrentUser();
  const logado = !!user;

  if (headerEl) {
    headerEl.innerHTML = `
      <div class="header-inner">
        <a href="index.html" class="brand">
          <img src="${logoUrl}" alt="${nomeMarca}" />
          <span>${nomeMarca}</span>
        </a>
        <nav class="nav-links">
          <a href="index.html" class="${paginaAtiva === "home" ? "active" : ""}">Início</a>
          <a href="cases.html" class="${paginaAtiva === "cases" ? "active" : ""}">Ver Cases</a>
          <a href="cases.html?tipo=pasta" class="${paginaAtiva === "pastas" ? "active" : ""}">Pastas</a>
        </nav>
        <div class="header-actions">
          <a href="${logado ? "conta.html" : "login.html"}" class="icon-btn" title="${logado ? "Minha conta" : "Entrar"}">👤</a>
          <a href="carrinho.html" class="icon-btn" title="Carrinho">
            🛒
            <span id="cart-badge" class="cart-badge">0</span>
          </a>
        </div>
      </div>
    `;
  }

  if (footerEl) {
    footerEl.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <strong style="color:var(--white)">${nomeMarca}</strong>
            <p>Cases e pastas personalizadas, feitas para durar.</p>
          </div>
          <div>
            <p>Envio para todo o Brasil via PAC e SEDEX (SuperFrete).</p>
            <p>Pagamento seguro via InfinityPay.</p>
          </div>
        </div>
        <hr class="stitch" style="margin:24px 0" />
        <p>&copy; ${new Date().getFullYear()} ${nomeMarca}. Todos os direitos reservados.</p>
      </div>
    `;
  }

  atualizarBadgeCarrinho();
}