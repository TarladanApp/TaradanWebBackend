import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { FarmerActivityStatus } from '../enums/farmer-activity-status.enum';
import { FarmerStoreActivity } from '../enums/farmer-store-activity.enum';

@Entity('farmer')
export class Farmer {
  @PrimaryGeneratedColumn('uuid')
  farmer_id: string;

  @Column()
  farmer_name: string;

  @Column()
  farmer_last_name: string;

  @Column()
  farmer_age: number;

  @Column()
  farmer_address: string;

  @Column()
  farmer_city: string;

  @Column()
  farmer_town: string;

  @Column()
  farmer_neighbourhood: string;

  @Column()
  farmer_phone_number: string;

  @Column()
  farmer_mail: string;

  @Column()
  farmer_password: string;

  @Column({
    name: 'farmer_activity_status',
    type: 'enum',
    enum: FarmerActivityStatus,
    default: FarmerActivityStatus.Active
  })
  farmer_activity_status: FarmerActivityStatus;

  @Column({
    name: 'farmer_store_activity',
    type: 'enum',
    enum: FarmerStoreActivity,
    default: FarmerStoreActivity.Active
  })
  farmer_store_activity: FarmerStoreActivity;

  @Column()
  farm_name: string;

  @Column()
  farmer_tc_no: string;

  @Column({ 
    name: 'imgurl',
    nullable: true 
  })
  imgurl: string;

  @Column()
  auth_id: string;
} 