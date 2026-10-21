import * as Sharing from 'expo-sharing'
import MockAdapter from 'axios-mock-adapter'
import { httpClient } from './api-client'
import { downloadAndShareDocument } from './document-download'

// O prefixo `mock` é exigência do jest: o factory é içado para antes das
// declarações e só variáveis assim nomeadas são visíveis lá dentro.
const mockWritten: { name: string; bytes: Uint8Array | null; deleted: boolean }[] = []
const mockExisting = new Set<string>()

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class {
    exists: boolean
    uri: string
    constructor(_directory: unknown, fileName: string) {
      this.uri = `file:///cache/${fileName}`
      this.exists = mockExisting.has(fileName)
      mockWritten.push({ name: fileName, bytes: null, deleted: false })
    }
    delete() {
      mockWritten[mockWritten.length - 1]!.deleted = true
    }
    create() {}
    write(bytes: Uint8Array) {
      mockWritten[mockWritten.length - 1]!.bytes = bytes
    }
  },
}))

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}))

let mock: MockAdapter

beforeEach(() => {
  jest.clearAllMocks()
  mockExisting.clear()
  mockWritten.length = 0
  mock = new MockAdapter(httpClient)
})

afterEach(() => mock.restore())

describe('downloadAndShareDocument', () => {
  it('pede o arquivo como binário, grava no cache e compartilha', async () => {
    mock.onGet('/prescriptions/rx-1/pdf').reply((config) => {
      expect(config.responseType).toBe('arraybuffer')
      return [200, new Uint8Array([37, 80, 68, 70]).buffer]
    })

    await downloadAndShareDocument('/prescriptions/rx-1/pdf', 'receita-rx-1.pdf')

    expect(mockWritten[0]?.name).toBe('receita-rx-1.pdf')
    expect(mockWritten[0]?.bytes).toEqual(new Uint8Array([37, 80, 68, 70]))
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'file:///cache/receita-rx-1.pdf',
      expect.objectContaining({ mimeType: 'application/pdf', UTI: 'com.adobe.pdf' }),
    )
  })

  /**
   * O anexo de resultado de exame pode ser imagem, e o `UTI` é o tipo no
   * vocabulário do iOS: anunciar `com.adobe.pdf` para um JPEG faria o
   * sistema oferecer o aplicativo errado para abrir.
   */
  it('o anexo de imagem vai com o próprio tipo, e sem UTI de PDF', async () => {
    mock.onGet('/exam-results/res-1/file').reply(200, new Uint8Array([255, 216]).buffer)

    await downloadAndShareDocument('/exam-results/res-1/file', 'laudo.jpg', 'image/jpeg')

    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'file:///cache/laudo.jpg',
      expect.objectContaining({ mimeType: 'image/jpeg', UTI: undefined }),
    )
  })

  // O cache sobrevive entre aberturas: sem apagar, o segundo download do
  // mesmo documento encontraria o arquivo e `create()` falharia.
  it('apaga o arquivo anterior antes de gravar', async () => {
    mockExisting.add('receita-rx-1.pdf')
    mock.onGet('/prescriptions/rx-1/pdf').reply(200, new Uint8Array([1]).buffer)

    await downloadAndShareDocument('/prescriptions/rx-1/pdf', 'receita-rx-1.pdf')

    expect(mockWritten[0]?.deleted).toBe(true)
  })

  it('avisa quando o aparelho não sabe compartilhar', async () => {
    ;(Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false)
    mock.onGet('/x/pdf').reply(200, new Uint8Array([1]).buffer)

    await expect(downloadAndShareDocument('/x/pdf', 'x.pdf')).rejects.toThrow(
      'Compartilhamento indisponível',
    )
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
  })

  it('propaga a falha da requisição', async () => {
    mock.onGet('/x/pdf').reply(500)

    await expect(downloadAndShareDocument('/x/pdf', 'x.pdf')).rejects.toBeDefined()
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
  })
})
