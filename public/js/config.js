// js/config.js

window.APP_CONFIG = {

  FIREBASE: {

    apiKey: "AIzaSyAMPndUevpdx2fGbXyEnZo7PMoqtu6Nxi0",

    authDomain:
      "cases-estalise.firebaseapp.com",

    projectId:
      "cases-estalise",

    storageBucket:
      "cases-estalise.firebasestorage.app",

    messagingSenderId:
      "660306417312",

    appId:
      "1:660306417312:web:360848651c132c508adbc5"

  },

  FUNCTIONS_URL:
  "https://api-case.vercel.app/api",

  // WhatsApp da loja: só números, com DDI 55 + DDD (ex.: "5511999998888")
  WHATSAPP:
  "5511995778390",

  // ===================================================
  // BLACK FRIDAY
  // Para encerrar a promoção: troque ativo para false.
  // (A API tem a mesma chave em api/infinitypay-checkout.js
  //  e precisa ser desligada lá também.)
  // ===================================================
  BLACK_FRIDAY: {
    ativo: true,
    // Preço promocional da versão PERSONALIZADA, por tipo de produto
    precos_personalizado: {
      case: 159.90,
      pasta: 199.90
    },
    // Data/hora de fim para a contagem regressiva na home
    // (ex.: "2026-11-30T23:59:59-03:00"). null = sem contagem.
    fim: "2026-11-30T23:59:59-03:00"
  }

};


// =====================================================
// BLACK FRIDAY — helpers usados pela loja inteira
// =====================================================

function blackFridayAtiva() {
  const cfg = window.APP_CONFIG?.BLACK_FRIDAY;
  if (cfg?.ativo !== true) return false;
  // Encerra sozinha depois da data de fim
  if (cfg.fim && Date.now() > new Date(cfg.fim).getTime()) return false;
  return true;
}

// Retorna { de, por, pct } se o produto tem promoção na versão
// personalizada; senão null. "de" é o preço normal do banco.
function promoPersonalizado(produto) {
  if (!blackFridayAtiva() || !produto) return null;
  const promo = Number(window.APP_CONFIG.BLACK_FRIDAY.precos_personalizado?.[produto.tipo]);
  const normal = Number(produto.preco_personalizado || 0);
  if (!(promo > 0) || !(normal > promo)) return null;
  return { de: normal, por: promo, pct: Math.round((1 - promo / normal) * 100) };
}

// Preço personalizado efetivo (promocional quando houver)
function precoPersonalizadoAtual(produto) {
  const promo = promoPersonalizado(produto);
  return promo ? promo.por : Number(produto?.preco_personalizado || 0);
}

// HTML "de R$ X por R$ Y  -Z%"
function htmlPrecoPromo(promo, formatar) {
  const fmt = formatar || ((v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  return `<span class="preco-de">${fmt(promo.de)}</span> ` +
    `<span class="preco-por">${fmt(promo.por)}</span> ` +
    `<span class="bf-pct">-${promo.pct}%</span>`;
}

// Na Black Friday os produtos em promoção são vendidos SÓ personalizados
// (a opção "sem personalização" fica indisponível).
function somentePersonalizado(produtoOuItem) {
  if (!blackFridayAtiva() || !produtoOuItem) return false;
  return Number(window.APP_CONFIG.BLACK_FRIDAY.precos_personalizado?.[produtoOuItem.tipo]) > 0;
}

// Liga o "tema" Black Friday no site inteiro
if (blackFridayAtiva()) document.documentElement.classList.add("bf-ativa");
