import { ApiProperty } from '@nestjs/swagger';
export class GreetingDataDto {
  @ApiProperty() message: string;
  @ApiProperty({ format: 'date-time' }) generated_at: string;
}
export class GreetingResponseDto {
  @ApiProperty({ type: GreetingDataDto }) data: GreetingDataDto;
}
export class MessageDataDto {
  @ApiProperty() message: string;
}
export class MessageResponseDto {
  @ApiProperty({ type: MessageDataDto }) data: MessageDataDto;
}
