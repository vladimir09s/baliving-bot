import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    Generated,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'requests' })
export class Request {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ 'name': 'guid' })
    @Generated('uuid')
    guid: string;

    @Column({ 'name': 'user_id', 'type': 'bigint' })
    userId: number;

    @Column({ 'name': 'areas', 'type': 'simple-array', 'default': null })
    areas: string;

    @Column({ 'name': 'beds', 'type': 'simple-array', 'default': null })
    beds: string;

    @Column({ 'name': 'price', 'default': null })
    price: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date;
}
