// js/layout.js
async function renderLayout(paginaAtiva) {
  renderWhatsappFlutuante();
  aplicarTemaBlackFriday();
  iniciarEfeitos();

  let logoUrl = "assets/ESTALISE.png";
  let nomeMarca = "Cases Estalise";
  let logado = false;
  const repintar = () => pintarLayout(paginaAtiva, logoUrl, nomeMarca, logado);

  // Login e configurações da loja são buscados SEPARADAMENTE: o header
  // atualiza assim que o login é confirmado, sem esperar o Firestore
  // (antes, um Firestore lento deixava o ícone apontando para "Entrar"
  // mesmo com o cliente logado).
  const promUsuario = getCurrentUser()
    .then(user => { logado = !!user; repintar(); })
    .catch(() => {});

  const promConfig = db.collection("configuracoes_loja").doc("global").get()
    .then(doc => {
      const config = doc.exists ? doc.data() : null;
      if (config) {
        logoUrl = config.logo_url || logoUrl;
        nomeMarca = config.nome_marca || nomeMarca;
      }
      repintar();
    })
    .catch(e => console.warn("Não foi possível carregar configurações da loja:", e));

  // Na intro a cortina cobre a tela: espera um pouco (até 900 ms) para o
  // header já nascer com os dados certos e a animação não reiniciar.
  if (document.documentElement.classList.contains("intro")) {
    await Promise.race([
      Promise.all([promUsuario, promConfig]),
      new Promise(r => setTimeout(r, 900))
    ]);
  }

  repintar();
}

let assinaturaLayout = null;

function pintarLayout(paginaAtiva, logoUrl, nomeMarca, logado) {
  const headerEl = document.getElementById("site-header");
  const footerEl = document.getElementById("site-footer");

  // Não redesenha se nada mudou; se for uma repintura, não reanima.
  const assinatura = [paginaAtiva, logoUrl, nomeMarca, logado].join("|");
  if (assinatura === assinaturaLayout) return;
  if (assinaturaLayout !== null) {
    headerEl?.classList.add("sem-intro");
    footerEl?.classList.add("sem-intro");
  }
  assinaturaLayout = assinatura;

  if (headerEl) {
    headerEl.classList.add("site-header");
    headerEl.innerHTML = `
      ${faixaBlackFridayHTML()}
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
          <a href="${logado ? "conta.html" : "login.html"}" class="icon-btn" title="${logado ? "Minha conta" : "Entrar"}" aria-label="${logado ? "Minha conta" : "Entrar"}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>
          </a>
          <a href="carrinho.html" class="icon-btn" title="Carrinho" aria-label="Carrinho">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
            <span id="cart-badge" class="cart-badge">0</span>
          </a>
        </div>
      </div>
    `;
  }

  if (footerEl) {
    const numeroWhats = String(window.APP_CONFIG?.WHATSAPP || "").replace(/\D/g, "");
    const whatsFormatado = numeroWhats.replace(/^55/, "").replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3");
    footerEl.innerHTML = `
      <div class="container">
        <div class="footer-cols">
          <div class="footer-brand">
            <img src="${logoUrl}" alt="${nomeMarca}" />
            <p>Cases e pastas personalizadas, feitas à mão para acompanhar seu dia a dia com estilo e resistência.</p>
          </div>
          <div>
            <h4>Loja</h4>
            <p><a href="cases.html">Cases</a></p>
            <p><a href="cases.html?tipo=pasta">Pastas</a></p>
            <p><a href="${logado ? "conta.html" : "login.html"}">${logado ? "Meus pedidos" : "Entrar"}</a></p>
            <p><a href="carrinho.html">Carrinho</a></p>
          </div>
          <div>
            <h4>Atendimento</h4>
            ${numeroWhats ? `<p><a href="https://wa.me/${numeroWhats}" target="_blank" rel="noopener">WhatsApp · ${whatsFormatado}</a></p>` : ""}
            <p>Envio para todo o Brasil via PAC e SEDEX.</p>
            <div class="pay-badges"><span>⚡ Pix</span><span>💳 Cartão</span><span>🔒 Pagamento seguro</span></div>
          </div>
        </div>
        <hr class="stitch" style="margin:24px 0" />
        <div class="footer-bottom">
          <p>&copy; ${new Date().getFullYear()} ${nomeMarca}. Todos os direitos reservados.</p>
          <p>Feito à mão no Brasil</p>
        </div>
      </div>
    `;
  }

  atualizarBadgeCarrinho();
  observarBadgeCarrinho();
}

// =========================================================
// BOTÃO FLUTUANTE DO WHATSAPP (todas as páginas da loja)
// =========================================================
function renderWhatsappFlutuante() {
  const numero = String(window.APP_CONFIG?.WHATSAPP || "").replace(/\D/g, "");
  if (!numero || document.getElementById("whatsapp-flutuante")) return;

  const link = document.createElement("a");
  link.id = "whatsapp-flutuante";
  link.className = "whatsapp-float";
  link.href = `https://wa.me/${numero}?text=${encodeURIComponent("Olá! Vim pelo site da Estalise e tenho uma dúvida.")}`;
  link.target = "_blank";
  link.rel = "noopener";
  link.setAttribute("aria-label", "Fale conosco pelo WhatsApp");
  link.title = "Fale conosco pelo WhatsApp";
  link.innerHTML = `
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" fill="#fff">
      <path d="M16.004 3C8.825 3 3 8.82 3 15.996c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.71a13 13 0 0 0 6.32 1.62h.005C23.18 28.91 29 23.09 29 15.91 29 8.82 23.18 3 16.004 3Zm0 23.73h-.004a10.8 10.8 0 0 1-5.5-1.5l-.4-.24-3.96 1.02 1.06-3.86-.26-.4a10.75 10.75 0 0 1-1.65-5.75c0-5.95 4.85-10.8 10.8-10.8 5.95 0 10.79 4.85 10.79 10.72 0 5.96-4.84 10.81-10.88 10.81Zm5.92-8.09c-.32-.16-1.92-.95-2.22-1.06-.3-.11-.51-.16-.73.16-.21.32-.84 1.06-1.03 1.27-.19.22-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.6-.96-.85-1.6-1.9-1.8-2.22-.19-.32-.02-.5.14-.66.15-.14.32-.38.49-.57.16-.19.21-.32.32-.54.11-.22.05-.41-.03-.57-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.55-.73-.56h-.62c-.22 0-.57.08-.86.4-.3.32-1.13 1.1-1.13 2.69s1.16 3.12 1.32 3.34c.16.21 2.28 3.48 5.52 4.88.77.33 1.37.53 1.84.68.77.25 1.48.21 2.03.13.62-.09 1.92-.79 2.19-1.54.27-.76.27-1.4.19-1.54-.08-.14-.3-.22-.62-.38Z"/>
    </svg>`;
  document.body.appendChild(link);
}

// =========================================================
// EFEITOS DE INTERFACE
// - header que encolhe ao rolar
// - elementos que surgem ao entrar na tela (inclusive os
//   carregados depois via JS, como os cards de produto)
// - botão "voltar ao topo"
// =========================================================
const REVEAL_SELETORES = [
  ".section-head", ".product-card", ".step", ".trust-item",
  ".footer-cols > div"
].join(",");

let efeitosIniciados = false;

function iniciarEfeitos() {
  if (efeitosIniciados) return;
  efeitosIniciados = true;

  // Header ao rolar + botão topo
  const botaoTopo = document.createElement("button");
  botaoTopo.className = "to-top";
  botaoTopo.type = "button";
  botaoTopo.setAttribute("aria-label", "Voltar ao topo");
  botaoTopo.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>`;
  botaoTopo.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(botaoTopo);

  let agendado = false;
  const aoRolar = () => {
    agendado = false;
    const y = window.scrollY;
    document.getElementById("site-header")?.classList.toggle("scrolled", y > 20);
    botaoTopo.classList.toggle("show", y > 600);
  };
  window.addEventListener("scroll", () => {
    if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); }
  }, { passive: true });
  aoRolar();

  if (document.documentElement.classList.contains("intro")) {
    dividirTituloHero();
    // A contagem começa quando a página está pronta (e não no carregamento),
    // para a intro não ser cortada em conexões lentas.
    setTimeout(() => window.finalizarIntro?.(), 3600);
  }

  // Revelar ao rolar
  const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduzMovimento || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add("in");
      observer.unobserve(entrada.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  const aplicar = (raiz) => {
    const elementos = [];
    if (raiz.matches?.(REVEAL_SELETORES)) elementos.push(raiz);
    raiz.querySelectorAll?.(REVEAL_SELETORES).forEach((el) => elementos.push(el));

    // Efeito cascata entre irmãos (ex.: cards lado a lado)
    elementos.forEach((el) => {
      if (el.classList.contains("reveal")) return;
      const irmaos = el.parentElement ? Array.from(el.parentElement.children) : [];
      const indice = Math.max(0, irmaos.indexOf(el));
      el.style.transitionDelay = `${Math.min(indice, 6) * 80}ms`;
      el.classList.add("reveal");
      observer.observe(el);
    });
  };

  aplicar(document.body);
  new MutationObserver((mutacoes) => {
    mutacoes.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && aplicar(n)));
  }).observe(document.body, { childList: true, subtree: true });
}

// Pulinho no contador do carrinho quando o número muda
function observarBadgeCarrinho() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;
  let anterior = badge.textContent;
  new MutationObserver(() => {
    if (badge.textContent === anterior) return;
    anterior = badge.textContent;
    badge.classList.remove("bump");
    void badge.offsetWidth; // reinicia a animação
    badge.classList.add("bump");
  }).observe(badge, { childList: true, characterData: true, subtree: true });
}

// Quebra o título do hero em palavras para entrarem uma a uma na intro.
function dividirTituloHero() {
  const h1 = document.querySelector(".hero h1");
  if (!h1 || h1.classList.contains("intro-split")) return;
  let i = 0;
  const embrulhar = (conteudo) => {
    const span = document.createElement("span");
    span.className = "intro-palavra";
    span.style.setProperty("--i", i++);
    span.append(conteudo);
    return span;
  };
  Array.from(h1.childNodes).forEach((no) => {
    if (no.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      no.textContent.split(/(\s+)/).forEach((parte) => {
        if (!parte) return;
        frag.append(/^\s+$/.test(parte) ? document.createTextNode(parte) : embrulhar(parte));
      });
      no.replaceWith(frag);
    } else if (no.nodeType === Node.ELEMENT_NODE && no.tagName !== "BR") {
      no.replaceWith(embrulhar(no.cloneNode(true)));
    }
  });
  h1.classList.add("intro-split");
}

// Faixa animada da Black Friday no topo (some sozinha quando a
// promoção é desligada em APP_CONFIG.BLACK_FRIDAY.ativo)
function faixaBlackFridayHTML() {
  if (typeof blackFridayAtiva !== "function" || !blackFridayAtiva()) return "";
  const precos = window.APP_CONFIG.BLACK_FRIDAY.precos_personalizado || {};
  const fmt = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const partes = ['<strong>BLACK FRIDAY</strong>'];
  if (precos.case) partes.push(`Cases personalizadas por <strong>${fmt(precos.case)}</strong>`);
  if (precos.pasta) partes.push(`Pastas personalizadas por <strong>${fmt(precos.pasta)}</strong>`);
  partes.push("Por tempo limitado");
  const bloco = partes.map((p) => `<span>${p}</span><i>✦</i>`).join("");
  return `
    <a href="cases.html" class="bf-faixa" aria-label="Ver ofertas da Black Friday">
      <div class="bf-trilho">${bloco}${bloco}${bloco}${bloco}</div>
    </a>`;
}

// =========================================================
// TEMA BLACK FRIDAY
// Tudo é aplicado por JS: com BLACK_FRIDAY.ativo = false o site
// volta exatamente ao HTML original.
// =========================================================
function aplicarTemaBlackFriday() {
  if (typeof blackFridayAtiva !== "function" || !blackFridayAtiva()) return;
  if (document.body.dataset.bfAplicado) return;
  document.body.dataset.bfAplicado = "1";

  const cfg = window.APP_CONFIG.BLACK_FRIDAY;
  const precos = cfg.precos_personalizado || {};
  const fmt = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ---- HOME: hero
  const hero = document.querySelector(".hero");
  if (hero) {
    const h1 = hero.querySelector("h1");
    const p = hero.querySelector("p");
    if (h1) h1.innerHTML = `Black <em>Friday</em><br>na Estalise.`;
    if (p) {
      const partes = [];
      if (precos.case) partes.push(`cases personalizadas por <strong>${fmt(precos.case)}</strong>`);
      if (precos.pasta) partes.push(`pastas personalizadas por <strong>${fmt(precos.pasta)}</strong>`);
      p.innerHTML = `Nossa maior oferta do ano: ${partes.join(" e ")}. Com seu nome gravado, feitas à mão. Por tempo limitado.`;
    }
    const acoes = hero.querySelectorAll(".hero-actions .btn");
    if (acoes[0]) acoes[0].textContent = "Comprar Cases";
    if (acoes[1]) acoes[1].textContent = "Comprar Pastas";

    // Marca d'água gigante (adicionada no fim para não mexer na ordem da animação)
    const marca = document.createElement("div");
    marca.className = "bf-marca-dagua";
    marca.setAttribute("aria-hidden", "true");
    marca.textContent = "BLACK FRIDAY";
    hero.appendChild(marca);
  }

  // ---- HOME: seção de ofertas logo depois da faixa de benefícios
  const faixaBeneficios = document.querySelector(".trust-strip");
  if (faixaBeneficios && (precos.case || precos.pasta)) {
    const oferta = (tipo, titulo, img, link) => precos[tipo] ? `
      <a href="${link}" class="bf-oferta">
        <div class="bf-oferta-img"><img src="${img}" alt="${titulo}" loading="lazy" /></div>
        <div class="bf-oferta-info">
          <span class="bf-oferta-tag">Black Friday</span>
          <h3>${titulo}</h3>
          <p>Personalizadas com seu nome</p>
          <div class="bf-oferta-preco"><small>por apenas</small>${fmt(precos[tipo])}</div>
          <span class="btn btn-primary">Aproveitar</span>
        </div>
      </a>` : "";

    const secao = document.createElement("section");
    secao.className = "bf-secao";
    secao.innerHTML = `
      <div class="container">
        <div class="bf-secao-topo">
          <div>
            <span class="bf-oferta-tag">Ofertas da semana</span>
            <h2>Black Friday <em>Estalise</em></h2>
          </div>
          <div class="bf-contagem" id="bf-contagem" hidden></div>
        </div>
        <div class="bf-ofertas">
          ${oferta("case", "Cases", "assets/case-marrom.jpg", "cases.html?tipo=case")}
          ${oferta("pasta", "Pastas", "assets/pasta-bege-quadriculada.jpg", "cases.html?tipo=pasta")}
        </div>
      </div>`;
    faixaBeneficios.after(secao);
    iniciarContagemBlackFriday(cfg.fim);
  }

  // ---- CATÁLOGO: faixa acima da grade
  const catalogo = document.getElementById("catalogo");
  if (catalogo) {
    const aviso = document.createElement("div");
    aviso.className = "bf-aviso-catalogo";
    aviso.innerHTML = `<strong>Black Friday</strong> · Todos os produtos personalizados com preço especial${precos.case ? ` · Cases por ${fmt(precos.case)}` : ""}${precos.pasta ? ` · Pastas por ${fmt(precos.pasta)}` : ""}`;
    catalogo.before(aviso);
  }
}

function iniciarContagemBlackFriday(fim) {
  const el = document.getElementById("bf-contagem");
  const alvo = fim ? new Date(fim).getTime() : NaN;
  if (!el || !alvo) return;
  const pad = (n) => String(n).padStart(2, "0");
  const tick = () => {
    const resta = alvo - Date.now();
    if (resta <= 0) { el.hidden = true; return clearInterval(t); }
    const d = Math.floor(resta / 864e5), h = Math.floor(resta / 36e5) % 24,
          m = Math.floor(resta / 6e4) % 60, s = Math.floor(resta / 1e3) % 60;
    el.innerHTML = `<span>Termina em</span>` +
      [[d, "dias"], [h, "horas"], [m, "min"], [s, "seg"]]
        .map(([v, l]) => `<div><strong>${pad(v)}</strong><small>${l}</small></div>`).join("");
    el.hidden = false;
  };
  const t = setInterval(tick, 1000);
  tick();
}
