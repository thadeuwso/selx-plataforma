Página — cabeçalho de contexto (título display, descrição, ações) + conteúdo, com largura máxima.

```jsx
<Page title="Vagas" description="Vagas abertas da sua empresa"
  breadcrumb={<Breadcrumb items={[{ label: 'Recrutamento' }, { label: 'Vagas' }]} />}
  actions={<Button icon="plus">Publicar vaga</Button>}>
  …
</Page>
```
