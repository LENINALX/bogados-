import { BadRequestException } from '@nestjs/common';
import {
  canonicalMimeType,
  contentMatchesExtension,
  documentUploadOptions,
  fixUploadFileName,
  isAllowedUpload,
  isDeclaredMimeCoherent,
  MAX_FILE_NAME_LENGTH,
  MAX_UPLOAD_BYTES,
  sanitizeUploadFileName,
} from './upload.config';

describe('upload.config', () => {
  it('limita tamaño y número de archivos en Multer', () => {
    expect(documentUploadOptions.limits).toEqual(
      expect.objectContaining({ fileSize: MAX_UPLOAD_BYTES, files: 1 }),
    );
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
    documentUploadOptions.fileFilter!({} as never, { originalname: 'x.pdf', mimetype: 'application/pdf' } as never, cb);
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

describe('subida: tipo, contenido y nombre', () => {
  it('limita también los campos de texto del formulario', () => {
    expect(documentUploadOptions.limits).toEqual(expect.objectContaining({ fields: 5, fieldSize: 1024 }));
  });

  it('fileFilter rechaza un .pdf que el navegador declara como HTML', () => {
    const cb = jest.fn();
    documentUploadOptions.fileFilter!({} as never, { originalname: 'x.pdf', mimetype: 'text/html' } as never, cb);
    expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
  });

  it('fileFilter sanea el nombre (ruta y caracteres de control)', () => {
    const file = { originalname: '../../etc/pass\u0000wd.pdf', mimetype: 'application/pdf' };
    const cb = jest.fn();
    documentUploadOptions.fileFilter!({} as never, file as never, cb);
    expect(file.originalname).toBe('passwd.pdf');
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it.each([
    ['contrato.pdf', 'application/pdf'],
    ['contrato.pdf', 'application/octet-stream'],
    ['contrato.pdf', ''],
    ['foto.JPG', 'image/jpeg'],
    ['acta.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['viejo.doc', 'application/msword'],
    ['notas.txt', 'text/plain; charset=utf-8'],
  ])('tipo declarado coherente: %s como «%s»', (name, mime) => {
    expect(isDeclaredMimeCoherent(name, mime)).toBe(true);
  });

  it.each([
    ['contrato.pdf', 'text/html'],
    ['foto.png', 'image/svg+xml'],
    ['notas.txt', 'text/html'],
    ['acta.docx', 'application/x-msdownload'],
    ['foto.jpg', 'application/javascript'],
  ])('tipo declarado incoherente: %s como «%s»', (name, mime) => {
    expect(isDeclaredMimeCoherent(name, mime)).toBe(false);
  });

  it('el tipo guardado sale de la extensión', () => {
    expect(canonicalMimeType('a.PDF')).toBe('application/pdf');
    expect(canonicalMimeType('a.jpeg')).toBe('image/jpeg');
    expect(canonicalMimeType('pagina.html')).toBe('application/octet-stream');
    expect(canonicalMimeType('sin-extension')).toBe('application/octet-stream');
  });

  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0]);
  const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const HTML = Buffer.from('<!doctype html><script>alert(1)</script>');
  const EXE = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);

  it.each([
    ['a.pdf', Buffer.from('%PDF-1.7\n...')],
    ['a.pdf', Buffer.concat([Buffer.from([0x0d, 0x0a]), Buffer.from('%PDF-1.4')])],
    ['a.png', PNG],
    ['a.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    ['a.docx', ZIP],
    ['a.xlsx', ZIP],
    ['a.doc', OLE],
    ['a.doc', Buffer.from(String.raw`{\rtf1\ansi`)],
    ['a.xls', OLE],
    ['a.txt', Buffer.from('Texto con tildes: ñandú')],
  ])('contenido coherente: %s', (name, buf) => {
    expect(contentMatchesExtension(name, buf)).toBe(true);
  });

  it.each([
    ['a.pdf', HTML],
    ['a.png', HTML],
    ['a.jpg', EXE],
    ['a.docx', EXE],
    ['a.doc', HTML],
    ['a.txt', EXE],
    ['a.pdf', Buffer.alloc(0)],
  ])('contenido incoherente: %s', (name, buf) => {
    expect(contentMatchesExtension(name, buf)).toBe(false);
  });
});

describe('sanitizeUploadFileName', () => {
  it.each([
    ['../../etc/passwd.pdf', 'passwd.pdf'],
    [String.raw`C:\fakepath\demanda.pdf`, 'demanda.pdf'],
    ['  acta   final .pdf  ', 'acta final .pdf'],
    ['factura\u202Efdp.exe', 'facturafdp.exe'],
    [`nombre${String.fromCharCode(13, 10)}X-Header: 1.pdf`, 'nombreX-Header_ 1.pdf'],
    ['...pdf', 'pdf'],
    ['que?<raro>|.pdf', 'que__raro__.pdf'],
    ['Contratación año.pdf', 'Contratación año.pdf'],
  ])('%j → %j', (raw, expected) => {
    expect(sanitizeUploadFileName(raw)).toBe(expected);
  });

  it('acorta nombres muy largos conservando la extensión', () => {
    const name = sanitizeUploadFileName(`${'a'.repeat(5000)}.docx`);
    expect(name.length).toBeLessThanOrEqual(MAX_FILE_NAME_LENGTH);
    expect(name.endsWith('.docx')).toBe(true);
  });

  it('devuelve vacío si no queda nada', () => {
    expect(sanitizeUploadFileName('../..//')).toBe('');
    expect(sanitizeUploadFileName('\u0000\u0001')).toBe('');
  });
});
