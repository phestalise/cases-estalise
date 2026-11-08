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

    aplicarModoSomentePersonalizado();

    // Começa com a cor do próprio produto e carrega as fotos das outras cores
    fotosPorCor = {};
    const corInicial = corDoNome(produtoAtual.nome);
    const fotoInicial = produtoAtual.imagem_base64 || produtoAtual.imagem_url;
    if (corInicial && fotoInicial) fotosPorCor[corInicial] = fotoInicial;
    if (corInicial) selecionarCor(corInicial);
    carregarFotosPorCor();

    const promoGaleria = promoPersonalizado(produtoAtual);
    if (promoGaleria) {
      document.querySelector(".gallery")?.insertAdjacentHTML(
        "beforeend",
        `<span class="bf-fita">Black Friday · -${promoGaleria.pct}%</span>`
      );
    }



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

${promoPersonalizado(p)
  ? htmlPrecoPromo(promoPersonalizado(p), formatarMoeda)
  : formatarMoeda(Number(p.preco_personalizado || 0))}

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


// Black Friday: remove a opção "Sem personalização" e já deixa
// o produto selecionado como personalizado.
function aplicarModoSomentePersonalizado(){

  if(!somentePersonalizado(produtoAtual) || !produtoAtual.permite_personalizacao)
    return;

  document.getElementById("opt-padrao")?.remove();

  const opt = document.getElementById("opt-personalizado");
  if (opt) {
    opt.removeAttribute("onclick");
    opt.style.cursor = "default";
    opt.querySelector("br")?.insertAdjacentHTML(
      "beforebegin",
      ' <span class="bf-pct" style="font-size:10px">Black Friday</span>'
    );
  }

  selecionarPersonalizacao(true);
}


function selecionarPersonalizacao(valor){

// Na Black Friday não existe a versão sem personalização
if(!valor && somentePersonalizado(produtoAtual) && produtoAtual.permite_personalizacao)
  valor = true;


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


trocarFotoPorCor(cor);

}


// =====================================================
// FOTO POR COR
// Cada cor é um produto separado no banco (ex.: "Case Marrom",
// "Case Preta"). Ao escolher a cor, mostramos a foto do produto
// do mesmo tipo naquela cor.
// =====================================================

let fotosPorCor = {};

const NOMES_COR = { preto: "Preto", marrom: "Marrom", quadriculado: "Quadriculado" };

function corDoNome(nome){
  const n = String(nome || "").toLowerCase();
  if (n.includes("quadricul")) return "quadriculado";
  if (n.includes("marrom")) return "marrom";
  if (n.includes("pret")) return "preto";
  return null;
}

async function carregarFotosPorCor(){
  if (!produtoAtual?.tipo) return;
  try {
    const snap = await db.collection("produtos")
      .where("tipo", "==", produtoAtual.tipo)
      .get();
    snap.forEach((doc) => {
      const d = doc.data();
      if (d.ativo === false) return;
      const cor = corDoNome(d.nome);
      const foto = d.imagem_base64 || d.imagem_url;
      // a foto do próprio produto tem prioridade
      if (cor && foto && (!fotosPorCor[cor] || doc.id === produtoAtual.id)) {
        fotosPorCor[cor] = foto;
      }
    });
    // se o cliente já trocou de cor enquanto carregava, atualiza a foto
    trocarFotoPorCor(estado.cor);
  } catch (e) {
    console.warn("Não foi possível carregar as fotos das outras cores:", e);
  }
}

function trocarFotoPorCor(cor){
  const galeria = document.querySelector(".gallery");
  const img = galeria?.querySelector("img");
  if (!galeria || !img) return;

  let nota = galeria.querySelector(".gallery-nota");
  const foto = fotosPorCor[cor];

  if (!foto) {
    // Não há foto dessa cor: mantém a atual e avisa
    if (!nota) {
      nota = document.createElement("span");
      nota.className = "gallery-nota";
      galeria.appendChild(nota);
    }
    nota.textContent = `Foto ilustrativa · será feita na cor ${NOMES_COR[cor] || cor}`;
    return;
  }

  nota?.remove();
  if (img.getAttribute("src") === foto) return;

  img.classList.add("trocando");
  setTimeout(() => {
    img.onload = () => img.classList.remove("trocando");
    img.onerror = () => img.classList.remove("trocando");
    img.src = foto;
  }, 180);
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



const promo =
estado.personalizado ? promoPersonalizado(produtoAtual) : null;

const preco =

estado.personalizado

?

precoPersonalizadoAtual(produtoAtual)

:

Number(
produtoAtual.preco_padrao || 0
);



const precoEl = document.getElementById("preco-dinamico");

if (promo) {
  precoEl.innerHTML = htmlPrecoPromo(promo, formatarMoeda);
} else {
  precoEl.textContent = formatarMoeda(preco);
}


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

precoPersonalizadoAtual(produtoAtual)

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

// preço normal (sem Black Friday), para o carrinho voltar ao valor
// certo quando a promoção acabar
preco_normal:
estado.personalizado
  ? Number(produtoAtual.preco_personalizado || 0)
  : undefined,



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