/**
 * O que vai no `FormData` de um upload.
 *
 * Na web é um `File` do navegador; no celular, o `{ uri, name, type }` que o
 * `FormData` do React Native entende. Os dois são valores válidos de
 * `FormData.append` e nenhum existe no outro ambiente — por isso o tipo é a
 * união, e não `File`, que deixava o app de fora.
 *
 * Vive fora de `features/*` porque dois recursos o usam — foto da consulta e
 * resultado de exame —, e um importar o service do outro atravessaria a
 * fronteira entre eles.
 */
export type UploadFile = File | { uri: string; name: string; type: string }
