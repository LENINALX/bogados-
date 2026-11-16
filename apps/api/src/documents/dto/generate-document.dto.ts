import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const LEGAL_DOCUMENT_TEMPLATES = [
  'demanda',
  'contestacion',
  'impulso',
  'poder',
] as const;

export type LegalDocumentTemplate = (typeof LEGAL_DOCUMENT_TEMPLATES)[number];

export class GenerateDocumentDto {
  @IsIn(LEGAL_DOCUMENT_TEMPLATES)
  template!: LegalDocumentTemplate;

  @IsIn(['docx', 'pdf'])
  format!: 'docx' | 'pdf';

  @IsString()
  @Matches(/\S/)
  @MaxLength(200)
  court!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  opposingParty?: string;
}