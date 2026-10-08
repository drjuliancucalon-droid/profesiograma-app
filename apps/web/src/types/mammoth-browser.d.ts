// mammoth publica tipos para su entrada de Node pero no para el bundle de navegador
// (`mammoth/mammoth.browser`), que es el que se carga en la app.
declare module 'mammoth/mammoth.browser' {
  interface ConvertResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>;
}
