import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseService } from '../../common/supabase/supabase.service';

const STORAGE_BUCKET = 'data-vault-files';
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
];

@Injectable()
export class FilesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async uploadFile(
    file: Express.Multer.File,
    ownerId: string,
    username: string,
  ): Promise<{ fileId: string; shareToken: string; shareUrl: string }> {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Only images are allowed. Received: ${file.mimetype}`,
      );
    }

    const client = this.supabaseService.getClient();
    const fileId = uuidv4();
    const ext = file.originalname.split('.').pop();
    const storagePath = `${ownerId}/${fileId}.${ext}`;

    // 1. Upload to Supabase storage
    await this.supabaseService.uploadFile(
     storagePath,
     file.buffer,
     file.mimetype,
     file.originalname
    )

    // 2. Save file metadata in files table
    const now = new Date().toISOString();
    await client.from('files').insert({
      id: fileId,
      owner_id: ownerId,
      file_name: file.originalname,
      storage_path: storagePath,
      created_at: now,
    });

    // 3. Create root access node (depth 0 — the uploader)
    const rootNodeId = uuidv4();
    await client.from('access_nodes').insert({
      id: rootNodeId,
      file_id: fileId,
      parent_node_id: null,
      opened_by_user_id: ownerId,
      opened_by_username: username,
      opened_at: now,
      depth: 0,
    });

    // 4. Create initial share link token
    const shareToken = uuidv4();
    await client.from('share_links').insert({
      id: uuidv4(),
      file_id: fileId,
      parent_node_id: rootNodeId,
      token: shareToken,
      created_at: now,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const shareUrl = `${frontendUrl}/share/${shareToken}`;

    return { fileId, shareToken, shareUrl };
  }

  async getUserFiles(ownerId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('files')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch files: ${error.message}`);
    }

    // Attach public URLs and share tokens
    const enriched = await Promise.all(
      data.map(async (file) => {
        const publicUrl = this.supabaseService.getPublicUrl(
          STORAGE_BUCKET,
          file.storage_path,
        );

        const { data: links } = await client
          .from('share_links')
          .select('token')
          .eq('file_id', file.id)
          .order('created_at', { ascending: true })
          .limit(1);

        return {
          ...file,
          publicUrl,
          shareToken: links?.[0]?.token ?? null,
        };
      }),
    );

    return enriched;
  }

  async getFileById(fileId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`File ${fileId} not found`);
    }

    return data;
  }
}
