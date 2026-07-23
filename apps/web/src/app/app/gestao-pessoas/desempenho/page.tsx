"use client";
import { useState } from "react";
import { Abas } from "@/componentes/formulario";
import { CiclosDesempenho } from "@/componentes/ciclos-desempenho";
import { DesempenhoVisaoGeral } from "@/componentes/desempenho-visao-geral";

export default function PaginaDesempenho() {
  const [aba, setAba] = useState("visao");

  return (
    <main style={{ padding: 32, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 16px" }}>Avaliação de desempenho</h1>
      <Abas
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { id: "visao", rotulo: "Visão geral" },
          { id: "ciclos", rotulo: "Avaliação de desempenho" },
        ]}
      />
      <div style={{ marginTop: 24 }}>
        {aba === "visao" ? <DesempenhoVisaoGeral /> : <CiclosDesempenho />}
      </div>
    </main>
  );
}
