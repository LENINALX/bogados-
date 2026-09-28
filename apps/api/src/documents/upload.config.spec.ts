import { BadRequestException } from '@nestjs/common';
import { documentUploadOptions, isAllowedUpload, MAX_UPLOAD_BYTES } from './upload.config';

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
});
