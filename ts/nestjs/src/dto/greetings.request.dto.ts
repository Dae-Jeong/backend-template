import { Transform } from 'class-transformer';
import { IsDefined, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GreetingRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 80 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;
}
