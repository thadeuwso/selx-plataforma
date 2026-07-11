const DS5 = window.AIONDesignLanguageADL_e674b3;
const { Page: P5, PersonCard: PC5, TextField: TF5, Select: S5, ScoreIndicator: SI5, ActionMenu: AM5 } = DS5;
const D5 = window.selxData;

function ScreenCandidatos({ abrirCandidato }) {
  const [busca, setBusca] = React.useState('');
  const list = D5.candidatos.filter(c => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()));
  return (
    <P5 title="Candidatos" description={`${D5.candidatos.length} candidatos ativos na vaga Analista de dados`}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <TF5 icon="search" placeholder="Buscar por nome…" value={busca} onChange={setBusca} style={{ width: 280 }} />
        <S5 placeholder="Todas as etapas" options={['Triagem', 'Entrevista', 'Proposta', 'Não aprovado']} style={{ width: 180 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        {list.map(c => (
          <PC5 key={c.id} density="rich" name={c.nome} role={c.vaga} status={c.etapa} statusTone={c.tone}
            meta={[c.cidade, `Pretensão ${c.pretensao}`, `Atualizado ${c.atualizado}`]}
            onClick={() => abrirCandidato(c.id)}
            actions={
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <SI5 value={c.score} size="compact" confidence={c.confidence} criteria={c.criteria} />
                <AM5 compact items={[{ label: 'Ver perfil', icon: 'user' }, { label: 'Agendar entrevista', icon: 'calendar' }, '-', { label: 'Encerrar candidatura', icon: 'x', destructive: true }]} />
              </div>
            } />
        ))}
      </div>
    </P5>
  );
}
window.ScreenCandidatos = ScreenCandidatos;
