import { ApiProperty } from '@nestjs/swagger';
export class ReservationDataDto {
  @ApiProperty() reservation_id: string;
  @ApiProperty() product_id: string;
  @ApiProperty({ format: 'date-time' }) created_at: string;
}
export class ReservationResponseDto {
  @ApiProperty({ type: ReservationDataDto }) data: ReservationDataDto;
}
