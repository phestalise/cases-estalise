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
    // Cria o usuário no Firebase Auth
    const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
    const user = userCredential.user;

    // Salva os dados extras no Firestore (coleção "usuarios")
    await db.collection("usuarios").doc(user.uid).set({
      nome_completo: nome,
      cpf,
      telefone,
      email,
      is_admin: false
    });

    msgEl.textContent = "Conta criada com sucesso!";
    msgEl.className = "form-msg success show";

    setTimeout(() => {
      const redirect = new URLSearchParams(location.search).get("redirect") || "index.html";
      window.location.href = redirect;
    }, 1500);
  } catch (error) {
    msgEl.textContent = traduzErroAuth(error.message);
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
    const redirect = new URLSearchParams(location.search).get("redirect") || "index.html";
    window.location.href = redirect;
  } catch (error) {
    msgEl.textContent = traduzErroAuth(error.message);
    msgEl.className = "form-msg error show";
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
}

async function handleLogout() {
  await auth.signOut();
  window.location.href = "index.html";
}

// Recuperação de senha (link na página de login)
async function handleRecuperarSenha() {
  const email = prompt("Digite o e-mail da sua conta para receber o link de redefinição:");
  if (!email) return;
  try {
    await auth.sendPasswordResetEmail(email, { url: window.location.origin + "/login.html" });
    alert("E-mail enviado! Verifique sua caixa de entrada (e spam).");
  } catch (error) {
    alert("Erro: " + traduzErroAuth(error.message));
  }
}

function traduzErroAuth(msg) {
  const mapa = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "The email address is already in use by another account.": "Já existe uma conta com este e-mail.",
    "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres.",
    "The email address is badly formatted.": "Formato de e-mail inválido."
  };
  return mapa[msg] || msg;
}