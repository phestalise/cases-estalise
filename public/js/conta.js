// js/conta.js
const STATUS_LABEL = {
  aguardando_pagamento: { texto: "Aguardando pagamento", classe: "badge-pendente" },
  pago: { texto: "Pago", classe: "badge-pago" },
  em_producao: { texto: "Em produção", classe: "badge-producao" },
  enviado: { texto: "Enviado", classe: "badge-enviado" },
  entregue: { texto: "Entregue", classe: "badge-entregue" },
  cancelado: { texto: "Cancelado", classe: "badge-pendente" },
};

async function initConta() {
  const user = await exigirLogin("conta.html");
  if (!user) return;

  // Busca perfil
  const perfilDoc = await db.collection("usuarios").doc(user.uid).get();
  const perfil = perfilDoc.exists ? perfilDoc.data() : null;

  document.getElementById("perfil-nome").textContent = perfil?.nome_completo || user.email;
  document.getElementById("perfil-email").textContent = user.email;

  const listaEl = document.getElementById("lista-pedidos");

  // Busca pedidos (com tratamento de erro para não travar a tela
  // caso o índice composto ainda não exista ou esteja sendo criado)
  let snapshot;
  try {
    snapshot = await db.collection("pedidos")
      .where("user_id", "==", user.uid)
      .orderBy("created_at", "desc")
      .get();
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    listaEl.innerHTML = `<p class="empty-state">Não foi possível carregar seus pedidos no momento. Tente novamente em instantes.</p>`;
    return;
  }

  if (snapshot.empty) {
    listaEl.innerHTML = `<p class="empty-state">Você ainda não fez nenhum pedido.</p>`;
    return;
  }

  let html = `<table class="admin-table">
    <thead><tr><th>Pedido</th><th>Data</th><th>Status</th><th>Envio</th><th>Total</th></tr></thead><tbody>`;

  snapshot.forEach(doc => {
    const p = doc.data();
    const status = STATUS_LABEL[p.status] || { texto: p.status, classe: "badge-pendente" };
    const data = p.created_at ? p.created_at.toDate().toLocaleDateString("pt-BR") : "-";
    html += `
      <tr>
        <td>#${doc.id.slice(0, 8)}</td>
        <td>${data}</td>
        <td><span class="badge ${status.classe}">${status.texto}</span></td>
        <td>${p.metodo_envio || "-"}${p.codigo_rastreio ? ` · ${p.codigo_rastreio}` : ""}</td>
        <td>${formatarMoeda(p.total)}</td>
      </tr>`;
  });

  html += `</tbody></table>`;
  listaEl.innerHTML = html;
}