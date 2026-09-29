import { attachmentDisposition } from './content-disposition';

describe('attachmentDisposition', () => {
  it('nombre ASCII simple', () => {
    expect(attachmentDisposition('demanda.pdf')).toBe(
      `attachment; filename="demanda.pdf"; filename*=UTF-8''demanda.pdf`,
    );
  });

  it('conserva tildes y ñ en filename* y las simplifica en el respaldo', () => {
    expect(attachmentDisposition('Contratación año 2026.pdf')).toBe(
      `attachment; filename="Contratacion ano 2026.pdf"; ` +
        `filename*=UTF-8''Contrataci%C3%B3n%20a%C3%B1o%202026.pdf`,
    );
  });

  it('escapa comillas, barras y caracteres que RFC 5987 no admite', () => {
    const header = attachmentDisposition(`informe "final" (v2)\\*'.pdf`);
    expect(header).toContain(`filename="informe _final_ (v2)_*'.pdf"`);
    expect(header).toContain(`filename*=UTF-8''informe%20%22final%22%20%28v2%29%5C%2A%27.pdf`);
  });

  it('caracteres sin equivalente ASCII usan _ en el respaldo', () => {
    expect(attachmentDisposition('合同.pdf')).toContain(`filename="__.pdf"`);
  });
});
