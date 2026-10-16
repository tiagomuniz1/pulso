# Changelog — Mobile

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
