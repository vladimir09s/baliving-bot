import { Injectable, OnModuleInit } from '@nestjs/common';
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const BOT_CHAT_TYPE: string = 'private';
const START_COMMAND: string = '/start';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: any;

  constructor() {
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
        if (message.text.toString() === START_COMMAND) {
          this.bot.sendMessage(
            message.chat.id,
            "Hello my dear! What's going on?",
          );
        }
      }
    });
  }
}