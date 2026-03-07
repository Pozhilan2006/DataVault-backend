import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient;

  onModuleInit() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined in environment variables',
      );
    }

    this.client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  // ─── Database helpers ────────────────────────────────────────────────────────

  async insertOne(table: string, data: Record<string, any>) {
    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async findOne(table: string, match: Record<string, any>) {
    const query = this.client.from(table).select('*');
    for (const [key, value] of Object.entries(match)) {
      query.eq(key, value);
    }
    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  }

  async findMany(table: string, match: Record<string, any>) {
    const query = this.client.from(table).select('*');
    for (const [key, value] of Object.entries(match)) {
      query.eq(key, value);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // ─── Storage helpers ─────────────────────────────────────────────────────────

  async uploadFile(
    bucket: string,
    path: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) throw error;

    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
