// js/productDetail.js

let produtoAtual = null;

let estado = {
  personalizado: false,
  cor: "preto",
  texto: "",
  quantidade: 1,
};


// =====================================================
// CARREGAR PRODUTO
// =====================================================

async function carregarDetalheProduto() {

  const id =
    new URLSearchParams(location.search).get("id");


  const container =
    document.getElementById(
      "produto-container"
    );


  if (!id) {

    container.innerHTML =
      `<p class="empty-state">
        Produto não encontrado.
      </p>`;

    return;
  }



  try {

    const doc =
      await db.collection("produtos")
      .doc(id)
      .get();



    if (!doc.exists) {

      container.innerHTML =
        `<p class="empty-state">
          Produto não encontrado.
        </p>`;

      return;
    }



    produtoAtual = {

      id: doc.id,

      ...doc.data()

    };



    console.log(
      "Produto carregado:",
      produtoAtual
    );


    renderizarDetalhe();



  } catch(error) {


    console.error(
      "Erro produto:",
      error
    );


    container.innerHTML =
      `<p class="empty-state">
        Erro ao carregar produto.
      </p>`;

  }

}




// =====================================================
// RENDER PRODUTO
// =====================================================

function renderizarDetalhe() {


  const p =
    produtoAtual;



  const tipoLabel =
    p.tipo === "case"
    ? "Case"
    : "Pasta";



  const imagem =
    p.imagem_base64 ||
    p.imagem_url ||
    "";



  document.title =
    `${p.nome} — Estalise`;




  document.getElementById(
    "produto-container"
  ).innerHTML = `


<div class="gallery">

${
 imagem

 ?

 `<img src="${imagem}" alt="${p.nome}">`

 :

 `<span>${tipoLabel}</span>`

}

</div>



<div class="detail-info">


<span class="tag">
${tipoLabel}
</span>



<h1>
${p.nome}
</h1>




<div class="price" id="preco-dinamico">

${formatarMoeda(
 Number(p.preco_padrao || 0)
)}

</div>




<p class="desc">

${p.descricao || ""}

</p>




${
p.permite_personalizacao

?

`

<div class="option-group">


<label class="title">
Personalização
</label>



<div class="toggle-row">


<div

class="toggle-opt selected"

id="opt-padrao"

onclick="selecionarPersonalizacao(false)"

>

Sem personalização

<br>

<small>

${formatarMoeda(
Number(p.preco_padrao || 0)
)}

</small>


</div>




<div

class="toggle-opt"

id="opt-personalizado"

onclick="selecionarPersonalizacao(true)"

>


Personalizar

<br>


<small>

${formatarMoeda(
Number(p.preco_personalizado || 0)
)}

</small>


</div>



</div>


</div>





<div

class="option-group hidden"

id="campos-personalizacao"

>


<label class="title">

Nome ou texto personalizado

</label>


<input

type="text"

id="texto-personalizado"

class="field"

maxlength="30"

placeholder="Ex: João Silva"

>




<label

class="title"

style="margin-top:20px"

>

Cor

</label>




<div class="color-row">


<div class="color-item">

<div

class="color-swatch selected"

data-color="preto"

onclick="selecionarCor('preto')"

></div>


<div class="color-label">

Preto

</div>

</div>




<div class="color-item">


<div

class="color-swatch"

data-color="marrom"

onclick="selecionarCor('marrom')"

></div>


<div class="color-label">

Marrom

</div>


</div>




<div class="color-item">


<div

class="color-swatch"

data-color="quadriculado"

onclick="selecionarCor('quadriculado')"

></div>


<div class="color-label">

Quadriculado

</div>


</div>



</div>


</div>


`

:

""

}




<div class="qty-row"
style="margin-top:28px">


<label class="title">

Quantidade

</label>



<div class="qty-control">


<button onclick="alterarQtd(-1)">
−
</button>


<span id="qtd-label">

1

</span>


<button onclick="alterarQtd(1)">
+
</button>


</div>


</div>




<button

class="btn btn-primary btn-block"

onclick="handleAdicionarCarrinho()"

>

Adicionar ao carrinho

</button>




<p

id="erro-personalizacao"

class="form-error"

></p>



</div>

`;

}





// =====================================================
// PERSONALIZAÇÃO
// =====================================================


function selecionarPersonalizacao(valor){


estado.personalizado =
valor;



document
.getElementById(
"opt-padrao"
)
?.classList.toggle(
"selected",
!valor
);



document
.getElementById(
"opt-personalizado"
)
?.classList.toggle(
"selected",
valor
);



document
.getElementById(
"campos-personalizacao"
)
?.classList.toggle(
"hidden",
!valor
);



atualizarPreco();

}




function selecionarCor(cor){


estado.cor =
cor;



document
.querySelectorAll(
".color-swatch"
)
.forEach(item=>{


item.classList.remove(
"selected"
);



if(item.dataset.color === cor){

item.classList.add(
"selected"
);

}


});


}





function alterarQtd(valor){


estado.quantidade =
Math.max(
1,
estado.quantidade + valor
);



document.getElementById(
"qtd-label"
).textContent =
estado.quantidade;


}




function atualizarPreco(){


if(!produtoAtual)
return;



const preco =

estado.personalizado

?

Number(
produtoAtual.preco_personalizado || 0
)

:

Number(
produtoAtual.preco_padrao || 0
);



document.getElementById(
"preco-dinamico"
).textContent =
formatarMoeda(preco);


}







// =====================================================
// ADICIONAR AO CARRINHO
// =====================================================


function handleAdicionarCarrinho(){


const erro =
document.getElementById(
"erro-personalizacao"
);


erro.textContent = "";



const texto =

document.getElementById(
"texto-personalizado"
)
?.value || "";





if(
estado.personalizado &&
!texto.trim()
){


erro.textContent =
"Informe o texto da personalização.";


return;

}




const preco =

estado.personalizado

?

Number(
produtoAtual.preco_personalizado || 0
)

:

Number(
produtoAtual.preco_padrao || 0
);





const item = {


produto_id:
produtoAtual.id,



nome:
produtoAtual.nome,



tipo:
produtoAtual.tipo,



preco_unitario:
preco,



quantidade:
Number(
estado.quantidade || 1
),



is_personalizado:
estado.personalizado,



texto_personalizado:
texto,



cor:
estado.cor,



imagem_url:

produtoAtual.imagem_base64 ||

produtoAtual.imagem_url ||

""



};




console.log(
"Produto enviado ao carrinho:",
item
);




adicionarAoCarrinho(item);




alert(
"Produto adicionado ao carrinho!"
);


}