import { Injectable, OnModuleInit } from '@nestjs/common';
import Handler from "./engine/handler";
import {UsersService} from "../users/users.service";
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const BOT_CHAT_TYPE: string = 'private';

@Injectable()
export class BotService extends Handler implements OnModuleInit {

  constructor(usersService: UsersService) {
    const bot = new TelegramBot(process.env.TOKEN, { polling: true });
    super(usersService, bot);
  }

  onModuleInit() {
    this.botMessage();
    this.botCallback();
  }

  botCallback() {
    const _this = this;
    this.bot.on('callback_query', function onCallbackQuery(callbackQuery) {
      _this.handleCallback(
          callbackQuery.message.chat.id,
          callbackQuery.from.id,
          callbackQuery.message.message_id,
          callbackQuery.data,
          callbackQuery.message.reply_markup.inline_keyboard,
      );
    });
  }

  botMessage() {
    this.bot.on('message', (message) => {
      if (message.chat.type === BOT_CHAT_TYPE) {
        this.handle(message);
      }
    });
  }
}