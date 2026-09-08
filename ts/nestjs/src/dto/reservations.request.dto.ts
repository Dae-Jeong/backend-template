import {
  IsDefined,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class ReserveRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 64, pattern: '^[A-Za-z0-9._:-]+$' })
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  product_id: string;
}
export class IdempotencyKeyDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  'Idempotency-Key': string;
}
