// Telas do SelX 2.0 — compõem os componentes ADL via window.AIONDesignLanguageADL_e674b3
const DS = window.AIONDesignLanguageADL_e674b3;
const { Page, Card, Button, ButtonGroup, ActionMenu, TextField, Select, DataTable, StatusBadge, Stat, KpiCard, Tag, Tabs, Breadcrumb, Pagination, GlobalSearch, EmptyState, Alert, ListView, PersonCard, PipelineBoard, ScoreIndicator, Drawer, ConfirmDialog, Avatar, ProgressBar, Divider, Icon } = DS;
const D = window.selxData;

function ScreenDashboard({ go }) {
  return (
    <Page title="Bom dia, Marina" description="Resumo do recrutamento da Empresa Exemplo — atualizado há 5 minutos.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        <KpiCard label="Vagas abertas" value="14" delta="+2" period="no mês" />
        <KpiCard label="Candidaturas no mês" value="1.284" delta="+12%" period="vs. mês anterior" />
        <KpiCard label="Tempo médio de contratação" value="23 dias" delta="-4 dias" deltaDirection="up" period="vs. trimestre anterior" />
        <KpiCard label="Entrevistas esta semana" value="9" period="3 hoje" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)', alignItems: 'start' }}>
        <Card title="Pendências" actions={<Button variant="subtle" size="compact" onClick={() => go('candidatos')}>Ver todas</Button>}>
          <Alert tone="warning" title="12 candidaturas aguardam triagem há mais de 5 dias"
            action={<Button variant="secondary" size="compact" onClick={() => go('pipeline')}>Ir para o pipeline</Button>}
            style={{ marginBottom: 'var(--space-4)' }} />
          <ListView
            items={[
              { id: 1, title: 'Entrevista com Ana Souza', description: 'Analista de dados · com você e Paulo Reis', meta: 'hoje, 14h' },
              { id: 2, title: 'Proposta de Carla Mendes expira', description: 'Analista de dados · enviada há 5 dias', meta: 'em 2 dias' },
              { id: 3, title: 'Feedback de entrevista pendente', description: 'Elisa Rocha · entrevistada há 2 dias', meta: 'atrasado' },
            ]}
            onItemClick={() => go('candidatos')}
          />
        </Card>
        <Card title="Funil do mês">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <ProgressBar label="Candidaturas" value={100} showValue={false} />
            <ProgressBar label="Triagem" value={46} showValue={false} />
            <ProgressBar label="Entrevista" value={18} showValue={false} />
            <ProgressBar label="Proposta" value={6} showValue={false} tone="success" />
            <Divider spacing="var(--space-2)" />
            <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--text-subtle)' }}>1.284 candidaturas → 77 propostas · conversão de 6%</div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
window.ScreenDashboard = ScreenDashboard;
