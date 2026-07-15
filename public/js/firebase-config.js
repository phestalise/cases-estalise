// js/firebase-config.js


// Inicializa Firebase somente uma vez

if (!firebase.apps.length) {

  firebase.initializeApp(
    window.APP_CONFIG.FIREBASE
  );

}


// Firebase Services

const db =
  firebase.firestore();


const auth =
  firebase.auth();


const storage =
  firebase.storage();




// =====================================================
// USUÁRIO LOGADO
// =====================================================

function getCurrentUser() {


  return new Promise((resolve) => {


    auth.onAuthStateChanged(
      user => {


        resolve(user);


      }
    );


  });


}





// =====================================================
// LOGOUT
// =====================================================

async function handleLogout() {


  try {


    await auth.signOut();


    window.location.href =
      "login.html";


  } catch(error) {


    console.error(
      "Erro logout:",
      error
    );


  }


}





// =====================================================
// FORMATAR MOEDA
// =====================================================

function formatarMoeda(valor) {


  return Number(valor || 0)
    .toLocaleString(
      "pt-BR",
      {

        style:"currency",

        currency:"BRL"

      }
    );


}




// =====================================================
// DATA FORMATADA
// =====================================================

function formatarData(data) {


  if (!data) return "-";


  if (
    data.toDate
  ) {

    data =
      data.toDate();

  }


  return data.toLocaleString(
    "pt-BR"
  );


}