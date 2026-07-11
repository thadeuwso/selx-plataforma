Tabela de dados — o componente mais crítico da família AION. Ordenação, seleção em lote, densidade compacta, algarismos tabulares.

```jsx
<DataTable compact selectable
  columns={[
    { key: 'nome', label: 'Candidato', sortable: true },
    { key: 'vaga', label: 'Vaga' },
    { key: 'salario', label: 'Pretensão', numeric: true },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge tone={r.tone}>{r.status}</StatusBadge> },
  ]}
  rows={rows} onRowClick={abrirDetalhe}
  emptyState={<EmptyState title="Nenhuma candidatura ainda" description="Divulgue a vaga para começar a receber." />}
/>
```
