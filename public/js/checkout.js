// js/checkout.js


window.initCheckout = async function () {


  const itens = getCarrinho();


  if (!itens || !itens.length) {

    window.location.href =
      "carrinho.html";

    return;

  }



  const resumo =
    document.getElementById(
      "resumo-checkout"
    );



  const frete =
    JSON.parse(
      localStorage.getItem(
        "cp_frete_selecionado"
      )
    ) || {

      servico:"Entrega",

      valor:0,

      prazo_dias:0

    };



  const subtotal =
    calcularSubtotal();



  const total =
    subtotal +
    Number(frete.valor || 0);





  resumo.innerHTML = `

  <div class="cart-card">

    <h3>
      Resumo do Pedido
    </h3>


    ${
      itens.map(item => `

      <div style="
        display:flex;
        justify-content:space-between;
        margin:12px 0;
      ">


        <span>

          ${item.nome || "Produto"}

          x${Number(item.quantidade || 1)}

        </span>



        <strong>

          R$
          ${(
            Number(item.preco_unitario || 0) *
            Number(item.quantidade || 1)

          ).toFixed(2)}

        </strong>


      </div>


      `).join("")
    }



    <hr>


    <div style="
      display:flex;
      justify-content:space-between;
      margin-top:15px;
    ">

      <span>
        Subtotal
      </span>


      <strong>

        R$
        ${subtotal.toFixed(2)}

      </strong>


    </div>




    <div style="
      display:flex;
      justify-content:space-between;
      margin-top:10px;
    ">


      <span>

        ${frete.servico || "Entrega"}

      </span>



      <strong>

        R$
        ${Number(frete.valor || 0).toFixed(2)}

      </strong>


    </div>




    <div style="
      display:flex;
      justify-content:space-between;
      margin-top:15px;
      font-size:20px;
    ">


      <span>
        Total
      </span>



      <strong>

        R$
        ${total.toFixed(2)}

      </strong>



    </div>


  </div>

  `;



  configurarCEP();


};





function configurarCEP(){


  const cepInput =
    document.getElementById(
      "cep-endereco"
    );



  if(!cepInput)
    return;




  cepInput.addEventListener(
    "blur",
    async()=>{


      const cep =
        cepInput.value.replace(
          /\D/g,
          ""
        );



      if(
        cep.length !== 8
      )
      return;



      try{


        const resp =
          await fetch(
            `https://viacep.com.br/ws/${cep}/json/`
          );



        const data =
          await resp.json();




        if(data.erro)
          return;




        document.getElementById(
          "logradouro"
        ).value =
          data.logradouro || "";



        document.getElementById(
          "bairro"
        ).value =
          data.bairro || "";



        document.getElementById(
          "cidade"
        ).value =
          data.localidade || "";



        document.getElementById(
          "uf"
        ).value =
          data.uf || "";



      }catch(error){


        console.error(
          "Erro CEP:",
          error
        );


      }


    }

  );


}







window.finalizarPedido =
async function(event){


event.preventDefault();



const btn =
document.getElementById(
"btn-finalizar"
);



const msgEl =
document.getElementById(
"checkout-msg"
);



btn.disabled = true;


btn.textContent =
"Processando...";





try{



const user =
await getCurrentUser();



if(!user){

throw new Error(
"Usuário não autenticado."
);

}





const endereco = {


cep:

document
.getElementById(
"cep-endereco"
)
.value.replace(
/\D/g,
""
),



logradouro:

document.getElementById(
"logradouro"
).value,



numero:

document.getElementById(
"numero"
).value,



complemento:

document.getElementById(
"complemento"
).value,



bairro:

document.getElementById(
"bairro"
).value,



cidade:

document.getElementById(
"cidade"
).value,



uf:

document.getElementById(
"uf"
).value



};





const itens =
getCarrinho();





const frete =
JSON.parse(
localStorage.getItem(
"cp_frete_selecionado"
)
)
||
{

servico:"Entrega",

valor:0,

prazo_dias:0

};





const subtotal =
calcularSubtotal();





const total =
subtotal +
Number(
frete.valor || 0
);







const pedidoRef =
db.collection(
"pedidos"
)
.doc();







await pedidoRef.set({


user_id:
user.uid,


endereco,


itens,


subtotal,


valor_frete:
Number(
frete.valor || 0
),



total,



metodo_envio:
frete.servico,



status:
"pendente_pagamento",




pagamento:{


status:
"pendente",


valor:
total



},




created_at:

firebase.firestore
.FieldValue
.serverTimestamp()



});









const resp =
await fetch(

`${window.APP_CONFIG.FUNCTIONS_URL}/infinitypay-checkout`,

{

method:"POST",


headers:{


"Content-Type":
"application/json"


},



body:

JSON.stringify({

id:
pedidoRef.id,


itens,


total,


frete



})


}

);









const resultado =
await resp.json();







if(
!resp.ok ||
resultado.error
){

throw new Error(

resultado.error ||
"Erro ao gerar pagamento."

);

}







localStorage.removeItem(
"cp_frete_selecionado"
);



localStorage.removeItem(
"cp_cep_destino"
);





limparCarrinho();






window.location.href =

resultado.checkout_url ||
resultado.url ||
resultado.link;







}catch(error){



console.error(
"Erro checkout:",
error
);



msgEl.textContent =
error.message;



msgEl.className =
"form-msg error show";



btn.disabled =
false;



btn.textContent =
"Ir para pagamento";



}



};