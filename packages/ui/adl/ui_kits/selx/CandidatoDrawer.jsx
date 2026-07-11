const DS4 = window.AIONDesignLanguageADL_e674b3;
const { Drawer: DR4, Tabs: TB4, Avatar: AV4, StatusBadge: SB4, ScoreIndicator: SI4, ListView: LV4, Tag: TG4, Button: B4, ButtonGroup: BG4, Divider: DV4, ProgressBar: PR4, Icon: IC4 } = DS4;
const DC = window.selxData;

/** Detalhe do candidato — padrão "detalhe de entidade" em drawer. */
function CandidatoDrawer({ candidatoId, onClose }) {
  const [tab, setTab] = React.useState('perfil');
  const c = DC.candidatos.find(x => x.id === candidatoId);
  if (!c) return null;
  return (
    <DR4 open={!!candidatoId} title="Detalhe do candidato" onClose={onClose} width={480}
      footer={
        <BG4>
          <B4 variant="secondary" onClick={onClose}>Fechar</B4>
          <B4 icon="calendar">Agendar entrevista</B4>
        </BG4>
      }>
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
        <AV4 name={c.nome} size="xl" />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--type-title-size)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-strong)' }}>{c.nome}</span>
            <SB4 tone={c.tone}>{c.etapa}</SB4>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--type-support-size)', marginTop: 2 }}>{c.vaga} · {c.cidade}</div>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <SI4 value={c.score} confidence={c.confidence} criteria={c.criteria} />
          </div>
        </div>
      </div>
      <TB4 active={tab} onChange={setTab} style={{ margin: 'var(--space-5) 0 var(--space-4)' }} tabs={[
        { id: 'perfil', label: 'Perfil' },
        { id: 'historico', label: 'Histórico', count: DC.timeline.length },
      ]} />
      {tab === 'perfil' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-2)' }}>Resumo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2) var(--space-4)', fontSize: 'var(--type-support-size)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pretensão salarial</span><span style={{ color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}>{c.pretensao}</span>
              <span style={{ color: 'var(--text-muted)' }}>Atualizado</span><span style={{ color: 'var(--text-body)' }}>{c.atualizado}</span>
              <span style={{ color: 'var(--text-muted)' }}>Origem</span><span style={{ color: 'var(--text-body)' }}>Página de carreiras</span>
            </div>
          </div>
          <DV4 spacing="0px" />
          <div>
            <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-2)' }}>Habilidades</div>
            <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
              <TG4>SQL</TG4><TG4>Python</TG4><TG4>Power BI</TG4><TG4>dbt</TG4><TG4>Inglês intermediário</TG4>
            </div>
          </div>
          <DV4 spacing="0px" />
          <div style={{ background: 'var(--ai-surface)', border: '1px solid var(--ai-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--type-caption-size)', color: 'var(--ai-text)', marginBottom: 'var(--space-3)' }}>
              <IC4 name="sparkles" size={12} /> Análise gerada por IA · confiança {c.confidence}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {c.criteria.map(cr => <PR4 key={cr.label} label={cr.label} value={cr.value} tone={cr.value >= 75 ? 'success' : cr.value >= 50 ? 'warning' : 'danger'} />)}
            </div>
            <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>A IA sugere — a decisão é sua e fica registrada no histórico.</div>
          </div>
        </div>
      ) : (
        <LV4 items={DC.timeline} />
      )}
    </DR4>
  );
}
window.CandidatoDrawer = CandidatoDrawer;
