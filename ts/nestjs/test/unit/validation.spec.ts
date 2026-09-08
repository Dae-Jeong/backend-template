import 'reflect-metadata';
import { Transform } from 'class-transformer';
import { IsDefined, IsString, MaxLength, MinLength } from 'class-validator';
import { inputPipe, InvalidInput } from '../../src/http/validation.js';

class ContactRequestDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(12)
  display_name: string;
}

describe('public input fields', () => {
  const pipe = inputPipe(ContactRequestDto, 'body', ['display_name']);

  it.each([
    [undefined, 'REQUIRED'],
    [null, 'REQUIRED'],
    [42, 'INVALID'],
    [' ', 'TOO_SHORT'],
    ['private-value-too-long', 'TOO_LONG'],
  ])('reports a newly declared field for %j', async (value, code) => {
    await expect(
      pipe.transform({ display_name: value }, { type: 'body' }),
    ).rejects.toMatchObject({
      fields: [{ location: ['body', 'display_name'], code }],
    });
  });

  it('preserves explicit DTO transformation', async () => {
    const result = await pipe.transform(
      { display_name: ' Marin ' },
      { type: 'body' },
    );
    expect(result).toBeInstanceOf(ContactRequestDto);
    expect(result.display_name).toBe('Marin');
  });

  it('hides unknown fields and their values and bounds the error count', async () => {
    const unknown = Object.fromEntries(
      Array.from({ length: 25 }, (_, index) => [
        `private-field-${index}`,
        'private-value',
      ]),
    );
    const result = pipe.transform(
      { display_name: 'Marin', ...unknown },
      { type: 'body' },
    );
    await expect(result).rejects.toBeInstanceOf(InvalidInput);
    await expect(result).rejects.toMatchObject({
      fields: Array.from({ length: 20 }, () => ({
        location: [],
        code: 'INVALID',
      })),
    });
  });

  it('does not expose validated fields unless explicitly public', async () => {
    const privatePipe = inputPipe(ContactRequestDto, 'query', []);
    await expect(
      privatePipe.transform({}, { type: 'query' }),
    ).rejects.toMatchObject({
      fields: [{ location: [], code: 'REQUIRED' }],
    });
  });
});
