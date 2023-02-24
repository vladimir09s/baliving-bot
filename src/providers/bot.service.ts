import { Injectable, OnModuleInit } from '@nestjs/common';
import Handler from "./engine/handler";
import {UsersService} from "../users/users.service";
import {RequestsService} from "../requests/requests.service";
import { FetchService } from 'nestjs-fetch';
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const BOT_CHAT_TYPE: string = 'private';

@Injectable()
export class BotService extends Handler implements OnModuleInit {

  constructor(
      usersService: UsersService,
      requestsService: RequestsService,
      fetch: FetchService
  ) {
    const bot = new TelegramBot(process.env.TOKEN, { polling: true });
    super(usersService, requestsService, bot, fetch);
  }

  onModuleInit() {
    this.botMessage();
    this.botCallback();
  }

  botCallback() {
    const _this = this;
    this.bot.on('callback_query', function onCallbackQuery(callbackQuery) {
      try {
        _this.handleCallback(
            callbackQuery.message.chat.id,
            callbackQuery.from.id,
            callbackQuery.message.message_id,
            callbackQuery.data,
            callbackQuery.message.reply_markup.inline_keyboard,
        );
      } catch (exception) {
        console.error(exception);
      }
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