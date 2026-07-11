const DS2 = window.AIONDesignLanguageADL_e674b3;
const { Page: P2, Button: B2, DataTable: DT2, StatusBadge: SB2, TextField: TF2, Select: S2, Pagination: PG2, ActionMenu: AM2, EmptyState: ES2, ConfirmDialog: CD2 } = DS2;
const DV = window.selxData;

function ScreenVagas({ go, abrirCandidato }) {
  const [busca, setBusca] = React.useState('');
  const [area, setArea] = React.useState('');
  const [sel, setSel] = React.useState([]);
  const [confirm, setConfirm] = React.useState(false);
  const rows = DV.vagas.filter(v =>
    (!busca || v.titulo.toLowerCase().includes(busca.toLowerCase())) &&
    (!area || v.area === area));
  return (
    <P2 title="Vagas" description="14 vagas abertas · 6 exibidas"
      actions={<B2 icon="plus">Publicar vaga</B2>}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', alignItems: 'flex-end' }}>
        <TF2 icon="search" placeholder="Buscar por título…" value={busca} onChange={setBusca} style={{ width: 280 }} />
        <S2 placeholder="Todas as áreas" value={area} onChange={setArea} options={['Tecnologia', 'Pessoas', 'Produto']} style={{ width: 180 }} />
        {sel.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginLeft: 'auto' }}>
            <span style={{ fontSize: 'var(--type-support-size)', color: 'var(--text-muted)' }}>{sel.length} selecionada{sel.length > 1 ? 's' : ''}</span>
            <B2 variant="secondary" size="compact" icon="pause">Pausar</B2>
            <B2 variant="destructive" size="compact" icon="trash-2" onClick={() => setConfirm(true)}>Encerrar</B2>
          </div>
        )}
      </div>
      <DT2 selectable selected={sel} onSelectionChange={setSel}
        columns={[
          { key: 'titulo', label: 'Vaga', sortable: true },
          { key: 'area', label: 'Área' },
          { key: 'local', label: 'Local' },
          { key: 'candidaturas', label: 'Candidaturas', numeric: true },
          { key: 'publicada', label: 'Publicada' },
          { key: 'status', label: 'Status', render: (r) => <SB2 tone={r.tone}>{r.status}</SB2> },
          { key: 'acoes', label: '', render: () => <AM2 compact items={[{ label: 'Editar vaga', icon: 'pencil' }, { label: 'Duplicar', icon: 'copy' }, '-', { label: 'Encerrar vaga', icon: 'trash-2', destructive: true }]} /> },
        ]}
        rows={rows}
        onRowClick={() => go('pipeline')}
        emptyState={<ES2 icon="search-x" title="Nenhuma vaga encontrada" description="Ajuste a busca ou os filtros para ver resultados." />}
      />
      <PG2 page={1} pageCount={1} total={rows.length} pageSize={25} style={{ marginTop: 'var(--space-4)' }} />
      <CD2 open={confirm} destructive title="Encerrar vagas selecionadas"
        description={`${sel.length} vaga(s) serão encerradas e deixarão de receber candidaturas. As candidaturas existentes são mantidas.`}
        confirmLabel="Encerrar vagas" onConfirm={() => { setConfirm(false); setSel([]); }} onCancel={() => setConfirm(false)} />
    </P2>
  );
}
window.ScreenVagas = ScreenVagas;
