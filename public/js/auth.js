// js/auth.js
async function handleCadastro(event) {
  event.preventDefault();
  const msgEl = document.getElementById("auth-msg");
  const btn = document.getElementById("btn-cadastro");
  msgEl.className = "form-msg";

  const nome = document.getElementById("nome").value.trim();
  const cpf = document.getElementById("cpf").value.replace(/\D/g, "");
  const telefone = document.getElementById("telefone").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  if (!validarCPF(cpf)) {
    msgEl.textContent = "CPF inválido. Verifique os números digitados.";
    msgEl.className = "form-msg error show";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Criando conta...";

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
    const user = userCredential.user;

    await db.collection("usuarios").doc(user.uid).set({
      nome_completo: nome,
      cpf,
      telefone,
      email,
      is_admin: false,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    msgEl.textContent = "Conta criada com sucesso!";
    msgEl.className = "form-msg success show";

    setTimeout(() => {
      const redirect = new URLSearchParams(window.location.search).get("redirect") || "index.html";
      window.location.href = redirect;
    }, 1500);

  } catch (error) {
    console.error(error);
    msgEl.textContent = traduzErroAuth(error);
    msgEl.className = "form-msg error show";
    btn.disabled = false;
    btn.textContent = "Criar conta";
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const msgEl = document.getElementById("auth-msg");
  const btn = document.getElementById("btn-login");
  msgEl.className = "form-msg";

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  btn.disabled = true;
  btn.textContent = "Entrando...";

  try {
    await auth.signInWithEmailAndPassword(email, senha);

    const redirect = new URLSearchParams(window.location.search).get("redirect") || "index.html";
    window.location.href = redirect;

  } catch (error) {
    console.error(error);
    msgEl.textContent = traduzErroAuth(error);
    msgEl.className = "form-msg error show";
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
}

async function handleLogout() {
  try {
    await auth.signOut();
    localStorage.removeItem("cp_frete_selecionado");
    localStorage.removeItem("cp_cep_destino");
    window.location.href = "index.html";
  } catch (error) {
    console.error(error);
  }
}

async function handleRecuperarSenha() {
  const email = prompt("Digite o e-mail da sua conta para receber o link de redefinição:");
  if (!email) return;

  try {
    await auth.sendPasswordResetEmail(email, {
      url: window.location.origin + "/login.html"
    });
    alert("E-mail enviado! Verifique sua caixa de entrada (e spam).");
  } catch (error) {
    console.error(error);
    alert(traduzErroAuth(error));
  }
}

function traduzErroAuth(error) {
  const code = error.code || "";

  const erros = {
    "auth/email-already-in-use": "Já existe uma conta com este e-mail.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/weak-password": "A senha deve possuir pelo menos 6 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
    "auth/network-request-failed": "Erro de conexão com a internet."
  };

  return erros[code] || error.message || "Ocorreu um erro.";
}