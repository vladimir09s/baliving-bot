import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    Generated,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ 'name': 'guid' })
    @Generated('uuid')
    guid: string;

    @Column({ 'name': 'chat_id', 'type': 'bigint' })
    chatId: number;

    @Column({ 'name': 'user_id', 'type': 'bigint' })
    userId: number;

    @Column({ 'name': 'email', 'default': null })
    email: string;

    @Column({ 'name': 'current_action', 'default': null })
    currentAction: string;

    @Column({ 'name': 'next_action', 'default': null })
    nextAction: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date;
}
