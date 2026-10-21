import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/atoms/logo/logo'
import { Footer } from '@/components/features/landing/components/footer'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Pulso',
  description:
    'Como o Pulso trata dados pessoais e dados de saúde, no site, no sistema e no aplicativo.',
}

/**
 * Exigida pelas duas lojas e pela LGPD.
 *
 * App Store e Play Store pedem uma URL pública de política de privacidade
 * para qualquer app, e **recusam** a submissão sem ela. Dado de saúde é
 * categoria sensível (LGPD, art. 11), então a página precisa dizer o que se
 * coleta, por quê, com quem se compartilha e como a pessoa exerce os
 * direitos dela — não basta um texto genérico de cookies.
 *
 * Vive no site e não no sistema porque a loja precisa alcançá-la sem login.
 */
const UPDATED_AT = '21 de outubro de 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-content-text">{title}</h2>
      {children}
    </section>
  )
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-content-mute">{children}</p>
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5">
      {items.map((item) => (
        <li key={item} className="text-sm leading-relaxed text-content-mute">
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-content-bg">
      <header className="border-b border-content-line px-10 py-5">
        <div className="mx-auto flex max-w-content items-center justify-between">
          <Link href="/" aria-label="Voltar para a página inicial">
            <Logo size="sm" />
          </Link>
          <Link href="/" className="text-sm text-content-mute transition-colors hover:text-terracotta">
            Voltar ao site
          </Link>
        </div>
      </header>

      <article className="mx-auto flex max-w-[720px] flex-col gap-10 px-6 py-14">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-content-text">Política de Privacidade</h1>
          <p className="text-sm text-content-mute">Atualizada em {UPDATED_AT}</p>
        </div>

        <Paragraph>
          O Pulso é um sistema de gestão para clínicas, disponível como site e como aplicativo para
          celular. Esta política explica quais dados tratamos, para quê, e o que você pode exigir de
          nós. Ela vale para o site, para o sistema e para o aplicativo.
        </Paragraph>

        <Section title="Quem é o controlador dos dados">
          <Paragraph>
            Os dados clínicos das pacientes são de responsabilidade da <strong>clínica</strong> que
            contrata o Pulso: é ela quem decide o que registrar e por quanto tempo. O Pulso atua
            como <strong>operador</strong>, tratando esses dados por conta e ordem da clínica, nos
            termos da LGPD (Lei 13.709/2018).
          </Paragraph>
          <Paragraph>
            Dos dados de quem usa o sistema — profissionais, recepção e administradores da clínica —
            o Pulso é controlador, porque é o Pulso quem decide o que guardar para autenticar e
            operar o serviço.
          </Paragraph>
        </Section>

        <Section title="Que dados tratamos">
          <Paragraph>Dados de quem usa o sistema:</Paragraph>
          <List
            items={[
              'Nome, e-mail e perfil de acesso, para autenticar e decidir o que cada pessoa pode ver.',
              'Registro profissional (conselho, número, estado), que assina receitas, atestados e pedidos de exame.',
              'Registros técnicos de acesso, para investigar incidentes de segurança.',
            ]}
          />
          <Paragraph>
            Dados das pacientes, registrados pela clínica — incluindo <strong>dados de saúde</strong>,
            que a LGPD trata como categoria sensível:
          </Paragraph>
          <List
            items={[
              'Identificação e contato: nome, CPF, data de nascimento, telefone, e-mail e endereço.',
              'Agendamentos e histórico de atendimentos.',
              'Prontuários, receitas, atestados, pedidos e resultados de exame.',
              'Imagens clínicas enviadas durante o atendimento e registros de vacinação.',
            ]}
          />
        </Section>

        <Section title="O que o aplicativo acessa no seu aparelho">
          <Paragraph>
            O aplicativo pede permissão apenas quando você usa a função que depende dela, e explica
            o motivo no próprio pedido:
          </Paragraph>
          <List
            items={[
              'Câmera — para registrar imagem clínica durante o atendimento. A foto vai para a consulta e não é salva na galeria.',
              'Fotos e arquivos — para anexar uma imagem já existente ou um laudo em PDF ao atendimento. O acesso é ao arquivo que você escolhe, um a um.',
            ]}
          />
          <Paragraph>
            O aplicativo <strong>não</strong> grava áudio, não acessa localização, contatos, agenda
            ou saúde do aparelho, e não usa rastreadores de publicidade. As credenciais de acesso
            ficam no armazenamento seguro do sistema (Keychain no iOS, Keystore no Android).
          </Paragraph>
        </Section>

        <Section title="Para que usamos">
          <List
            items={[
              'Operar o sistema: autenticar, mostrar agenda, registrar atendimento e emitir documentos.',
              'Enviar lembrete de consulta à paciente, quando a clínica habilita esse canal.',
              'Permitir que uma farmácia confira a autenticidade de uma receita pelo QR Code do rodapé — a verificação pública mostra apenas nome e CPF mascarados, o profissional que assinou e os medicamentos, sem posologia e sem nenhum outro dado clínico.',
              'Cumprir obrigações legais e atender requisições de autoridade competente.',
            ]}
          />
          <Paragraph>
            Não vendemos dados, não os usamos para publicidade e não os compartilhamos com terceiros
            para fins próprios deles.
          </Paragraph>
        </Section>

        <Section title="Com quem compartilhamos">
          <Paragraph>
            Apenas com fornecedores necessários para o serviço funcionar, e só na medida disso:
            hospedagem e banco de dados em nuvem, envio de e-mail transacional e, quando a clínica
            habilita, o canal de mensagem usado no lembrete de consulta. Todos tratam os dados por
            instrução nossa e não podem usá-los para outra finalidade.
          </Paragraph>
        </Section>

        <Section title="Por quanto tempo guardamos">
          <Paragraph>
            Prontuários seguem o prazo da legislação sanitária e das resoluções do conselho
            profissional aplicável, que hoje exigem guarda por no mínimo 20 anos a contar do último
            registro. Os demais dados são mantidos enquanto a clínica usa o Pulso e pelo prazo legal
            aplicável depois disso. Exclusão é apagamento lógico: o registro sai das telas e das
            buscas, e permanece recuperável apenas para cumprir a obrigação de guarda.
          </Paragraph>
        </Section>

        <Section title="Segurança">
          <Paragraph>
            O acesso é autenticado e recortado por perfil, e o servidor recusa toda requisição fora
            do que o perfil permite — esconder um botão na tela nunca é a única barreira. O tráfego é
            cifrado em trânsito, as senhas são guardadas com hash e os dados de cada clínica ficam
            isolados dos de outra. Nenhum dado sensível vai para registros de log.
          </Paragraph>
        </Section>

        <Section title="Seus direitos">
          <Paragraph>
            A LGPD garante a você confirmar a existência de tratamento, acessar seus dados, corrigir
            o que estiver incompleto ou errado, pedir anonimização, bloqueio ou eliminação do que for
            desnecessário, pedir a portabilidade, saber com quem compartilhamos e revogar
            consentimento.
          </Paragraph>
          <Paragraph>
            Se você é paciente, o pedido começa na <strong>clínica que registrou seus dados</strong>,
            que é quem decide sobre eles; podemos ser acionados por ela para executar. Se você usa o
            sistema, fale direto conosco.
          </Paragraph>
        </Section>

        <Section title="Exclusão de conta">
          <Paragraph>
            Contas de acesso ao Pulso são criadas e removidas pela administração da clínica — não há
            cadastro aberto no aplicativo. Para pedir a exclusão da sua conta e dos dados associados,
            fale com a administração da sua clínica ou escreva para{' '}
            <a
              href="mailto:privacidade@pulso.center"
              className="text-terracotta underline underline-offset-2"
            >
              privacidade@pulso.center
            </a>
            . Responderemos em até 15 dias.
          </Paragraph>
        </Section>

        <Section title="Crianças e adolescentes">
          <Paragraph>
            O Pulso é usado por profissionais e pela equipe da clínica. Um paciente menor de idade
            pode ter dados registrados pela clínica, sempre por meio do responsável legal, e no
            interesse do próprio atendimento.
          </Paragraph>
        </Section>

        <Section title="Mudanças nesta política">
          <Paragraph>
            Se mudarmos algo relevante, atualizamos a data no topo e avisamos as clínicas pelos
            canais de contato cadastrados.
          </Paragraph>
        </Section>

        <Section title="Contato">
          <Paragraph>
            Dúvidas sobre privacidade e pedidos de titular:{' '}
            <a
              href="mailto:privacidade@pulso.center"
              className="text-terracotta underline underline-offset-2"
            >
              privacidade@pulso.center
            </a>
            .
          </Paragraph>
        </Section>
      </article>

      <Footer />
    </main>
  )
}
