Quadro kanban de pipeline — estágios configuráveis, cartões de candidato movíveis, score de IA opcional.

```jsx
<PipelineBoard onCardClick={abrir} onMoveCard={mover} stages={[
  { id: 'triagem', label: 'Triagem', cards: [{ id: 'c1', name: 'Ana Souza', role: 'Analista de dados', score: 87 }] },
  { id: 'entrevista', label: 'Entrevista', cards: [] },
]} />
```
