/**
 * Espelha o que `next/core-web-vitals` entrega, sem passar por ele.
 *
 * `eslint-config-next` declara `parser: './parser.js'`, que carrega o parser
 * babel de dentro do `next`. O yarn hoista o `eslint-config-next` para a raiz
 * mas **não** o `next` — o app mobile fixa React 19 e os dois Next fixam React
 * 18, então eles ficam aninhados por workspace. O require do parser, feito da
 * raiz, não acha o `next`, e o `next lint` morria antes de ler uma linha de
 * código. Como o preset já usava `@typescript-eslint/parser` para `.ts(x)` e
 * aqui é tudo TypeScript, declará-lo direto é equivalente na prática.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: { browser: true, node: true },
  plugins: ['@next/next', 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@next/next/core-web-vitals',
  ],
  settings: { react: { version: 'detect' } },
  rules: {
    // As mesmas desativações do preset.
    'react/no-unknown-property': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/jsx-no-target-blank': 'off',
    // O mesmo recorte de jsx-a11y que o preset liga.
    'jsx-a11y/alt-text': ['warn', { elements: ['img'], img: ['Image'] }],
    'jsx-a11y/aria-props': 'warn',
    'jsx-a11y/aria-proptypes': 'warn',
    'jsx-a11y/aria-unsupported-elements': 'warn',
    'jsx-a11y/role-has-required-aria-props': 'warn',
    'jsx-a11y/role-supports-aria-props': 'warn',
    /**
     * Desligada de propósito, e esta é a única divergência do preset.
     *
     * As imagens que restam são logo de clínica e avatar de usuário, servidos
     * pelo backend a partir de bucket privado com URL assinada e de duração
     * limitada: passá-las pelo otimizador do `next/image` o faria cachear uma
     * URL que expira. E `next/image` exige `width`/`height` ou um pai
     * posicionado, enquanto o logo é enviado pela clínica com proporção que
     * não conhecemos — hoje ele se ajusta por `object-contain`.
     */
    '@next/next/no-img-element': 'off',
  },
  ignorePatterns: ['node_modules/', '.next/', 'out/', 'coverage/'],
}
