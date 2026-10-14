import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { httpClient } from './api-client'

/**
 * Baixa um PDF e entrega ao sistema.
 *
 * Na web isto é `createObjectURL` mais um `<a download>`; aqui não há disco do
 * usuário para escrever. O arquivo vai para o cache do app e sobe a folha de
 * compartilhamento — de onde a pessoa salva nos Arquivos, manda no WhatsApp ou
 * imprime. É o caminho que o sistema oferece, e não um que a gente inventa.
 *
 * Vai pelo `httpClient` e não pelo `apiClient`: o PDF precisa de
 * `responseType`, que a interface enxuta não carrega. Passar por ele mantém o
 * `Bearer` e a renovação de voo único — baixar com o token vencido é comum,
 * porque o documento se baixa no fim do atendimento.
 */
export async function downloadAndShareDocument(path: string, fileName: string): Promise<void> {
  const bytes = (await httpClient.get(path, { responseType: 'arraybuffer' })) as unknown as ArrayBuffer

  const file = new File(Paths.cache, fileName)
  // O cache sobrevive entre aberturas: baixar o mesmo documento duas vezes
  // encontraria o arquivo anterior e `create()` falharia.
  if (file.exists) file.delete()
  file.create()
  file.write(new Uint8Array(bytes))

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartilhamento indisponível neste aparelho.')
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: fileName,
  })
}
