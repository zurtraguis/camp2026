import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Configuração do OpenNext para Cloudflare Workers.
// Cache incremental (ISR) desabilitado por padrão — o app é majoritariamente
// dinâmico. Para habilitar, adicione um R2 incremental cache aqui e o binding
// NEXT_INC_CACHE_R2_BUCKET no wrangler.jsonc.
export default defineCloudflareConfig();
