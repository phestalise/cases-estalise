// js/cart.js

// =========================================================
// GERENCIAMENTO DO CARRINHO
// =========================================================
const CART_KEY = "cp_carrinho";

function getCarrinho() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function salvarCarrinho(itens) {
  localStorage.setItem(CART_KEY, JSON.stringify(itens));
  atualizarBadgeCarrinho();
}

function adicionarAoCarrinho(item) {
  const itens = getCarrinho();
  const chave = JSON.stringify({
    produto_id: item.produto_id,
    is_personalizado: item.is_personalizado,
    cor: item.cor,
    texto_personalizado: item.texto_personalizado,
  });

  const existente = itens.find(
    (i) =>
      JSON.stringify({
        produto_id: i.produto_id,
        is_personalizado: i.is_personalizado,
        cor: i.cor,
        texto_personalizado: i.texto_personalizado,
      }) === chave
  );

  if (existente) {
    existente.quantidade += item.quantidade;
  } else {
    itens.push({ ...item, id_temp: crypto.randomUUID() });
  }

  salvarCarrinho(itens);
}

function removerDoCarrinho(idTemp) {
  const itens = getCarrinho().filter((i) => i.id_temp !== idTemp);
  salvarCarrinho(itens);
}

function atualizarQuantidade(idTemp, novaQtd) {
  const itens = getCarrinho();
  const item = itens.find((i) => i.id_temp === idTemp);
  if (item) {
    item.quantidade = Math.max(1, novaQtd);
    salvarCarrinho(itens);
  }
}

function limparCarrinho() {
  localStorage.removeItem(CART_KEY);
  atualizarBadgeCarrinho();
}

function calcularSubtotal() {
  return getCarrinho().reduce((acc, i) => acc + i.preco_unitario * i.quantidade, 0);
}

function totalItensCarrinho() {
  return getCarrinho().reduce((acc, i) => acc + i.quantidade, 0);
}

function atualizarBadgeCarrinho() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;
  const total = totalItensCarrinho();
  badge.textContent = total;
  badge.style.display = total > 0 ? "flex" : "none";
}

document.addEventListener("DOMContentLoaded", atualizarBadgeCarrinho);

// =========================================================
// INTEGRAÇÃO COM CLOUD FUNCTION DO SUPERFRETE
// =========================================================

/**
 * Chama a Cloud Function que calcula o frete.
 * A Cloud Function usa o token do SuperFrete de forma segura.
 */
async function calcularFreteCloud(cepDestino, peso, altura, largura, comprimento, valorDeclarado) {
  const url = `${window.APP_CONFIG.FUNCTIONS_URL}/calcularFrete`; // ou /calcular, conforme nome da função

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cepDestino,
        peso,
        altura,
        largura,
        comprimento,
        valorDeclarado
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }
    return await response.json();
  } catch (error) {
    console.error("Erro na Cloud Function:", error);
    alert("Não foi possível calcular o frete. Tente novamente.");
    return null;
  }
}

/**
 * Função de conveniência para calcular frete do carrinho.
 */
async function calcularFreteCarrinho(cepDestino) {
  const itens = getCarrinho();
  if (itens.length === 0) {
    alert("Carrinho vazio.");
    return null;
  }

  // Dimensões médias (ajuste conforme seus produtos)
  const pesoPorItem = 0.2;   // 200g
  const altura = 2;          // cm
  const largura = 15;        // cm
  const comprimento = 20;    // cm

  const quantidadeTotal = itens.reduce((soma, i) => soma + i.quantidade, 0);
  const pesoTotal = pesoPorItem * quantidadeTotal;
  const valorDeclarado = calcularSubtotal();

  return calcularFreteCloud(cepDestino, pesoTotal, altura, largura, comprimento, valorDeclarado);
}