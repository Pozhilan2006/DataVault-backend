import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService {

  private client: SupabaseClient
  private bucket: string

  constructor(private configService: ConfigService) {

    const url = this.configService.get<string>('SUPABASE_URL')
    // Fallback to the original SUPABASE_SERVICE_KEY just in case
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || this.configService.get<string>('SUPABASE_SERVICE_KEY')

    // Fallback to the originally requested bucket name
    this.bucket = this.configService.get<string>('SUPABASE_BUCKET') || 'data-vault-files'

    if (!url || !key) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) must be defined in environment variables',
      );
    }

    this.client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  getClient(): SupabaseClient {
    return this.client
  }

  async uploadFile(
    path: string,
    file: Buffer,
    mimetype: string,
    filename: string
  ) {

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(path, file, {
        contentType: mimetype,
        upsert: false
      })

    if (error) throw error

    return data
  }

  getPublicUrl(bucket: string, path: string) {

    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }
}