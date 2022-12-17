import { Module } from '@nestjs/common';
import { BotService } from './providers/bot.service';
import { UsersService } from './users/users.service';
import { User } from "./users/entities/user.entity";
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User])
  ],
  providers: [BotService, UsersService],
})
export class AppModule {}
