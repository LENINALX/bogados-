import { BadRequestException } from '@nestjs/common';
import {
  documentUploadOptions,
  fixUploadFileName,
  isAllowedUpload,
  MAX_UPLOAD_BYTES,
} from './upload.config';

describe('upload.config', () => {
  it('limita tamaño y número de archivos en Multer', () => {
    expect(documentUploadOptions.limits).toEqual({ fileSize: MAX_UPLOAD_BYTES, files: 1 });
  });

  it.each(['demanda.pdf', 'CONTRATO.DOCX', 'foto.JPeG', 'notas.txt'])('acepta %s', (name) => {
    expect(isAllowedUpload(name)).toBe(true);
  });

  it.each(['script.exe', 'pagina.html', 'imagen.svg', 'sin-extension', 'doble.pdf.exe'])(
    'rechaza %s',
    (name) => {
      expect(isAllowedUpload(name)).toBe(false);
    },
  );

  it('fileFilter rechaza con BadRequestException', () => {
    const cb = jest.fn();
    documentUploadOptions.fileFilter!({} as never, { originalname: 'x.exe' } as never, cb);
    expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
  });

  it('fileFilter acepta extensiones permitidas', () => {
    const cb = jest.fn();
    documentUploadOptions.fileFilter!({} as never, { originalname: 'x.pdf' } as never, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('fileFilter corrige el nombre UTF-8 que Busboy decodificó como latin1', () => {
    const file = { originalname: Buffer.from('Contratación año.pdf', 'utf8').toString('latin1') };
    expect(file.originalname).toBe('ContrataciÃ³n aÃ±o.pdf'); // lo que entrega Busboy
    documentUploadOptions.fileFilter!({} as never, file as never, jest.fn());
    expect(file.originalname).toBe('Contratación año.pdf');
  });
});

describe('fixUploadFileName', () => {
  const asBusboy = (s: string) => Buffer.from(s, 'utf8').toString('latin1');

  it.each(['Contratación año.pdf', 'Señor Muñoz – acta.docx', '合同.pdf', 'résumé€.txt'])(
    'recupera "%s" enviado en UTF-8',
    (name) => {
      expect(fixUploadFileName(asBusboy(name))).toBe(name);
    },
  );

  it('deja igual los nombres ASCII', () => {
    expect(fixUploadFileName('demanda-2026.pdf')).toBe('demanda-2026.pdf');
  });

  it('deja igual un nombre ya decodificado bien (filename* en UTF-8)', () => {
    expect(fixUploadFileName('合同 año.pdf')).toBe('合同 año.pdf');
  });

  it('deja igual un nombre latin1 legítimo que no es UTF-8 válido', () => {
    // "ó" suelto (0xF3) no forma una secuencia UTF-8 válida
    expect(fixUploadFileName('Contratación.pdf')).toBe('Contratación.pdf');
  });
});
