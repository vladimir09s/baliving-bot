import { Injectable, OnModuleInit } from '@nestjs/common';
import Handler from "./engine/handler";
import {UsersService} from "../users/users.service";
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const BOT_CHAT_TYPE: string = 'private';

@Injectable()
export class BotService extends Handler implements OnModuleInit {
  private bot: any;

  constructor(usersService: UsersService) {
    super(usersService);
    this.bot = new TelegramBot(process.env.TOKEN, { polling: true });
  }

  onModuleInit() {
    this.botMessage();
    this.botCallback();
  }

  botCallback() {
    this.bot.on('callback_query', function onCallbackQuery(callbackQuery) {
      console.debug(callbackQuery);
    });
  }

  botMessage() {
    this.bot.on('message', (message) => {
      if (message.chat.type === BOT_CHAT_TYPE) {
        this.handle(this.bot, message);
      }
    });
  }
}