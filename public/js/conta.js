// js/conta.js
const STATUS_LABEL = {
  aguardando_pagamento: { texto: "Aguardando pagamento", classe: "badge-pendente" },
  pendente_pagamento: { texto: "Aguardando pagamento", classe: "badge-pendente" },
  pago: { texto: "Pago", classe: "badge-pago" },
  pago_cartao: { texto: "Pago", classe: "badge-pago" },
  pago_divergente: { texto: "Em análise", classe: "badge-producao" },
  em_producao: { texto: "Em produção", classe: "badge-producao" },
  enviado: { texto: "Enviado", classe: "badge-enviado" },
  entregue: { texto: "Entregue", classe: "badge-entregue" },
  cancelado: { texto: "Cancelado", classe: "badge-pendente" },
};

const DIAS_PRODUCAO = 15;

async function initConta() {
  const user = await exigirLogin("conta.html");
  if (!user) return;

  // Busca perfil
  const perfilDoc = await db.collection("usuarios").doc(user.uid).get();
  const perfil = perfilDoc.exists ? perfilDoc.data() : null;

  document.getElementById("perfil-nome").textContent = perfil?.nome_completo || user.email;
  document.getElementById("perfil-email").textContent = user.email;

  preencherMeusDados(user, perfil || {});

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
    <thead><tr><th>Pedido</th><th>Data</th><th>Status</th><th>Envio</th><th>Previsão</th><th>Total</th></tr></thead><tbody>`;

  snapshot.forEach(doc => {
    const p = doc.data();
    const status = STATUS_LABEL[p.status] || { texto: p.status, classe: "badge-pendente" };
    const data = p.created_at ? p.created_at.toDate().toLocaleDateString("pt-BR") : "-";
    const previsao = calcularPrevisao(p);

    html += `
      <tr>
        <td>#${doc.id.slice(0, 8)}</td>
        <td>${data}</td>
        <td><span class="badge ${status.classe}">${status.texto}</span></td>
        <td>${p.metodo_envio || "-"}${p.codigo_rastreio ? ` · ${p.codigo_rastreio}` : ""}</td>
        <td>${previsao}</td>
        <td>${formatarMoeda(p.total)}</td>
      </tr>`;
  });

  html += `</tbody></table>`;
  listaEl.innerHTML = html;
}

// Calcula a previsão de entrega (data do pedido + 15 dias de produção).
// Se o pedido já foi enviado/entregue/cancelado, não faz sentido mostrar previsão.
function calcularPrevisao(pedido) {
  if (!pedido.created_at) return "-";
  if (["enviado", "entregue", "cancelado"].includes(pedido.status)) return "-";

  const dataPrevisao = pedido.created_at.toDate();
  dataPrevisao.setDate(dataPrevisao.getDate() + DIAS_PRODUCAO);

  return dataPrevisao.toLocaleDateString("pt-BR");
}


// =====================================================
// MEUS DADOS (editar nome/telefone, trocar e-mail e senha)
// A senha nunca é exibida; trocar e-mail/senha exige a senha atual.
// =====================================================
function msgConta(id, texto, tipo) {
  const el = document.getElementById(id);
  if (!el) return alert(texto);
  el.textContent = texto;
  el.className = `form-msg ${tipo} show`;
}

function erroAuthConta(erro) {
  const mapa = {
    "auth/wrong-password": "Senha atual incorreta.",
    "auth/invalid-credential": "Senha atual incorreta.",
    "auth/invalid-login-credentials": "Senha atual incorreta.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
    "auth/weak-password": "A nova senha precisa ter pelo menos 6 caracteres.",
    "auth/email-already-in-use": "Esse e-mail já é usado por outra conta.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/requires-recent-login": "Por segurança, saia e entre de novo antes de fazer essa alteração.",
    "auth/operation-not-allowed": "Troca de e-mail indisponível no momento. Fale com a gente pelo WhatsApp."
  };
  return mapa[erro?.code] || "Não foi possível concluir. Tente novamente.";
}

async function reautenticarConta(senhaAtual) {
  const user = auth.currentUser;
  const credencial = firebase.auth.EmailAuthProvider.credential(user.email, senhaAtual);
  await user.reauthenticateWithCredential(credencial);
  return user;
}

function formatarCpfConta(cpf) {
  const d = String(cpf || "").replace(/\D/g, "");
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : (cpf || "");
}

function preencherMeusDados(user, perfil) {
  document.getElementById("meus-nome").value = perfil.nome_completo || "";
  document.getElementById("meus-telefone").value = perfil.telefone || "";
  preencherMeuCpf(perfil);
  document.getElementById("meus-email").value = user.email || "";

  // Se o e-mail foi trocado (depois de confirmar o link), atualiza o cadastro
  if (user.email && perfil.email && perfil.email !== user.email) {
    db.collection("usuarios").doc(user.uid).update({ email: user.email }).catch(() => {});
  }
}

// CPF salvo -> campo travado (mostra o final e depois o CPF completo vindo da API).
// Sem CPF (ex.: falhou no cadastro) -> campo liberado para informar uma vez.
function preencherMeuCpf(perfil) {
  const campo = document.getElementById("meus-cpf");
  campo.oninput = null;

  if (perfil.cpf) {
    // Cadastro antigo, ainda não migrado.
    campo.value = formatarCpfConta(perfil.cpf);
    campo.disabled = true;
    return;
  }

  if (perfil.cpf_enc || perfil.cpf_final) {
    campo.value = perfil.cpf_final ? `***.***.***-${perfil.cpf_final}` : "";
    campo.disabled = true;
    lerMeuCpfNaApi()
      .then(cpf => { if (cpf) campo.value = formatarCpfConta(cpf); })
      .catch(err => console.warn("CPF indisponível:", err.message));
    return;
  }

  campo.value = "";
  campo.disabled = false;
  campo.placeholder = "Informe seu CPF";
  campo.inputMode = "numeric";
  campo.oninput = () => { campo.value = formatarCPF(campo.value); };
}

async function salvarMeusDados() {
  const user = auth.currentUser;
  const nome = document.getElementById("meus-nome").value.trim();
  const telefone = document.getElementById("meus-telefone").value.trim();
  if (nome.length < 3) return msgConta("meus-dados-msg", "Informe seu nome completo.", "error");
  const digitosTel = telefone.replace(/\D/g, "");
  if (telefone && (digitosTel.length < 10 || digitosTel.length > 11)) {
    return msgConta("meus-dados-msg", "Telefone inválido. Use DDD + número.", "error");
  }
  // CPF só é enviado se o campo estiver liberado (conta ainda sem CPF).
  const campoCpf = document.getElementById("meus-cpf");
  const cpf = campoCpf.disabled ? "" : campoCpf.value.replace(/\D/g, "");
  if (cpf && !validarCPF(cpf)) {
    return msgConta("meus-dados-msg", "CPF inválido. Verifique os números digitados.", "error");
  }

  try {
    await db.collection("usuarios").doc(user.uid).update({ nome_completo: nome, telefone });
    document.getElementById("perfil-nome").textContent = nome;
  } catch (erro) {
    console.error(erro);
    return msgConta("meus-dados-msg", "Erro ao salvar seus dados. Tente novamente.", "error");
  }

  if (cpf) {
    try {
      await salvarCpfNaApi(cpf);
      campoCpf.value = formatarCpfConta(cpf);
      campoCpf.disabled = true;
      campoCpf.oninput = null;
    } catch (erro) {
      return msgConta("meus-dados-msg", `Dados salvos, mas o CPF não: ${erro.message}`, "error");
    }
  }

  msgConta("meus-dados-msg", "Dados atualizados.", "success");
}

async function trocarMeuEmail() {
  const novo = document.getElementById("meus-novo-email").value.trim();
  const senha = document.getElementById("meus-senha-email").value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo)) return msgConta("meus-email-msg", "Informe um e-mail válido.", "error");
  if (!senha) return msgConta("meus-email-msg", "Informe sua senha atual para confirmar.", "error");
  if (novo.toLowerCase() === (auth.currentUser.email || "").toLowerCase()) return msgConta("meus-email-msg", "Esse já é o seu e-mail.", "error");
  try {
    const user = await reautenticarConta(senha);
    await user.verifyBeforeUpdateEmail(novo);
    document.getElementById("meus-senha-email").value = "";
    msgConta("meus-email-msg", `Enviamos um link de confirmação para ${novo}. O e-mail só muda depois que você clicar nele.`, "success");
  } catch (erro) {
    console.error(erro);
    msgConta("meus-email-msg", erroAuthConta(erro), "error");
  }
}

async function trocarMinhaSenha() {
  const atual = document.getElementById("minha-senha-atual").value;
  const nova = document.getElementById("minha-senha-nova").value;
  const nova2 = document.getElementById("minha-senha-nova2").value;
  if (!atual) return msgConta("minha-senha-msg", "Informe sua senha atual.", "error");
  if (nova.length < 6) return msgConta("minha-senha-msg", "A nova senha precisa ter pelo menos 6 caracteres.", "error");
  if (nova !== nova2) return msgConta("minha-senha-msg", "As duas senhas novas não são iguais.", "error");
  if (nova === atual) return msgConta("minha-senha-msg", "A nova senha precisa ser diferente da atual.", "error");
  try {
    const user = await reautenticarConta(atual);
    await user.updatePassword(nova);
    ["minha-senha-atual", "minha-senha-nova", "minha-senha-nova2"].forEach(id => document.getElementById(id).value = "");
    msgConta("minha-senha-msg", "Senha alterada com sucesso.", "success");
  } catch (erro) {
    console.error(erro);
    msgConta("minha-senha-msg", erroAuthConta(erro), "error");
  }
}

async function enviarLinkMinhaSenha() {
  const email = auth.currentUser?.email;
  if (!email) return;
  try {
    await auth.sendPasswordResetEmail(email);
    msgConta("minha-senha-msg", `Enviamos um link para ${email} para você criar uma nova senha.`, "success");
  } catch (erro) {
    console.error(erro);
    msgConta("minha-senha-msg", erroAuthConta(erro), "error");
  }
}
