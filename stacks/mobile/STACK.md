# Stack: mobile (beta)

App nativo via React Native + Expo. Foco em iOS + Android com TypeScript.

## Decisões padrão

- **Runtime:** Expo SDK 53+ (managed workflow para começar).
- **Linguagem:** TypeScript strict.
- **Navigation:** Expo Router.
- **Estado:** TanStack Query + Zustand (nativos para mobile).
- **Estilo:** Nativewind (Tailwind no RN) ou StyleSheet API.

## Pré-condições para `/init-stack mobile`

- `docs/00_VALIDATION.md` preenchido.
- Cópia inicializada.
- Node 20+, Bun ou pnpm para velocidade de instalação.
- (Opcional) Xcode + Android Studio para builds nativos.

## Arquivos copiados de `stacks/mobile/scaffold/` para a raiz

- `app.json` (Expo config)
- `app/index.tsx` (Expo Router root)
- `app/_layout.tsx`
- `metro.config.js`
- `tsconfig.json` (override RN)
- `babel.config.js`

## Comandos perigosos (bloqueados quando HARNESS_STACK=mobile)

- `expo install --fix` em produção sem revisão (pode quebrar bibliotecas pinadas).
- `eas build --platform all --auto-submit` sem `ALLOW_DESTRUCTIVE=1` e Release Readiness GO.
- `rm -rf ios/ android/` sem `ALLOW_DESTRUCTIVE=1`.

## Skills priorizadas

- `react-native-architecture`
- `react-native-design`
- `mobile-android-design`
- `mobile-ios-design`
- `responsive-design`
- `accessibility-compliance`

## Limitações conhecidas

- Lighthouse CI não se aplica → gate de performance é `react-native-performance` (manual).
- Web Excellence skills não se aplicam diretamente; consulte `react-native-architecture`.
