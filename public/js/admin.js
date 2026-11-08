// js/admin.js

const STATUS_OPCOES = [
  "aguardando_pagamento",
  "pago",
  "pago_cartao",
  "pago_divergente",
  "em_producao",
  "enviado",
  "entregue",
  "cancelado"
];

const STATUS_LABEL_ADMIN = {
  aguardando_pagamento: "Aguardando pagamento",
  pendente_pagamento: "Aguardando pagamento",
  pago: "Pago (Pix)",
  pago_cartao: "Pago com cartão — revisar",
  pago_divergente: "Valor divergente — revisar",
  em_producao: "Em produção",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado"
};

let adminUserId = null;
const cacheClientes = {};

async function buscarCliente(userId) {
  if (!userId) return {};
  if (!cacheClientes[userId]) {
    const userDoc = await db.collection("usuarios").doc(userId).get();
    cacheClientes[userId] = userDoc.exists ? userDoc.data() : {};
  }
  return cacheClientes[userId];
}

// Placeholder inline (evita 404)
const PLACEHOLDER_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="%23ccc"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="20">📷</text></svg>';

// =========================================================
// SANITIZAÇÃO — impede XSS ao injetar dados de usuário via innerHTML
// =========================================================
function escapeHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// =========================================================
// CONTROLE DE ACESSO ADMIN
// =========================================================
async function checkAdmin() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = "login.html?redirect=admin.html";
      return false;
    }

    const perfilDoc = await db.collection("usuarios").doc(user.uid).get();
    const perfil = perfilDoc.exists ? perfilDoc.data() : null;

    if (!perfil || perfil.is_admin !== true) {
      document.body.innerHTML = `
        <div class="form-card text-center">
          <h1>Acesso restrito</h1>
          <p class="sub">Esta área é exclusiva para o gestor da loja.</p>
          <a href="index.html" class="btn btn-outline btn-block">Voltar à loja</a>
        </div>`;
      return false;
    }

    adminUserId = user.uid;
    const nomeAdmin = document.getElementById("admin-nome");
    if (nomeAdmin) {
      nomeAdmin.textContent = perfil.nome_completo || "Administrador";
    }
    return true;
  } catch (erro) {
    console.error("Erro verificando administrador:", erro);
    alert("Erro ao validar acesso administrativo.");
    return false;
  }
}

// =========================================================
// MENU MOBILE (OFF-CANVAS)
// =========================================================
function toggleAdminSidebar(forcarEstado) {
  const sidebar = document.getElementById("admin-sidebar");
  const overlay = document.getElementById("admin-overlay");
  if (!sidebar || !overlay) return;

  const abrir = typeof forcarEstado === "boolean"
    ? forcarEstado
    : !sidebar.classList.contains("open");

  sidebar.classList.toggle("open", abrir);
  overlay.classList.toggle("show", abrir);
  document.body.style.overflow = abrir ? "hidden" : "";
}

// =========================================================
// TROCA DE ABAS
// =========================================================
function trocarAba(aba) {
  document.querySelectorAll(".admin-tab").forEach(el => el.classList.add("hidden"));
  const abaAtual = document.getElementById(`tab-${aba}`);
  if (abaAtual) abaAtual.classList.remove("hidden");

  document.querySelectorAll(".admin-nav a").forEach(a => {
    a.classList.toggle("active", a.dataset.aba === aba);
  });

  if (aba === "pedidos") carregarPedidosAdmin();
  if (aba === "produtos") carregarProdutosAdmin();
  if (aba === "cupons") carregarCuponsAdmin();
  if (aba === "config" && typeof carregarConfiguracoes === "function") carregarConfiguracoes();
  if (aba === "dashboard") carregarDashboard();

  // Fecha o menu lateral automaticamente no mobile após escolher a aba
  toggleAdminSidebar(false);
}

// =========================================================
// DASHBOARD
// =========================================================
async function carregarDashboard() {
  try {
    const todos = await db.collection("pedidos").get();
    let totalPedidos = 0;
    let pagosCount = 0;
    let soma = 0;

    todos.forEach(doc => {
      const p = doc.data();
      if (p.arquivado === true) return; // pedidos zerados não contam
      totalPedidos++;
      if (["pago", "em_producao", "enviado", "entregue"].includes(p.status)) {
        pagosCount++;
        soma += Number(p.total || 0);
      }
    });

    document.getElementById("stats").innerHTML = `
      <div class="stat-card"><div class="num">${totalPedidos}</div><div class="label">Pedidos totais</div></div>
      <div class="stat-card"><div class="num">${pagosCount}</div><div class="label">Pedidos pagos</div></div>
      <div class="stat-card"><div class="num">${formatarMoeda(soma)}</div><div class="label">Total vendido</div></div>`;
  } catch (erro) {
    console.error("Erro dashboard:", erro);
  }
}

// =========================================================
// PEDIDOS
// =========================================================
async function carregarPedidosAdmin() {
  const container = document.getElementById("lista-pedidos-admin");
  if (!container) return;
  container.innerHTML = `<p class="empty-state">Carregando pedidos...</p>`;

  try {
    const snapshot = await db.collection("pedidos").orderBy("created_at", "desc").get();
    const mostrarArquivados = document.getElementById("mostrar-arquivados")?.checked;
    const docs = snapshot.docs.filter(doc => mostrarArquivados || doc.data().arquivado !== true);

    if (!docs.length) {
      container.innerHTML = `<p class="empty-state">Nenhum pedido ainda.</p>`;
      return;
    }

    const pedidosHtml = [];
    for (const doc of docs) {
      const p = doc.data();
      const cliente = await buscarCliente(p.user_id);

      const itensHtml = (p.itens || []).map(item => `
        <li>${escapeHtml(item.quantidade || 1)}x ${escapeHtml(item.nome || "Produto")} ${item.tipo ? `(${escapeHtml(item.tipo)})` : ""}
        ${item.is_personalizado && item.personalizacao ? `— Personalizado: "${escapeHtml(item.personalizacao.texto_personalizado || "")}" Cor: ${escapeHtml(item.personalizacao.cor || "-")}` : " — Padrão"}
        — ${formatarMoeda(item.preco_unitario || 0)}</li>`).join("");

      const endereco = p.endereco || {};
      const data = p.created_at?.toDate ? p.created_at.toDate().toLocaleString("pt-BR") : "-";

      pedidosHtml.push(`
        <div class="summary-box" style="margin-bottom:20px">
          <div class="section-head" style="margin-bottom:12px">
            <div><strong>Pedido #${escapeHtml(doc.id.slice(0,8))}</strong>${p.arquivado === true ? ` <span style="color:var(--gray);font-size:12px">(arquivado)</span>` : ""}<div style="color:var(--gray);font-size:12px">${escapeHtml(data)}</div></div>
            <select class="select" onchange="atualizarStatusPedido('${doc.id}', this.value)">
              ${STATUS_OPCOES.map(status => `<option value="${status}" ${status === (p.status === "pendente_pagamento" ? "aguardando_pagamento" : p.status) ? "selected" : ""}>${STATUS_LABEL_ADMIN[status]}</option>`).join("")}
            </select>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; font-size:14px">
            <div>
              <strong>Cliente</strong>
              <p>${escapeHtml(cliente.nome_completo || "-")}<br>CPF: ${escapeHtml(cliente.cpf || "-")}<br>Tel: ${escapeHtml(cliente.telefone || "-")}</p>
              <strong>Endereço</strong>
              <p>${escapeHtml(endereco.logradouro || "")}, ${escapeHtml(endereco.numero || "")} — ${escapeHtml(endereco.bairro || "")}, ${escapeHtml(endereco.cidade || "")}/${escapeHtml(endereco.uf || "")} — CEP: ${escapeHtml(endereco.cep || "")}</p>
            </div>
            <div>
              <strong>Itens</strong><ul style="margin:6px 0 12px 18px">${itensHtml}</ul>
              <strong>Pagamento</strong>
              <p>${p.pagamento ? `${escapeHtml(p.pagamento.status || "-")} · ${escapeHtml(p.pagamento.metodo || "-")} · ${formatarMoeda(p.pagamento.valor_pago ?? p.pagamento.valor ?? 0)}` : "Não registrado"}</p>
              ${p.cupom?.codigo ? `<strong>Cupom</strong><p>${escapeHtml(p.cupom.codigo)} · −${formatarMoeda(p.desconto || 0)}</p>` : ""}
              <strong>Frete</strong>
              <p>${escapeHtml(p.metodo_envio || "-")} · ${formatarMoeda(p.valor_frete || 0)}</p>
            </div>
          </div>
          <div class="form-group" style="margin-top:16px">
            <label>Código de rastreio</label>
            <div class="flex gap-8">
              <input type="text" class="field" id="rastreio-${doc.id}" value="${escapeHtml(p.codigo_rastreio || "")}" placeholder="BR123456789BR" />
              <button class="btn btn-outline" onclick="salvarRastreio('${doc.id}')">Salvar</button>
            </div>
          </div>
          <div class="summary-row total" style="margin-top:12px"><span>Total</span><span>${formatarMoeda(p.total || 0)}</span></div>
        </div>`);
    }
    container.innerHTML = pedidosHtml.join("");
  } catch (erro) {
    console.error("Erro carregando pedidos:", erro);
    container.innerHTML = `<p class="empty-state">Erro ao carregar pedidos.</p>`;
  }
}

async function atualizarStatusPedido(pedidoId, novoStatus) {
  try {
    await db.collection("pedidos").doc(pedidoId).update({ status: novoStatus });
  } catch (erro) {
    console.error(erro);
    alert("Erro ao atualizar status.");
  }
}

async function salvarRastreio(pedidoId) {
  try {
    const valor = document.getElementById(`rastreio-${pedidoId}`).value.trim();
    await db.collection("pedidos").doc(pedidoId).update({ codigo_rastreio: valor });
    alert("Código de rastreio salvo.");
  } catch (erro) {
    console.error(erro);
    alert("Erro ao salvar rastreio.");
  }
}

// =========================================================
// PRODUTOS (CRUD COM COMPRESSÃO DE IMAGEM)
// =========================================================
async function carregarProdutosAdmin() {
  const container = document.getElementById("lista-produtos-admin");
  if (!container) return;

  try {
    const snapshot = await db.collection("produtos").orderBy("created_at", "desc").get();
    let rows = "";
    snapshot.forEach(doc => {
      const p = doc.data();
      const imgSrc = p.imagem_base64 || PLACEHOLDER_SVG;
      rows += `
        <tr>
          <td><img src="${imgSrc}" style="width:48px;height:48px;object-fit:cover;border-radius:8px" /></td>
          <td>${escapeHtml(p.nome || "-")}</td>
          <td>${escapeHtml(p.tipo || "-")}</td>
          <td>${formatarMoeda(p.preco_padrao || 0)}</td>
          <td>${formatarMoeda(p.preco_personalizado || 0)}</td>
          <td>${p.ativo ? "Sim" : "Não"}</td>
          <td><button class="btn btn-ghost" onclick="abrirEdicaoProduto('${doc.id}')">Editar</button></td>
        </tr>`;
    });

    container.innerHTML = `
      <div style="overflow-x:auto">
        <table class="admin-table">
          <thead><tr><th>Imagem</th><th>Nome</th><th>Tipo</th><th>Preço padrão</th><th>Preço personalizado</th><th>Ativo</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <button class="btn btn-primary" style="margin-top:20px" onclick="abrirEdicaoProduto(null)">+ Novo produto</button>
      <div id="form-produto-wrapper" style="margin-top:24px"></div>`;
  } catch (erro) {
    console.error("Erro produtos:", erro);
    container.innerHTML = `<p class="empty-state">Erro ao carregar produtos.</p>`;
  }
}

function abrirEdicaoProduto(produtoId) {
  const wrapper = document.getElementById("form-produto-wrapper");
  const carregar = async () => {
    let produto = null;
    if (produtoId) {
      const doc = await db.collection("produtos").doc(produtoId).get();
      if (doc.exists) produto = doc.data();
    }

    wrapper.innerHTML = `
      <div class="summary-box">
        <h3>${produtoId ? "Editar produto" : "Novo produto"}</h3>
        <div class="form-group"><label>Nome</label><input id="p-nome" class="field" value="${escapeHtml(produto?.nome || "")}" /></div>
        <div class="form-group"><label>Tipo</label><select id="p-tipo" class="select"><option value="case" ${produto?.tipo === "case" ? "selected" : ""}>Case</option><option value="pasta" ${produto?.tipo === "pasta" ? "selected" : ""}>Pasta</option></select></div>
        <div class="form-group"><label>Descrição</label><input id="p-descricao" class="field" value="${escapeHtml(produto?.descricao || "")}" /></div>
        <div class="flex gap-8">
          <div class="form-group" style="flex:1"><label>Preço padrão</label><input type="number" step="0.01" id="p-preco-padrao" class="field" value="${produto?.preco_padrao || ""}" /></div>
          <div class="form-group" style="flex:1"><label>Preço personalizado</label><input type="number" step="0.01" id="p-preco-personalizado" class="field" value="${produto?.preco_personalizado || ""}" /></div>
        </div>
        <div class="form-group"><label>Imagem do produto</label><input type="file" id="p-imagem" accept="image/*" class="field" />
          ${produto?.imagem_base64 ? `<img src="${produto.imagem_base64}" style="width:100px;margin-top:10px;border-radius:8px" />` : ""}
        </div>
        <div class="form-group"><label><input type="checkbox" id="p-ativo" ${produto?.ativo !== false ? "checked" : ""} /> Produto ativo</label></div>
        <button class="btn btn-primary" onclick="salvarProduto('${produtoId || ""}')">Salvar produto</button>
      </div>`;
  };
  carregar();
}

// Comprime e redimensiona a imagem usando canvas
function comprimirImagem(arquivo, maxWidth = 800, qualidade = 0.6) {
  return new Promise((resolve, reject) => {
    if (!arquivo.type.startsWith("image/")) {
      alert("Selecione apenas imagens.");
      return resolve(null);
    }

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(null);
          }
        },
        "image/jpeg",
        qualidade
      );
    };
    img.onerror = () => {
      alert("Erro ao carregar imagem para compressão.");
      resolve(null);
    };
    img.src = URL.createObjectURL(arquivo);
  });
}

// Converte Blob para Base64
function blobParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function salvarProduto(produtoId) {
  try {
    const dados = {
      nome: document.getElementById("p-nome").value.trim(),
      tipo: document.getElementById("p-tipo").value,
      descricao: document.getElementById("p-descricao").value.trim(),
      preco_padrao: Number(document.getElementById("p-preco-padrao").value),
      preco_personalizado: Number(document.getElementById("p-preco-personalizado").value),
      ativo: document.getElementById("p-ativo").checked,
      permite_personalizacao: true
    };

    const arquivoImagem = document.getElementById("p-imagem").files[0];
    if (arquivoImagem) {
      const blobComprimido = await comprimirImagem(arquivoImagem, 800, 0.6);
      if (!blobComprimido) return;

      const base64 = await blobParaBase64(blobComprimido);
      if (!base64) {
        alert("Falha ao processar a imagem.");
        return;
      }
      dados.imagem_base64 = base64;
    }

    if (produtoId) {
      await db.collection("produtos").doc(produtoId).update(dados);
    } else {
      dados.created_at = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("produtos").add(dados);
    }

    alert("Produto salvo com sucesso!");
    carregarProdutosAdmin();
  } catch (erro) {
    console.error("Erro salvar produto:", erro);
    alert(erro.message);
  }
}

// =========================================================
// EXPORTAR PEDIDOS EM EXCEL (SheetJS)
// =========================================================
function preencherFiltroStatusExport() {
  const select = document.getElementById("filtro-status-export");
  if (!select || select.options.length > 1) return;
  STATUS_OPCOES.forEach(status => {
    const opt = document.createElement("option");
    opt.value = status;
    opt.textContent = STATUS_LABEL_ADMIN[status];
    select.appendChild(opt);
  });
}
document.addEventListener("DOMContentLoaded", preencherFiltroStatusExport);

// Retorna a lista de IDs exportados (array vazio se não havia pedidos),
// ou null em caso de erro. Pedidos arquivados (zerados) não entram.
// Com { todos: true } ignora o filtro de status (usado ao zerar).
async function exportarPedidosExcel(opcoes = {}) {
  if (typeof XLSX === "undefined") {
    alert("Biblioteca de Excel não carregou. Verifique sua conexão e recarregue a página.");
    return null;
  }

  const btn = document.getElementById("btn-exportar-excel");
  const filtro = opcoes.todos ? "" : (document.getElementById("filtro-status-export")?.value || "");
  const textoOriginal = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "Gerando..."; }

  try {
    const snapshot = await db.collection("pedidos").orderBy("created_at", "desc").get();
    const linhas = [];
    const idsExportados = [];

    for (const doc of snapshot.docs) {
      const p = doc.data();
      if (p.arquivado === true) continue;
      const statusNormalizado = p.status === "pendente_pagamento" ? "aguardando_pagamento" : p.status;
      if (filtro && statusNormalizado !== filtro) continue;
      idsExportados.push(doc.id);

      const c = await buscarCliente(p.user_id);
      const e = p.endereco || {};
      const itens = (p.itens || []).map(item => {
        let txt = `${item.quantidade || 1}x ${item.nome || "Produto"}`;
        if (item.tipo) txt += ` (${item.tipo})`;
        if (item.is_personalizado && item.personalizacao) {
          txt += ` — Personalizado: "${item.personalizacao.texto_personalizado || ""}" Cor: ${item.personalizacao.cor || "-"}`;
        }
        return txt;
      }).join(" | ");

      linhas.push({
        "Pedido": doc.id,
        "Data": p.created_at?.toDate ? p.created_at.toDate().toLocaleString("pt-BR") : "",
        "Status": STATUS_LABEL_ADMIN[p.status] || p.status || "",
        "Cliente": c.nome_completo || "",
        "CPF": c.cpf || "",
        "Telefone": c.telefone || "",
        "CEP": e.cep || "",
        "Endereço": [e.logradouro, e.numero, e.complemento].filter(Boolean).join(", "),
        "Bairro": e.bairro || "",
        "Cidade": e.cidade || "",
        "UF": e.uf || "",
        "Itens": itens,
        "Subtotal (R$)": Number(p.subtotal || 0),
        "Cupom": p.cupom?.codigo || "",
        "Desconto (R$)": Number(p.desconto || 0),
        "Frete (R$)": Number(p.valor_frete || 0),
        "Envio": p.metodo_envio || "",
        "Total (R$)": Number(p.total || 0),
        "Forma de pagamento": p.pagamento?.metodo || "",
        "Valor pago (R$)": Number(p.pagamento?.valor_pago || 0),
        "Comprovante": p.pagamento?.receipt_url || "",
        "Rastreio": p.codigo_rastreio || ""
      });
    }

    if (!linhas.length) {
      alert("Nenhum pedido encontrado para exportar.");
      return [];
    }

    const planilha = XLSX.utils.json_to_sheet(linhas);
    planilha["!cols"] = Object.keys(linhas[0]).map(chave => ({
      wch: Math.min(60, Math.max(chave.length, ...linhas.map(l => String(l[chave] ?? "").length)) + 2)
    }));

    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, "Pedidos");

    const hoje = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(livro, `pedidos-estalise-${filtro || "todos"}-${hoje}.xlsx`);
    return idsExportados;
  } catch (erro) {
    console.error("Erro ao exportar pedidos:", erro);
    alert("Erro ao exportar pedidos.");
    return null;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = textoOriginal; }
  }
}

// =========================================================
// ZERAR PEDIDOS
// 1) Baixa o Excel com todos os pedidos atuais;
// 2) Marca exatamente esses pedidos como arquivados.
// Nada é apagado: o pedido some do painel e do dashboard, mas o
// cliente continua vendo o histórico em "Minha conta" e dá para
// consultar marcando "Mostrar arquivados".
// =========================================================
async function zerarPedidos() {
  if (!confirm(
    "Isso vai baixar o Excel com TODOS os pedidos atuais e depois zerar a lista do painel.\n\n" +
    "Os pedidos não são apagados: ficam arquivados (marque \"Mostrar arquivados\" para vê-los).\n\nContinuar?"
  )) return;

  const btn = document.getElementById("btn-zerar-pedidos");
  const textoOriginal = btn ? btn.textContent : "";

  const ids = await exportarPedidosExcel({ todos: true });
  if (ids === null) return alert("O Excel não foi gerado, então nenhum pedido foi zerado.");
  if (!ids.length) return;

  if (!confirm(`Excel baixado com ${ids.length} pedido(s).\n\nConfira se o arquivo foi salvo e clique OK para zerar.`)) return;

  if (btn) { btn.disabled = true; btn.textContent = "Zerando..."; }
  try {
    // Firestore aceita no máximo 500 operações por batch
    for (let i = 0; i < ids.length; i += 450) {
      const batch = db.batch();
      ids.slice(i, i + 450).forEach(id => {
        batch.update(db.collection("pedidos").doc(id), {
          arquivado: true,
          arquivado_em: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
    }
    alert(`${ids.length} pedido(s) zerado(s) com sucesso.`);
    carregarPedidosAdmin();
    carregarDashboard();
  } catch (erro) {
    console.error("Erro ao zerar pedidos:", erro);
    alert("Erro ao zerar pedidos. Parte deles pode já ter sido arquivada; recarregue a página e tente de novo.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = textoOriginal; }
  }
}

// =========================================================
// CUPONS DE DESCONTO
// Documento: cupons/{CODIGO}
// { tipo: "percentual"|"fixo", valor, ativo, usos, usos_max, valor_minimo, validade }
// =========================================================
async function carregarCuponsAdmin() {
  const container = document.getElementById("lista-cupons-admin");
  if (!container) return;
  container.innerHTML = `<p class="empty-state">Carregando cupons...</p>`;

  try {
    const snapshot = await db.collection("cupons").get();
    if (snapshot.empty) {
      container.innerHTML = `<p class="empty-state">Nenhum cupom criado ainda.</p>`;
      return;
    }

    const rows = snapshot.docs.map(doc => {
      const c = doc.data();
      const desconto = c.tipo === "fixo" ? formatarMoeda(c.valor) : `${Number(c.valor)}%`;
      const validade = c.validade?.toDate ? c.validade.toDate().toLocaleDateString("pt-BR") : "Sem validade";
      const expirado = c.validade?.toDate && c.validade.toDate() < new Date();
      const usos = `${Number(c.usos || 0)}${Number(c.usos_max) > 0 ? ` / ${Number(c.usos_max)}` : ""}`;
      const id = escapeHtml(doc.id);
      return `
        <tr>
          <td><strong>${id}</strong></td>
          <td>${desconto}</td>
          <td>${Number(c.valor_minimo) > 0 ? formatarMoeda(c.valor_minimo) : "-"}</td>
          <td>${usos}</td>
          <td>${escapeHtml(validade)}${expirado ? " (expirado)" : ""}</td>
          <td>${c.ativo !== false ? "Sim" : "Não"}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost" onclick="alternarCupom('${id}', ${c.ativo === false})">${c.ativo !== false ? "Desativar" : "Ativar"}</button>
            <button class="btn btn-ghost" style="color:var(--danger)" onclick="excluirCupom('${id}')">Excluir</button>
          </td>
        </tr>`;
    }).join("");

    container.innerHTML = `
      <div style="overflow-x:auto">
        <table class="admin-table">
          <thead><tr><th>Código</th><th>Desconto</th><th>Mínimo</th><th>Usos</th><th>Validade</th><th>Ativo</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } catch (erro) {
    console.error("Erro cupons:", erro);
    container.innerHTML = `<p class="empty-state">Erro ao carregar cupons. Confira se as regras do Firestore foram publicadas.</p>`;
  }
}

function mostrarMsgCupom(texto, tipo) {
  const el = document.getElementById("cupom-msg");
  if (!el) return alert(texto);
  el.textContent = texto;
  el.className = `form-msg ${tipo} show`;
}

async function salvarCupom() {
  const codigo = document.getElementById("c-codigo").value.trim().toUpperCase().replace(/\s+/g, "");
  const tipo = document.getElementById("c-tipo").value;
  const valor = Number(document.getElementById("c-valor").value);
  const minimo = Number(document.getElementById("c-minimo").value || 0);
  const usosMax = parseInt(document.getElementById("c-usos-max").value || "0", 10);
  const validadeStr = document.getElementById("c-validade").value;

  if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) {
    return mostrarMsgCupom("Código inválido: use de 3 a 30 letras, números, - ou _.", "error");
  }
  if (!(valor > 0)) return mostrarMsgCupom("Informe o valor do desconto.", "error");
  if (tipo === "percentual" && valor >= 100) return mostrarMsgCupom("Porcentagem deve ser menor que 100.", "error");

  try {
    const ref = db.collection("cupons").doc(codigo);
    const existente = await ref.get();
    if (existente.exists && !confirm(`O cupom ${codigo} já existe. Deseja substituir?`)) return;

    await ref.set({
      tipo,
      valor,
      valor_minimo: minimo > 0 ? minimo : 0,
      usos_max: usosMax > 0 ? usosMax : 0,
      usos: existente.exists ? Number(existente.data().usos || 0) : 0,
      // Válido até o fim do dia escolhido (horário local)
      validade: validadeStr ? firebase.firestore.Timestamp.fromDate(new Date(`${validadeStr}T23:59:59`)) : null,
      ativo: true,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    ["c-codigo", "c-valor", "c-minimo", "c-usos-max", "c-validade"].forEach(id => {
      document.getElementById(id).value = "";
    });
    mostrarMsgCupom(`Cupom ${codigo} criado!`, "success");
    carregarCuponsAdmin();
  } catch (erro) {
    console.error("Erro salvar cupom:", erro);
    mostrarMsgCupom("Erro ao salvar cupom. Confira se as regras do Firestore foram publicadas.", "error");
  }
}

async function alternarCupom(codigo, ativar) {
  try {
    await db.collection("cupons").doc(codigo).update({ ativo: ativar });
    carregarCuponsAdmin();
  } catch (erro) {
    console.error(erro);
    alert("Erro ao atualizar cupom.");
  }
}

async function excluirCupom(codigo) {
  if (!confirm(`Excluir o cupom ${codigo}?`)) return;
  try {
    await db.collection("cupons").doc(codigo).delete();
    carregarCuponsAdmin();
  } catch (erro) {
    console.error(erro);
    alert("Erro ao excluir cupom.");
  }
}
