const DS3 = window.AIONDesignLanguageADL_e674b3;
const { Page: P3, PipelineBoard: PB3, Select: S3, Button: B3, Toast: T3 } = DS3;
const DP = window.selxData;

function ScreenPipeline({ abrirCandidato }) {
  const build = () => {
    const stages = [
      { id: 'triagem', label: 'Triagem', cards: [] },
      { id: 'entrevista', label: 'Entrevista', cards: [] },
      { id: 'proposta', label: 'Proposta', cards: [] },
      { id: 'nao-aprovado', label: 'Não aprovado', cards: [] },
    ];
    const map = { 'Triagem': 'triagem', 'Entrevista': 'entrevista', 'Proposta': 'proposta', 'Não aprovado': 'nao-aprovado' };
    DP.candidatos.forEach(c => {
      const st = stages.find(s => s.id === map[c.etapa]);
      if (st) st.cards.push({ id: c.id, name: c.nome, role: c.cidade, score: c.score, confidence: c.confidence, criteria: c.criteria });
    });
    return stages;
  };
  const [stages, setStages] = React.useState(build);
  const [toast, setToast] = React.useState(null);

  const mover = (cardId, toStageId) => {
    setStages(prev => {
      let card = null;
      const sem = prev.map(s => {
        const found = (s.cards || []).find(c => c.id === cardId);
        if (found) card = found;
        return { ...s, cards: s.cards.filter(c => c.id !== cardId) };
      });
      if (!card) return prev;
      const next = sem.map(s => s.id === toStageId ? { ...s, cards: [...s.cards, card] } : s);
      const stage = next.find(s => s.id === toStageId);
      setToast(`${card.name} movido(a) para ${stage.label}.`);
      return next;
    });
  };

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <P3 title="Pipeline — Analista de dados" description="6 candidatos ativos · arraste os cartões entre estágios"
      maxWidth="none"
      actions={
        <>
          <S3 options={['Analista de dados', 'Analista de RH pleno', 'Product designer']} defaultValue="Analista de dados" style={{ width: 220 }} />
          <B3 variant="secondary" icon="user-plus">Adicionar candidato</B3>
        </>
      }>
      <PB3 stages={stages} onMoveCard={mover}
        onCardClick={(card) => abrirCandidato(card.id)} />
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200 }}>
          <T3 message={toast} actionLabel="Desfazer" onDismiss={() => setToast(null)} />
        </div>
      )}
    </P3>
  );
}
window.ScreenPipeline = ScreenPipeline;
