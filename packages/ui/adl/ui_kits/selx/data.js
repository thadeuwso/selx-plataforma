// Dados de exemplo do SelX 2.0 (fake, pt-BR)
const selxData = {
  vagas: [
    { id: 'v1', titulo: 'Analista de dados', area: 'Tecnologia', local: 'São Paulo — SP · Híbrido', candidaturas: 34, status: 'Aberta', tone: 'success', publicada: 'há 12 dias' },
    { id: 'v2', titulo: 'Analista de RH pleno', area: 'Pessoas', local: 'Remoto', candidaturas: 58, status: 'Aberta', tone: 'success', publicada: 'há 8 dias' },
    { id: 'v3', titulo: 'Product designer', area: 'Produto', local: 'São Paulo — SP · Híbrido', candidaturas: 91, status: 'Em triagem', tone: 'info', publicada: 'há 21 dias' },
    { id: 'v4', titulo: 'Desenvolvedor(a) back-end sênior', area: 'Tecnologia', local: 'Remoto', candidaturas: 47, status: 'Aberta', tone: 'success', publicada: 'há 5 dias' },
    { id: 'v5', titulo: 'Coordenador(a) de folha', area: 'Pessoas', local: 'Campinas — SP · Presencial', candidaturas: 12, status: 'Pausada', tone: 'warning', publicada: 'há 30 dias' },
    { id: 'v6', titulo: 'Estágio em análise de dados', area: 'Tecnologia', local: 'São Paulo — SP · Híbrido', candidaturas: 143, status: 'Encerrada', tone: 'neutral', publicada: 'há 60 dias' },
  ],
  candidatos: [
    { id: 'c1', nome: 'Ana Souza', vaga: 'Analista de dados', etapa: 'Entrevista', tone: 'info', score: 87, confidence: 'alta', pretensao: 'R$ 7.500', cidade: 'São Paulo — SP', atualizado: 'há 2 dias', criteria: [{ label: 'Experiência com dados', value: 92 }, { label: 'SQL e modelagem', value: 88 }, { label: 'Inglês', value: 60 }] },
    { id: 'c2', nome: 'Bruno Lima', vaga: 'Analista de dados', etapa: 'Triagem', tone: 'neutral', score: 74, confidence: 'média — poucos dados', pretensao: 'R$ 6.800', cidade: 'Osasco — SP', atualizado: 'há 1 dia', criteria: [{ label: 'Experiência com dados', value: 78 }, { label: 'SQL e modelagem', value: 81 }, { label: 'Inglês', value: 55 }] },
    { id: 'c3', nome: 'Carla Mendes', vaga: 'Analista de dados', etapa: 'Proposta', tone: 'success', score: 91, confidence: 'alta', pretensao: 'R$ 8.200', cidade: 'São Paulo — SP', atualizado: 'há 4 horas', criteria: [{ label: 'Experiência com dados', value: 95 }, { label: 'SQL e modelagem', value: 90 }, { label: 'Inglês', value: 82 }] },
    { id: 'c4', nome: 'Diego Alves', vaga: 'Analista de dados', etapa: 'Triagem', tone: 'neutral', score: 66, confidence: 'média', pretensao: 'R$ 6.200', cidade: 'Guarulhos — SP', atualizado: 'há 3 dias', criteria: [{ label: 'Experiência com dados', value: 70 }, { label: 'SQL e modelagem', value: 64 }, { label: 'Inglês', value: 58 }] },
    { id: 'c5', nome: 'Elisa Rocha', vaga: 'Analista de dados', etapa: 'Entrevista', tone: 'info', score: 82, confidence: 'alta', pretensao: 'R$ 7.900', cidade: 'São Paulo — SP', atualizado: 'há 6 horas', criteria: [{ label: 'Experiência com dados', value: 85 }, { label: 'SQL e modelagem', value: 80 }, { label: 'Inglês', value: 75 }] },
    { id: 'c6', nome: 'Felipe Nogueira', vaga: 'Analista de dados', etapa: 'Não aprovado', tone: 'danger', score: 41, confidence: 'alta', pretensao: 'R$ 5.900', cidade: 'Santo André — SP', atualizado: 'há 5 dias', criteria: [{ label: 'Experiência com dados', value: 38 }, { label: 'SQL e modelagem', value: 45 }, { label: 'Inglês', value: 40 }] },
  ],
  timeline: [
    { id: 1, title: 'Movida para Entrevista', description: 'por Marina Castro', meta: 'há 2 dias' },
    { id: 2, title: 'Análise de IA concluída', description: 'Match 87 · confiança alta', meta: 'há 4 dias' },
    { id: 3, title: 'Triagem aprovada', description: 'por Marina Castro', meta: 'há 4 dias' },
    { id: 4, title: 'Candidatura recebida', description: 'via página de carreiras', meta: 'há 9 dias' },
  ],
  nav: [
    { section: 'Geral' },
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { section: 'Recrutamento' },
    { id: 'vagas', label: 'Vagas', icon: 'briefcase' },
    { id: 'pipeline', label: 'Pipeline', icon: 'kanban' },
    { id: 'candidatos', label: 'Candidatos', icon: 'users' },
    { section: 'Configurações' },
    { id: 'equipe', label: 'Equipe', icon: 'user' },
    { id: 'ajustes', label: 'Ajustes', icon: 'settings' },
  ],
};
window.selxData = selxData;
