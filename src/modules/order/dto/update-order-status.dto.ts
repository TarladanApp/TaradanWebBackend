import { IsString, IsIn } from 'class-validator';
 
export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(['onaylandı', 'iptal edildi', 'hazırlandı'])
  status: string;
} 