import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async register(dto: RegisterDto): Promise<{ token: string }> {
    const client = this.supabaseService.getClient();

    // Check if email already exists
    const { data: existing } = await client
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const userId = uuidv4();

    const { data: newUser, error } = await client
      .from('users')
      .insert({
        id: userId,
        email: dto.email,
        username: dto.username,
        password_hash: passwordHash,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to register user: ${error.message}`);
    }

    const token = this.signToken(newUser);
    return { token };
  }

  async login(dto: LoginDto): Promise<{ token: string }> {
    const client = this.supabaseService.getClient();

    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('email', dto.email)
      .maybeSingle();

    if (error || !user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.signToken(user);
    return { token };
  }

  private signToken(user: { id: string; email: string; username: string }): string {
    const secret = process.env.JWT_SECRET || 'supersecret';
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
      },
      secret,
      { expiresIn: '7d' },
    );
  }
}
