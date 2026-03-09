import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseService } from '../../common/supabase/supabase.service';

const STORAGE_BUCKET = 'data-vault-files';

@Injectable()
export class ShareService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async openShareLink(
    token: string,
    userId: string,
    username: string,
  ): Promise<{ fileUrl: string; newShareToken: string }> {
    const client = this.supabaseService.getClient();

    // 1. Validate token from share_links table
    const { data: shareLink, error: linkError } = await client
      .from('share_links')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (linkError || !shareLink) {
      throw new NotFoundException('Share link not found or has been revoked');
    }

    // 2. Fetch associated file
    const { data: file, error: fileError } = await client
      .from('files')
      .select('*')
      .eq('id', shareLink.file_id)
      .single();

    if (fileError || !file) {
      throw new NotFoundException('File associated with this share link not found');
    }

    // 3. Calculate depth from parent node
    let depth = 1;
    if (shareLink.parent_node_id) {
      const { data: parentNode } = await client
        .from('access_nodes')
        .select('depth')
        .eq('id', shareLink.parent_node_id)
        .maybeSingle();

      if (parentNode) {
        depth = (parentNode.depth ?? 0) + 1;
      }
    }

    // 4. Create new access_nodes record
    const newNodeId = uuidv4();
    const now = new Date().toISOString();

    await client.from('access_nodes').insert({
      id: newNodeId,
      file_id: shareLink.file_id,
      parent_node_id: shareLink.parent_node_id,
      opened_by_user_id: userId,
      opened_by_username: username,
      opened_at: now,
      depth,
    });

    // 5. Create a new share link for this viewer (so they can reshare)
    const newShareToken = uuidv4();
    await client.from('share_links').insert({
      id: uuidv4(),
      file_id: shareLink.file_id,
      parent_node_id: newNodeId,
      token: newShareToken,
      created_at: now,
    });

    // 6. Return public URL of the image
    const fileUrl = this.supabaseService.getPublicUrl(
      STORAGE_BUCKET,
      file.storage_path,
    );

    return { fileUrl, newShareToken };
  }
}
