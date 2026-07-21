// js/admin.js

const STATUS_OPCOES = [
  "aguardando_pagamento",
  "pago",
  "em_producao",
  "enviado",
  "entregue",
  "cancelado"
];

const STATUS_LABEL_ADMIN = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_producao: "Em produção",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado"
};

let adminUserId = null;

// Placeholder inline (evita 404)
const PLACEHOLDER_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="%23ccc"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="20">📷</text></svg>';

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
  if (aba === "config") carregarConfiguracoes();
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
    const totalPedidos = todos.size;
    let pagosCount = 0;
    let soma = 0;

    todos.forEach(doc => {
      const p = doc.data();
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
    if (snapshot.empty) {
      container.innerHTML = `<p class="empty-state">Nenhum pedido ainda.</p>`;
      return;
    }

    const pedidosHtml = [];
    for (const doc of snapshot.docs) {
      const p = doc.data();
      let cliente = { nome_completo: "-", cpf: "-", telefone: "-" };
      if (p.user_id) {
        const userDoc = await db.collection("usuarios").doc(p.user_id).get();
        if (userDoc.exists) cliente = userDoc.data();
      }

      const itensHtml = (p.itens || []).map(item => `
        <li>${item.quantidade || 1}x ${item.nome || "Produto"} ${item.tipo ? `(${item.tipo})` : ""}
        ${item.is_personalizado && item.personalizacao ? `— Personalizado: "${item.personalizacao.texto_personalizado || ""}" Cor: ${item.personalizacao.cor || "-"}` : " — Padrão"}
        — ${formatarMoeda(item.preco_unitario || 0)}</li>`).join("");

      const endereco = p.endereco || {};
      const data = p.created_at?.toDate ? p.created_at.toDate().toLocaleString("pt-BR") : "-";

      pedidosHtml.push(`
        <div class="summary-box" style="margin-bottom:20px">
          <div class="section-head" style="margin-bottom:12px">
            <div><strong>Pedido #${doc.id.slice(0,8)}</strong><div style="color:var(--gray);font-size:12px">${data}</div></div>
            <select class="select" onchange="atualizarStatusPedido('${doc.id}', this.value)">
              ${STATUS_OPCOES.map(status => `<option value="${status}" ${status === p.status ? "selected" : ""}>${STATUS_LABEL_ADMIN[status]}</option>`).join("")}
            </select>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; font-size:14px">
            <div>
              <strong>Cliente</strong>
              <p>${cliente.nome_completo || "-"}<br>CPF: ${cliente.cpf || "-"}<br>Tel: ${cliente.telefone || "-"}</p>
              <strong>Endereço</strong>
              <p>${endereco.logradouro || ""}, ${endereco.numero || ""} — ${endereco.bairro || ""}, ${endereco.cidade || ""}/${endereco.uf || ""} — CEP: ${endereco.cep || ""}</p>
            </div>
            <div>
              <strong>Itens</strong><ul style="margin:6px 0 12px 18px">${itensHtml}</ul>
              <strong>Pagamento</strong>
              <p>${p.pagamento ? `${p.pagamento.status || "-"} · ${p.pagamento.metodo || "-"} · ${formatarMoeda(p.pagamento.valor || 0)}` : "Não registrado"}</p>
              <strong>Frete</strong>
              <p>${p.metodo_envio || "-"} · ${formatarMoeda(p.valor_frete || 0)}</p>
            </div>
          </div>
          <div class="form-group" style="margin-top:16px">
            <label>Código de rastreio</label>
            <div class="flex gap-8">
              <input type="text" class="field" id="rastreio-${doc.id}" value="${p.codigo_rastreio || ""}" placeholder="BR123456789BR" />
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
          <td>${p.nome || "-"}</td>
          <td>${p.tipo || "-"}</td>
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
        <div class="form-group"><label>Nome</label><input id="p-nome" class="field" value="${produto?.nome || ""}" /></div>
        <div class="form-group"><label>Tipo</label><select id="p-tipo" class="select"><option value="case" ${produto?.tipo === "case" ? "selected" : ""}>Case</option><option value="pasta" ${produto?.tipo === "pasta" ? "selected" : ""}>Pasta</option></select></div>
        <div class="form-group"><label>Descrição</label><input id="p-descricao" class="field" value="${produto?.descricao || ""}" /></div>
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