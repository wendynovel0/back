import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ReplaceUserDto } from './dto/replace-user.dto';
import { User } from './entities/user.entity';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { UsersView } from './entities/users-view.entity';
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private actionLogsService: ActionLogsService,
    @InjectRepository(UsersView) 
    private usersViewRepository: Repository<UsersView>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async createWithAudit(
  createUserDto: CreateUserDto,
  performedBy: number,
  ip?: string,
): Promise<User> {
  const hashedPassword = await bcrypt.hash(createUserDto.password_hash, 10); // 10 es el salt rounds
  createUserDto.password_hash = hashedPassword;

  const user = this.userRepository.create(createUserDto);
  const savedUser = await this.userRepository.save(user);

  await this.actionLogsService.logAction({
    userId: performedBy,
    actionType: 'CREATE',
    entityType: 'user',
    entityId: savedUser.user_id,
    newValue: savedUser,
    ipAddress: ip,
  });

  return savedUser;
}

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOneActive(user_id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { user_id, is_active: true },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async replace(
    id: number,
    replaceUserDto: ReplaceUserDto,
    performedBy: number,
    ip?: string,
  ): Promise<User> {
    const user = await this.findOne(id);
    const oldValue = { ...user };

    if (!replaceUserDto.email || replaceUserDto.email.trim() === '') {
      throw new BadRequestException('El email es obligatorio');
    }

    const updatedData = { ...replaceUserDto };

    // Hasheo
    if (replaceUserDto.password_hash) {
      const saltRounds = 10;
      updatedData.password_hash = await bcrypt.hash(replaceUserDto.password_hash, saltRounds);
    }

    const newUser = this.userRepository.create({
      ...user,
      ...updatedData,
    });

    const replacedUser = await this.userRepository.save(newUser);

    await this.actionLogsService.logAction({
      userId: performedBy,
      actionType: 'UPDATE',
      entityType: 'User',
      entityId: replacedUser.user_id,
      oldValue,
      newValue: replacedUser,
      ipAddress: ip,
    });

    return replacedUser;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    performedBy: number,
    ip?: string,
  ): Promise<User> {
    const user = await this.findOne(id);
    const oldValue = { ...user };

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    await this.actionLogsService.logAction({
      userId: performedBy,
      actionType: 'UPDATE',
      entityType: 'user',
      entityId: updatedUser.user_id,
      oldValue,
      newValue: updatedUser,
      ipAddress: ip,
    });

    return updatedUser;
  }

  async remove(id: number, performedBy: number, ip?: string): Promise<void> {
    const user = await this.findOne(id);

    await this.actionLogsService.logAction({
      userId: performedBy,
      actionType: 'DELETE',
      entityType: 'user',
      entityId: user.user_id,
      oldValue: user,
      ipAddress: ip,
    });

    await this.userRepository.remove(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .where('LOWER(user.email) = LOWER(:email)', { email })
        .addSelect('user.password_hash')
        .getOne();
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  async findAllWithFilters(filters: {
  email?: string;
  createdStartDate?: string;
  createdEndDate?: string;
  updatedStartDate?: string;
  updatedEndDate?: string;
  isActive?: boolean;
}): Promise<UsersView[]> {
  const query = this.usersViewRepository.createQueryBuilder('user');

  if (filters.email) {
    query.andWhere('LOWER(user.email) LIKE LOWER(:email)', { email: `%${filters.email}%` });
  }

  if (filters.createdStartDate && filters.createdEndDate) {
    query.andWhere('user.created_at BETWEEN :start AND :end', {
      start: filters.createdStartDate,
      end: filters.createdEndDate,
    });
  }

  if (filters.updatedStartDate && filters.updatedEndDate) {
    query.andWhere('user.updated_at BETWEEN :startUpdate AND :endUpdate', {
      startUpdate: filters.updatedStartDate,
      endUpdate: filters.updatedEndDate,
    });
  }

  if (typeof filters.isActive === 'boolean') {
    query.andWhere('user.is_active = :isActive', { isActive: filters.isActive });
  }

  return query.getMany();
}

}
