async function finalizarPedido(event) {
  event.preventDefault();

  const btn = document.getElementById("btn-finalizar");
  const msgEl = document.getElementById("checkout-msg");

  btn.disabled = true;
  btn.textContent = "Processando...";

  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    const endereco = {
      cep:
        document
          .getElementById("cep-endereco")
          .value.replace(/\D/g, ""),

      logradouro:
        document.getElementById("logradouro")
          .value || "",

      numero:
        document.getElementById("numero")
          .value || "",

      complemento:
        document.getElementById("complemento")
          .value || "",

      bairro:
        document.getElementById("bairro")
          .value || "",

      cidade:
        document.getElementById("cidade")
          .value || "",

      uf:
        document.getElementById("uf")
          .value || ""
    };

    const itens = getCarrinho();

    const frete =
      JSON.parse(
        localStorage.getItem(
          "cp_frete_selecionado"
        )
      ) || {
        servico: "Entrega",
        valor: 0,
        prazo_dias: 0
      };

    const subtotal =
      calcularSubtotal();

    const total =
      subtotal + frete.valor;

    const itensSalvos =
      itens.map((i) => ({
        produto_id:
          i.produto_id || "",

        nome:
          i.nome || "",

        tipo:
          i.tipo || "",

        imagem_url:
          i.imagem_url || "",

        quantidade:
          i.quantidade || 1,

        preco_unitario:
          i.preco_unitario || 0,

        is_personalizado:
          !!i.is_personalizado,

        personalizacao:
          i.is_personalizado
            ? {
                texto_personalizado:
                  i.texto_personalizado ||
                  "",

                cor:
                  i.cor || ""
              }
            : null
      }));

    const pedidoRef =
      db.collection("pedidos").doc();

    await pedidoRef.set({
      user_id:
        user.uid,

      endereco,

      itens:
        itensSalvos,

      subtotal,

      valor_frete:
        frete.valor || 0,

      total,

      metodo_envio:
        frete.servico || "",

      status:
        "pendente_pagamento",

      codigo_rastreio:
        "",

      pagamento: {
        status:
          "pendente",

        metodo:
          "",

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
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              id:
                pedidoRef.id,

              itens:
                itensSalvos,

              total
            })
        }
      );

    const resultado =
      await resp.json();

    console.log(resultado);

    if (
      !resp.ok ||
      resultado.error
    ) {
      throw new Error(
        resultado.error ||
        "Erro ao gerar pagamento."
      );
    }

    limparCarrinho();

    localStorage.removeItem(
      "cp_frete_selecionado"
    );

    localStorage.removeItem(
      "cp_cep_destino"
    );

    window.location.href =
      resultado.checkout_url ||
      resultado.url ||
      resultado.link;
  }
  catch (e) {

    console.error(e);

    msgEl.textContent =
      e.message;

    msgEl.className =
      "form-msg error show";

    btn.disabled =
      false;

    btn.textContent =
      "Ir para pagamento";
  }
}