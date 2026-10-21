# Changelog — Mobile

## [0.3.0] - 2026-10-21

Câmera, arquivos e a porta das lojas. Com isto os dois motivos declarados do
app estão atendidos: usar a câmera no atendimento, e estar publicável.

### Added
- **Foto pela câmera.** Na web o botão abre um seletor de arquivo; aqui abre a
  câmera, com o pedido de permissão no momento do uso — o sistema mostra o
  motivo junto do pedido, que é o que faz a pessoa aceitar. Desistir e ter a
  permissão negada são coisas diferentes, e a tela as separa: a primeira não
  diz nada, a segunda explica onde liberar
- **Receita, atestado, pedido de exame e indicação de vacina**: emitir, ler,
  baixar e excluir. O PDF já era gerado pelo backend — o que mudou é a
  entrega, de `createObjectURL` para `expo-file-system` mais `expo-sharing`
- **Resultado de exame**: anexar arquivo do aparelho, baixar e remover. Tipo
  e tamanho são conferidos **antes** do envio, como na web: o backend
  recusaria depois, e 10 MB por rede de celular é caro para descobrir isso no
  fim. O anexo é baixado com o tipo que tem, não sempre como PDF — entregar
  uma foto anunciando `application/pdf` faz o aparelho oferecer o aplicativo
  errado para abri-la
- **Caderneta de vacinação e indicação de vacina**, que seguem eixos
  diferentes de permissão e por isso são duas seções, não uma
- **Agendar, bloquear horário e trocar profissional** pela agenda
- **Rótulo da consulta**, marcado no cartão do topo, com amostra de cor
- **Histórico de prontuários** que expande e busca por conteúdo
- **PDF do prontuário**, que é leitura e sai sem bloco de assinatura
- **Política de privacidade** publicada em `pulso.center/privacidade`, com a
  seção de exclusão de dados que a Apple pede
- **Tela de abertura com fundo nos dois temas.** Antes o app abria num branco
  fixo e só então pintava a interface, que no modo escuro é azul-marinho — o
  pulo aparecia em todo lançamento
- **`eas.json`** com os três perfis de build, e
  `docs/MOBILE_STORE_RUNBOOK.md` com o que depende de conta e não de código
- **As permissões, os textos de uso e a tela de abertura têm teste**
  (`src/tests/app-config.spec.ts`). O manifesto gerado é `.gitignore`: se um
  bloco sumir do `app.config.ts`, só o teste avisa — e o custo de descobrir na
  submissão é um ciclo de revisão
- **Os scripts `android` e `ios` também têm teste.** `expo prebuild` e
  `expo install --fix` os reescrevem para `expo run:*` sem avisar, e isso
  troca "servir pelo Metro para o Expo Go" por "compilar nativamente", que
  exige Xcode ou o SDK do Android

### Changed
- **Permissão de papel na tela de detalhe.** O app mostrava as oito abas e os
  botões de cancelar e concluir a **qualquer** papel; uma recepcionista via
  Prontuário, Receitas e Fotos e colhia `403`. Agora a fileira de abas só
  monta o que a pessoa alcança
- **O app pede três permissões no Android** — internet, câmera e leitura de
  imagens. Eram nove: o seletor de imagem do Expo pede gravação de áudio (para
  vídeo) e as de armazenamento legado por padrão, e nada no app faz isso. Num
  app de saúde cada permissão vira uma linha no formulário de Segurança dos
  Dados do Google; declarar gravação de áudio que não existe é, na melhor
  hipótese, risco de reprovação
- **Os textos de permissão do iOS passaram a existir.** Sem eles a Apple
  rejeita — e, pior, o app **encerra** no instante em que a câmera abre

### Fixed
- **O cabeçalho ficava sob a barra de status no Android**, e o avatar de sair
  não recebia toque. Achado rodando os fluxos Maestro num emulador, não em
  teste de unidade
- **Concluir e cancelar voltaram a funcionar em consulta confirmada.** O
  backend sempre aceitou os dois estados; a web exigia "agendada" e escondia
  as ações. A regra virou uma função só, no `@app/shared`, lida pelos dois
  use-cases do backend, pela web e pelo app

### Tooling
- `yarn workspace @app/mobile test` **terminava**. Qualquer spec que renderiza
  deixa um handle que nem `--detectOpenHandles` atribui — vem do runtime do
  `jest-expo`, não do app. O comando ficava pendurado depois de imprimir o
  resultado, e numa rodada que falha ficava pendurado para sempre, escondendo
  justamente o erro que se foi procurar
- `yarn workspace @app/mobile doctor` chamava um binário que não existe

### Notes
- Ainda **não submetido**. O que falta exige conta de desenvolvedor, cartão e
  aceite de contrato — está listado em `docs/MOBILE_STORE_RUNBOOK.md`
- **A assinatura de release não mora no repositório** e não deve morar: a EAS
  gera e guarda o keystore no primeiro build de produção

## [0.2.0] - 2026-10-13

O dia de atendimento: agenda, consulta e prontuário. Com isto o app deixa de
provar o caminho e passa a servir ao profissional entre uma paciente e outra —
ainda sem câmera e ainda fora das lojas.

### Added
- **Agenda do dia**, com navegação por dia e atalho de volta para hoje. Lista
  as consultas, não os horários livres: quem está de pé entre pacientes quer a
  fila, e vinte linhas de "Livre" seriam ruído numa tela de seis polegadas. O
  recorte por profissional é do servidor, como na web
- **Faixa colorida do rótulo** em cada linha, com a mesma paleta da web — os
  dezesseis hexadecimais saíram do `globals.css` para o `@app/shared`, e um
  spec do frontend compara os dois para a divergência falhar em teste. Um
  "Mostarda" diferente de cada lado derrubaria justamente o que o rótulo faz,
  que é ser reconhecido de relance
- **Consulta cancelada continua na lista**, esmaecida e riscada. Sumir sem
  rastro faz procurar o horário que se lembra de ter visto
- **Detalhe da consulta**: paciente (com idade calculada, não data de
  nascimento), dados do atendimento, selo de primeira vez, concluir e cancelar
- **Prontuário**: escolher o modelo, preencher os campos do schema, corrigir
  depois. Campos de escolha como pastilhas à vista, não como picker nativo —
  as listas são curtas e marcar vira um toque só
- Fluxos **Maestro** para os três caminhos (`maestro/`)

### Changed
- A camada de dados de consultas, prontuários e modelos passou a vir do
  **`@app/core`**, compartilhada com a web. O app não reimplementa service,
  use-case nem mapper
- `PATIENT_GENDER_LABELS` saiu de dois componentes da web para o `@app/shared`

### Notes
- **Concluir não aparece em consulta futura.** O backend recusa com `422`, e
  oferecer o botão seria oferecer um caminho que só termina em erro
- **Cancelar atinge só esta ocorrência**, nunca a série. Do celular é fácil
  demais fazer sem querer, e desfazer exige reagendar uma por uma
- **Campo de data é texto com o formato no placeholder.** O seletor nativo é
  fase 3; uma máscara fingindo um date picker seria pior
- **Os fluxos Maestro nunca foram executados** — exigem simulador ou aparelho
  com o app instalado. São revisáveis, não verdes. Quem prova o comportamento
  hoje é a suíte de unidade e integração

### Testing
- 171 testes, 100% de linha, ramo e função, com o limiar travado no jest
- Seis defeitos injetados e cada um pego pelo teste pretendido: data da agenda
  em UTC, agenda sem ordenação, campo em branco gravando string vazia,
  cancelamento atingindo a série, seletor de modelo reaparecendo em prontuário
  salvo, e o bootstrap esquecendo de registrar o cliente HTTP

## [0.1.0] - 2026-10-13

Fundação do app. Ainda não vai para loja nenhuma: o que esta versão entrega é a
camada que as telas da fase 2 em diante vão consumir, provada de ponta a ponta
por um login real contra o backend.

### Added
- **`apps/mobile`, app Expo no mesmo workspace**, consumindo `@app/shared`. Managed workflow com Continuous Native Generation — `ios/` e `android/` não existem no repositório e não devem ser criados à mão
- **Login com seletor de clínica**, pelos endpoints `/auth/token*` do backend. O slug só existe nesta tela: dali em diante o `clinicId` vem do próprio JWT, e o app não manda `x-clinic-slug` em requisição nenhuma
- **Sessão no `expo-secure-store`** (Keychain no iOS, Keystore no Android). `AsyncStorage` entraria em backup do aparelho em texto claro, levando junto sete dias de acesso a prontuário. Access e refresh token são lidos como par: um sem o outro é sessão quebrada, não parcial, e o app trataria como logado até a primeira requisição falhar
- **`api-client` com renovação de voo único.** O backend rotaciona o refresh token — emitir um novo revoga o anterior —, então várias telas expirando juntas disparavam refreshes concorrentes e as perdedoras caíam no login no meio de uma sessão válida. É bug já pago na web; no celular é a regra, não a exceção, porque o app volta do segundo plano com tudo vencido ao mesmo tempo. A renovação usa uma instância sem interceptors, senão o 401 do próprio refresh dispararia outro
- **Tema da clínica derivado de `@app/shared`**, das mesmas quatro funções que a web usa. O que muda é só a entrega: lá, variáveis CSS; aqui, um contexto. A escala de raio sai em número, convertida uma vez na borda — `borderRadius: '16px'` é ignorado em silêncio pelo React Native, o canto fica reto e nada avisa

### Testing
- 41 testes, 100% de cobertura de linha, ramo e função. Quatro defeitos injetados (raio em string, `useTheme` devolvendo padrão em vez de lançar, verbo HTTP trocado, URL de API chutada) e cada um pego pelo teste pretendido
- `tsconfig.json` declara `types: ["jest"]`: o `@types` do monorepo é compartilhado e o app herdaria os tipos de `express` e `bcrypt`, que não existem em runtime nenhum do celular
