import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class FarmerService {
  private supabase;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL ve Key değerleri eksik!');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async createFarmer(farmerData: any) {
    try {
      const { data, error } = await this.supabase
        .from('farmer')
        .insert([farmerData])
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getFarmerById(id: string) {
    try {
      const { data, error } = await this.supabase
        .from('farmer')
        .select('*')
        .eq('farmer_id', id)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateFarmer(id: string, farmerData: any) {
    try {
      const { data, error } = await this.supabase
        .from('farmer')
        .update(farmerData)
        .eq('farmer_id', id)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteFarmer(id: string) {
    try {
      const { error } = await this.supabase
        .from('farmer')
        .delete()
        .eq('farmer_id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
} 