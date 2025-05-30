import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column()
  farmer_activity_status: string;

  @Column()
  farm_name: string;

  @Column()
  farmer_tc_no: string;

  @Column({ nullable: true })
  imgurl: string;

  @Column()
  auth_id: string;
} 