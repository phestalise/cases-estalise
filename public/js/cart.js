// js/cart.js

const CART_KEY = "cp_carrinho";


// ================================
// PEGAR CARRINHO
// ================================

function getCarrinho() {

  try {

    return JSON.parse(
      localStorage.getItem(CART_KEY)
    ) || [];

  } catch {

    return [];

  }

}



// ================================
// SALVAR CARRINHO
// ================================

function salvarCarrinho(itens) {

  localStorage.setItem(
    CART_KEY,
    JSON.stringify(itens)
  );

  atualizarBadgeCarrinho();

}



// ================================
// ADICIONAR PRODUTO
// ================================

function adicionarAoCarrinho(item) {


  const itens = getCarrinho();


  const chave = JSON.stringify({

    produto_id:
      item.produto_id,

    is_personalizado:
      item.is_personalizado,

    cor:
      item.cor,

    texto_personalizado:
      item.texto_personalizado

  });



  const existente = itens.find(
    (i) =>
      JSON.stringify({

        produto_id:
          i.produto_id,

        is_personalizado:
          i.is_personalizado,

        cor:
          i.cor,

        texto_personalizado:
          i.texto_personalizado

      }) === chave
  );



  if (existente) {


    existente.quantidade +=
      Number(item.quantidade || 1);


  } else {


    itens.push({

      ...item,

      id_temp:
        crypto.randomUUID()

    });


  }



  salvarCarrinho(itens);

}



// ================================
// REMOVER
// ================================

function removerDoCarrinho(idTemp) {


  const itens =
    getCarrinho()
      .filter(
        item =>
          item.id_temp !== idTemp
      );


  salvarCarrinho(itens);

}



// ================================
// ALTERAR QUANTIDADE
// ================================

function atualizarQuantidade(
  idTemp,
  novaQtd
) {


  const itens =
    getCarrinho();



  const item =
    itens.find(
      i =>
      i.id_temp === idTemp
    );



  if(item){


    item.quantidade =
      Math.max(
        1,
        Number(novaQtd)
      );


    salvarCarrinho(itens);


  }

}



// ================================
// LIMPAR
// ================================

function limparCarrinho(){

  localStorage.removeItem(
    CART_KEY
  );

  atualizarBadgeCarrinho();

}



// ================================
// SUBTOTAL
// ================================

function calcularSubtotal(){


  return getCarrinho()
    .reduce(
      (total,item)=>{


        const preco =
          Number(
            item.preco_unitario || 0
          );


        const qtd =
          Number(
            item.quantidade || 1
          );


        return total +
          (
            preco *
            qtd
          );


      },
      0
    );


}



// ================================
// TOTAL ITENS
// ================================

function totalItensCarrinho(){

  return getCarrinho()
    .reduce(
      (total,item)=>
        total +
        Number(
          item.quantidade || 1
        ),
      0
    );

}



// ================================
// BADGE
// ================================

function atualizarBadgeCarrinho(){

  const badge =
    document.getElementById(
      "cart-badge"
    );


  if(!badge)
    return;



  const total =
    totalItensCarrinho();



  badge.textContent =
    total;



  badge.style.display =
    total > 0
      ? "flex"
      : "none";

}


document.addEventListener(
  "DOMContentLoaded",
  atualizarBadgeCarrinho
);



// =================================================
// FRETE
// =================================================


async function calcularFreteCloud(
  cepDestino,
  peso,
  altura,
  largura,
  comprimento,
  valorDeclarado
){


  const url =
    `${window.APP_CONFIG.FUNCTIONS_URL}/frete`;



  try{


    const response =
      await fetch(
        url,
        {

          method:"POST",

          headers:{
            "Content-Type":
            "application/json"
          },


          body:
          JSON.stringify({

            cepDestino,
            peso,
            altura,
            largura,
            comprimento,
            valorDeclarado

          })

        }
      );



    if(!response.ok){

      throw new Error(
        await response.text()
      );

    }



    return await response.json();



  }catch(error){

    console.error(
      "Erro frete:",
      error
    );


    return null;

  }

}



async function calcularFreteCarrinho(
  cepDestino
){


  const itens =
    getCarrinho();



  if(!itens.length)
    return null;



  const quantidade =
    itens.reduce(
      (a,i)=>
      a+i.quantidade,
      0
    );



  return calcularFreteCloud(

    cepDestino,

    quantidade * 0.2,

    2,

    15,

    20,

    calcularSubtotal()

  );


}