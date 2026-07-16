// firebaseClient.js

// Inicializa o Firebase usando as configurações do arquivo config.js
firebase.initializeApp(window.APP_CONFIG.FIREBASE);

const db = firebase.firestore();        // Firestore
const auth = firebase.auth();           // Authentication
// Storage removido – as imagens serão armazenadas em Base64 no Firestore

// ---------- Helpers ----------

/**
 * Formata um número para moeda brasileira (BRL).
 * @param {number} valor 
 * @returns {string}
 */
function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/**
 * Retorna o usuário atual logado (Promise).
 * @returns {Promise<firebase.User|null>}
 */
function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Redireciona para login se o usuário não estiver autenticado.
 * @param {string} [paginaRetorno] - Página para onde voltar após login (opcional).
 * @returns {Promise<firebase.User|null>}
 */
async function exigirLogin(paginaRetorno) {
  const user = await getCurrentUser();
  if (!user) {
    const destino = paginaRetorno || location.pathname.split("/").pop();
    window.location.href = `login.html?redirect=${encodeURIComponent(destino)}`;
    return null;
  }
  return user;
}

/**
 * Retorna sessão com usuário e token JWT (útil para chamadas autenticadas).
 * @returns {Promise<{user: firebase.User, access_token: string}|null>}
 */
async function getSessaoAtual() {
  const user = await getCurrentUser();
  if (!user) return null;
  const token = await user.getIdToken();
  return { user, access_token: token };
}


