import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService {
  constructor(private dataSource: DataSource) {}

  async executeQuery(query: string, parameters?: any[]): Promise<any> {
    return await this.dataSource.query(query, parameters);
  }

  async executeTransaction(queries: { query: string; parameters?: any[] }[]): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const results = [];
      for (const { query, parameters } of queries) {
        const result = await queryRunner.query(query, parameters);
        results.push(result);
      }
      await queryRunner.commitTransaction();
      return results;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}