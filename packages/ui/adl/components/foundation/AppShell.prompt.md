Estrutura-mestre de aplicação AION: nav lateral fixa 240px + área de trabalho; use como raiz de qualquer produto.

```jsx
<AppShell product="SelX" tenant="Empresa Exemplo" activeItem="vagas"
  nav={[{ section: 'Recrutamento' }, { id: 'vagas', label: 'Vagas', icon: 'briefcase' }]}
  user={{ name: 'Ana Souza', role: 'Analista de RH' }}>
  <Page title="Vagas">…</Page>
</AppShell>
```

Itens com `{section}` viram agrupadores. Marca em tipografia pura (não há logo).
