/**
 * Stub de `server-only` para os testes de integração.
 *
 * O pacote real lança "This module cannot be imported from a Client Component"
 * quando carregado fora do bundler do Next — inclusive no vitest. Ele é uma
 * GUARDA DE BUILD (impede que um serviço de servidor vaze para o cliente), não
 * uma dependência de runtime: no teste, importar o serviço direto é o objetivo.
 *
 * A guarda continua valendo no build de produção, que usa o pacote de verdade.
 */
export {};
