import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FieldErrorDto {
  @ApiProperty({ type: [String] }) location: string[];
  @ApiProperty({ enum: ['REQUIRED', 'TOO_SHORT', 'TOO_LONG', 'INVALID'] })
  code: string;
}
export class ProblemDto {
  @ApiProperty({ enum: ['about:blank'] }) type: string;
  @ApiProperty() title: string;
  @ApiProperty({ minimum: 400, maximum: 599 }) status: number;
  @ApiProperty({
    enum: [
      'INVALID_INPUT',
      'NOT_FOUND',
      'METHOD_NOT_ALLOWED',
      'HTTP_ERROR',
      'INTERNAL_ERROR',
      'PRODUCT_NOT_FOUND',
      'SOLD_OUT',
      'IDEMPOTENCY_CONFLICT',
      'DATABASE_BUSY',
      'DATABASE_POOL_TIMEOUT',
    ],
  })
  code: string;
  @ApiProperty() request_id: string;
  @ApiPropertyOptional({ type: [FieldErrorDto] }) errors?: FieldErrorDto[];
}
